import { DEFAULT_LOCATION_ID } from '@/constants/location';
// hooks/schedule-store.ts
import { useMemo } from "react";
import { create } from "zustand";
import type {
  Staff,
  Participant,
  Chore,
  ChecklistItem,
  TimeSlot,
} from "@/constants/data";
import { TIME_SLOTS } from "@/constants/data";
import { fetchScheduleForHouseAndDate, type ScheduleRecord } from "@/lib/saveSchedule";
import { fetchOutingsForDate, saveOutingsForDate } from "@/lib/outings";
import { getSydneyDateKey, getSydneyMinutesSinceMidnight } from "@/lib/sydneyDate";
import { supabase } from "@/lib/supabase";

export type ID = string;

export type OutingGroup = {
  id: string;
  name: string;
  staffIds: ID[];
  participantIds: ID[];
  driverId?: ID;
  linkedOutingId?: ID;
  startTime?: string; // e.g. '11:00'
  endTime?: string; // e.g. '15:00'
  notes?: string;
};

export type FloatingRoomAssignment = {
  frontRoom: ID | null;
  scotty: ID | null;
  twins: ID | null;
};

// Current data is stored by timeslot; the direct room shape is retained for
// compatibility with older snapshots.
export type FloatingAssignments =
  | FloatingRoomAssignment
  | Record<ID, FloatingRoomAssignment>;

export type CleaningAssignments = Record<ID, ID | null>;

export type DropoffAssignment = {
  staffId: ID | null;
  locationId: number | null;
};

export type FinalChecklist = Record<ID, boolean>;

export type ScheduleSnapshot = {
  // Base lists
  staff: Staff[];
  participants: Participant[];

  // Who is working + who is attending
  workingStaff: ID[];
  attendingParticipants: ID[];

  // Staff explicitly marked as "training today" (no own assignments)
  trainingStaffToday: ID[];

  // Supports the current staff -> participant[] shape and older participant -> staff shape.
  assignments: Record<ID, ID[] | ID | null>;

  // Floating staff by room
  floatingAssignments: FloatingAssignments;

  // Cleaning / chores
  cleaningAssignments: CleaningAssignments;

  // Special bins variant for "Take the bins out" task
  // 0 = default, 1 = red + yellow, 2 = red + green, 3 = bring in & clean
  cleaningBinsVariant?: 0 | 1 | 2 | 3;

  pickupParticipants?: ID[];

  // Helper staff (one or more staff helping with pickups/dropoffs)
  helperStaff: ID[];
  helperPickupStaff?: ID[];

  // Dropoffs (participant → staff + location)
  dropoffAssignments: Record<ID, DropoffAssignment | null>;

  // Locations still stored separately (for now)
  dropoffLocations: Record<ID, number | null>;

  // End of shift checklist state.
  // finalChecklist is itemId -> checked.
  // finalChecklistStaff is the staff member selected as last to leave.
  finalChecklist: FinalChecklist;
  finalChecklistStaff: ID | null;

  // Primary outings model. The UI supports two main outings plus optional safety transport.
  outingGroups: OutingGroup[];

  // Backwards compatibility for older saved schedules and any screens not yet refactored.
  // New code should use outingGroups.
  outingGroup?: OutingGroup | null;

  // Outings are operational/day-only data and can be reset independently of
  // the daily schedule. Auto reset runs at 5:00pm local time.
  outingAutoResetEnabled?: boolean;
  outingLastAutoResetDate?: string;

  // Schedule date as YYYY-MM-DD (local calendar date)
  date?: string;

  // Misc metadata
  meta?: Record<string, any> & {
    from?: "create-wizard" | "prefill";
  };
};

export type ScheduleBannerType = "created" | "loaded" | "missing";
export type TodayScheduleStatus = "idle" | "loading" | "ready" | "missing" | "error";

export type ScheduleBanner = {
  type: ScheduleBannerType;
  scheduleDate: string; // YYYY-MM-DD for the schedule being edit
  // when prefilling from an older schedule, we store the original date too
  sourceDate?: string;
};

export type ScheduleState = ScheduleSnapshot & {
  // Master data (Supabase)
  chores: Chore[];
  checklistItems: ChecklistItem[];
  timeSlots: TimeSlot[];
  masterDataLoaded: boolean;
  masterDataLoading: boolean;
  loadMasterData: (options?: { force?: boolean }) => Promise<void>;

  scheduleStep: number;
  selectedDate?: string;

  banner: ScheduleBanner | null;
  hasInitialisedToday: boolean;
  currentInitDate?: string;

  activeScheduleId: string | null;
  activeScheduleHouse: string | null;
  activeScheduleDate: string | null;
  activeScheduleUpdatedAt: string | null;
  todayScheduleStatus: TodayScheduleStatus;
  scheduleLoadError: string | null;

  // prior snapshots for cleaning fairness
  recentCleaningSnapshots: ScheduleSnapshot[];

  // core actions
  createSchedule: (snapshot: ScheduleSnapshot) => Promise<void> | void;
  patchSchedule: (patch: Partial<ScheduleSnapshot>) => void;
  updateSchedule: (patch: Partial<ScheduleSnapshot>) => void;

  // outing helpers
  resetOutings: (options?: { persist?: boolean; reason?: "manual" | "auto" }) => Promise<void>;
  maybeAutoResetOutings: (now?: Date) => Promise<boolean>;
  setOutingAutoResetEnabled: (enabled: boolean) => void;

  // wizard helpers
  setScheduleStep: (step: number) => void;
  setSelectedDate: (date?: string) => void;

  setBanner: (banner: ScheduleBanner | null) => void;
  markInitialisedForDate: (date: string) => void;
  setActiveScheduleRecord: (record: ScheduleRecord | null) => void;

  setRecentCleaningSnapshots: (snaps: ScheduleSnapshot[]) => void;

  touch: () => void;
};

// ----------------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------------

const DEFAULT_HOUSE_ID = DEFAULT_LOCATION_ID;
const OUTING_AUTO_RESET_MINUTES = 17 * 60;

function minutesSinceMidnight(date = new Date()): number {
  return getSydneyMinutesSinceMidnight(date);
}

function makeInitialSnapshot(): ScheduleSnapshot {
  return {
    staff: [],
    participants: [],
    workingStaff: [],
    attendingParticipants: [],
    trainingStaffToday: [],
    assignments: {},
    floatingAssignments: {
      frontRoom: null,
      scotty: null,
      twins: null,
    },
    cleaningAssignments: {},
    cleaningBinsVariant: 0,
    helperStaff: [],
    dropoffAssignments: {},
    dropoffLocations: {},
    finalChecklist: {},
    finalChecklistStaff: null,
    outingGroups: [],
    outingGroup: null,
    outingAutoResetEnabled: true,
    outingLastAutoResetDate: undefined,
    date: undefined,
    meta: undefined,
  };
}

function isOutingMeaningful(
  outing: OutingGroup | null | undefined,
): outing is OutingGroup {
  if (!outing) return false;
  return Boolean(
    (outing.name || "").trim() ||
    (outing.startTime || "").trim() ||
    (outing.endTime || "").trim() ||
    (outing.notes || "").trim() ||
    (outing.driverId || "").trim() ||
    (outing.linkedOutingId || "").trim() ||
    (outing.staffIds?.length ?? 0) > 0 ||
    (outing.participantIds?.length ?? 0) > 0,
  );
}

function normalizeOutingGroup(value: any, fallbackId: string): OutingGroup {
  return {
    id: String(value?.id || fallbackId),
    name: String(value?.name || ""),
    staffIds: Array.isArray(value?.staffIds) ? value.staffIds.map(String) : [],
    participantIds: Array.isArray(value?.participantIds)
      ? value.participantIds.map(String)
      : [],
    startTime: value?.startTime ? String(value.startTime) : "",
    endTime: value?.endTime ? String(value.endTime) : "",
    driverId: value?.driverId ? String(value.driverId) : "",
    linkedOutingId: value?.linkedOutingId ? String(value.linkedOutingId) : "",
    notes: value?.notes ? String(value.notes) : "",
  };
}

function normalizeOutingGroupsFromSnapshot(snapshot: any): OutingGroup[] {
  const rawGroups = Array.isArray(snapshot?.outingGroups)
    ? snapshot.outingGroups
    : snapshot?.outingGroup
      ? [snapshot.outingGroup]
      : [];

  return rawGroups
    .slice(0, 3)
    .map((outing: any, index: number) =>
      normalizeOutingGroup(outing, `outing-${index + 1}`),
    )
    .filter(isOutingMeaningful);
}

function normaliseSupabaseColour(value: any): string | undefined {
  const colour = String(value ?? "").trim();
  if (!colour) return undefined;

  const lower = colour.toLowerCase();
  if (lower === "blue") return "#60a5fa";
  if (lower === "pink") return "#f973b7";

  return colour;
}

function mapStaffRow(r: any): Staff {
  return {
    ...(r as any),
    id: String(r.id),
    name: r.name,
    phone: r.phone ?? undefined,
    color: normaliseSupabaseColour(r.color),
    gender: r.gender ?? undefined,
    isTeamLeader: r.is_team_leader ?? r.isTeamLeader ?? false,
  } as Staff;
}

function mapParticipantRow(r: any): Participant {
  const legacyRaw =
    (r as any).legacy_id ??
    (r as any).legacyId ??
    (r as any).legacy ??
    null;
  const legacy =
    legacyRaw === null || legacyRaw === undefined || legacyRaw === ""
      ? null
      : Number(legacyRaw);
  const scheduleId =
    legacy !== null && !Number.isNaN(legacy) ? String(legacy) : String(r.id);

  return {
    ...(r as any),
    id: scheduleId, // used in schedules/attending/outing etc.
    dbId: String(r.id), // Supabase UUID PK
    legacyId: legacy !== null && !Number.isNaN(legacy) ? legacy : undefined,
    name: r.name,
    color: normaliseSupabaseColour(r.color),
  } as Participant;
}

function isPlainRecord(value: any): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildParticipantIdMap(participants: any[]): Map<string, string> {
  const map = new Map<string, string>();

  (participants || []).forEach((p: any) => {
    const scheduleId = String(p?.id ?? "");
    if (!scheduleId) return;

    map.set(scheduleId, scheduleId);

    const possibleIds = [
      p?.dbId,
      p?.db_id,
      p?.legacyId,
      p?.legacy_id,
      p?.legacy,
    ];

    possibleIds.forEach((value) => {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        map.set(String(value), scheduleId);
      }
    });
  });

  return map;
}

function mapParticipantId(value: any, idMap: Map<string, string>): string {
  const key = String(value ?? "");
  return idMap.get(key) ?? key;
}

function mapParticipantIdArray(value: any, idMap: Map<string, string>): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((id) => mapParticipantId(id, idMap));
}

function remapParticipantKeyedRecord<T = any>(
  rec: Record<string, T> | null | undefined,
  idMap: Map<string, string>,
): Record<string, T> {
  const out: Record<string, T> = {};
  Object.entries(rec || {}).forEach(([key, value]) => {
    out[mapParticipantId(key, idMap)] = value as T;
  });
  return out;
}

function remapAssignmentsRecord(assignments: any, idMap: Map<string, string>): any {
  if (!isPlainRecord(assignments)) return {};

  const out: Record<string, any> = {};

  Object.entries(assignments).forEach(([key, value]) => {
    // Current saved shape is staffId -> participantId[]. Keep the staff key,
    // but remap any participant IDs inside the array.
    if (Array.isArray(value)) {
      out[key] = mapParticipantIdArray(value, idMap);
      return;
    }

    // Older/fallback shape may be participantId -> staffId|null.
    out[mapParticipantId(key, idMap)] = value;
  });

  return out;
}

function applyLiveMasterDataToSnapshot<T extends Partial<ScheduleSnapshot>>(
  snapshot: T,
  liveStaff: Staff[],
  liveParticipants: Participant[],
): T {
  const masterStaff =
    Array.isArray(liveStaff) && liveStaff.length
      ? liveStaff
      : (((snapshot as any).staff || []) as Staff[]);
  const masterParticipants =
    Array.isArray(liveParticipants) && liveParticipants.length
      ? liveParticipants
      : (((snapshot as any).participants || []) as Participant[]);

  const idMap = buildParticipantIdMap(masterParticipants as any[]);
  const normalisedOutingGroups = normalizeOutingGroupsFromSnapshot(snapshot).map(
    (outing) => ({
      ...outing,
      participantIds: mapParticipantIdArray(outing.participantIds, idMap),
    }),
  );

  const next: any = {
    ...(snapshot as any),
    staff: masterStaff,
    participants: masterParticipants,
    attendingParticipants: mapParticipantIdArray(
      (snapshot as any).attendingParticipants,
      idMap,
    ),
    assignments: remapAssignmentsRecord((snapshot as any).assignments, idMap),
    dropoffAssignments: remapParticipantKeyedRecord(
      (snapshot as any).dropoffAssignments as any,
      idMap,
    ),
    dropoffLocations: remapParticipantKeyedRecord(
      (snapshot as any).dropoffLocations as any,
      idMap,
    ),
    outingGroups: normalisedOutingGroups,
    outingGroup: normalisedOutingGroups[0] ?? null,
  };

  if (Array.isArray((snapshot as any).pickupParticipants)) {
    next.pickupParticipants = mapParticipantIdArray(
      (snapshot as any).pickupParticipants,
      idMap,
    );
  }

  return syncOutingCompatibility(next) as T;
}

function reconcileOutingMemberships(
  outingGroups: OutingGroup[],
  workingStaff: unknown,
  attendingParticipants: unknown,
): OutingGroup[] {
  const workingSet = Array.isArray(workingStaff)
    ? new Set(workingStaff.map((id) => String(id)))
    : null;
  const attendingSet = Array.isArray(attendingParticipants)
    ? new Set(attendingParticipants.map((id) => String(id)))
    : null;

  return outingGroups
    .map((outing) => {
      let staffIds = outing.staffIds.map(String);
      let participantIds = outing.participantIds.map(String);
      let driverId = outing.driverId ? String(outing.driverId) : "";

      if (workingSet) {
        staffIds = staffIds.filter((id) => workingSet.has(id));

        if (driverId && !workingSet.has(driverId)) {
          driverId = "";
        }
      }

      if (driverId && !staffIds.includes(driverId)) {
        staffIds = [driverId, ...staffIds];
      }

      if (attendingSet) {
        participantIds = participantIds.filter((id) =>
          attendingSet.has(id),
        );
      }

      return {
        ...outing,
        staffIds: Array.from(new Set(staffIds)),
        participantIds: Array.from(new Set(participantIds)),
        driverId,
      };
    })
    .filter(isOutingMeaningful);
}

function syncOutingCompatibility<T extends Partial<ScheduleSnapshot>>(
  next: T,
): T {
  const anyNext = next as any;

  if ("outingGroups" in anyNext || "outingGroup" in anyNext) {
    const normalizedGroups = normalizeOutingGroupsFromSnapshot(anyNext);
    const outingGroups = reconcileOutingMemberships(
      normalizedGroups,
      anyNext.workingStaff,
      anyNext.attendingParticipants,
    );

    anyNext.outingGroups = outingGroups;
    anyNext.outingGroup = outingGroups[0] ?? null;
  }

  return next;
}

function normalizeDropoffAssignments(
  value: ScheduleSnapshot["dropoffAssignments"] | undefined | null,
): ScheduleSnapshot["dropoffAssignments"] {
  const result: ScheduleSnapshot["dropoffAssignments"] = {};

  if (!value || typeof value !== "object") {
    return result;
  }

  for (const [key, assignment] of Object.entries(value)) {
    if (!assignment) {
      result[key as ID] = null;
      continue;
    }

    const v = assignment as any;

    // Newer shape: { staffId, locationId }
    if (typeof v === "object" && "staffId" in v && "locationId" in v) {
      const staffId = (v.staffId ?? null) as ID | null;
      const locationId =
        typeof v.locationId === "number" ? (v.locationId as number) : null;

      result[key as ID] = {
        staffId,
        locationId,
      };
      continue;
    }

    // Older shape: value is a staffId string
    const staffId = assignment as any as ID | null;
    result[key as ID] = {
      staffId,
      locationId: null,
    };
  }

  return result;
}

function toTodayKey(date = new Date()): string {
  return getSydneyDateKey(date);
}

function normaliseSnapshotForStore(snapshot: any): ScheduleSnapshot {
  const normalizedDropoffs = normalizeDropoffAssignments(
    (snapshot as any).dropoffAssignments,
  );

  const normalizedOutingGroups = normalizeOutingGroupsFromSnapshot(snapshot);

  return syncOutingCompatibility({
    ...makeInitialSnapshot(),
    ...(snapshot as ScheduleSnapshot),
    dropoffAssignments: normalizedDropoffs,
    outingGroups: normalizedOutingGroups,
    outingGroup: normalizedOutingGroups[0] ?? null,
    outingAutoResetEnabled: (snapshot as any).outingAutoResetEnabled !== false,
    outingLastAutoResetDate: (snapshot as any).outingLastAutoResetDate,
  } as ScheduleSnapshot);
}

function clearOutingsFromSnapshot<T extends Partial<ScheduleSnapshot>>(
  snapshot: T,
  resetDateKey?: string,
): T {
  const next = { ...(snapshot as any) };
  next.outingGroups = [];
  next.outingGroup = null;
  if (resetDateKey) next.outingLastAutoResetDate = resetDateKey;
  return syncOutingCompatibility(next) as T;
}

function shouldAutoResetOutings(
  snapshot: Partial<ScheduleSnapshot>,
  now = new Date(),
): boolean {
  const anySnapshot = snapshot as any;
  if (anySnapshot.outingAutoResetEnabled === false) return false;

  const todayKey = toTodayKey(now);
  if (anySnapshot.outingLastAutoResetDate === todayKey) return false;
  if (minutesSinceMidnight(now) < OUTING_AUTO_RESET_MINUTES) return false;

  return normalizeOutingGroupsFromSnapshot(anySnapshot).length > 0;
}

// ----------------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------------

export const useSchedule = create<ScheduleState>((set, get) => ({
  ...makeInitialSnapshot(),
  chores: [],
  checklistItems: [],
  timeSlots: TIME_SLOTS,
  masterDataLoaded: false,
  masterDataLoading: false,

  scheduleStep: 0,
  selectedDate: undefined,

  banner: null,
  hasInitialisedToday: false,
  currentInitDate: undefined,

  activeScheduleId: null,
  activeScheduleHouse: null,
  activeScheduleDate: null,
  activeScheduleUpdatedAt: null,
  todayScheduleStatus: "idle",
  scheduleLoadError: null,

  recentCleaningSnapshots: [],

  loadMasterData: async (options = {}) => {
    const state = get();
    if (state.masterDataLoading) return;
    if (state.masterDataLoaded && !options.force) return;

    set({ masterDataLoading: true });

    try {
      const [staffRes, partRes, choresRes, checklistRes, timeSlotsRes] =
        await Promise.all([
          supabase.from("staff").select("*").order("name", { ascending: true }),
          supabase
            .from("participants")
            .select("*")
            .order("name", { ascending: true }),
          supabase
            .from("cleaning_chores")
            .select("*")
            .order("id", { ascending: true }),
          supabase
            .from("final_checklist_items")
            .select("*")
            .order("id", { ascending: true }),
          supabase
            .from("time_slots")
            .select("*")
            .order("id", { ascending: true }),
        ]);

      const staff = (staffRes.data || []) as any[];
      const participants = (partRes.data || []) as any[];
      const chores = (choresRes.data || []) as any[];
      const checklistItems = (checklistRes.data || []) as any[];
      const timeSlots = (timeSlotsRes.data || []) as any[];

      // Map DB rows into app types (keep unknown fields for now; screens use what they need)
      set((s) => {
        const mappedStaff = staff.map(mapStaffRow);
        const mappedParticipants = participants.map(mapParticipantRow);
        const currentWithLivePeople = applyLiveMasterDataToSnapshot(
          s,
          mappedStaff,
          mappedParticipants,
        );

        return {
          ...currentWithLivePeople,

          chores: chores.map((r) => ({ id: String(r.id), name: r.name })),
          checklistItems: checklistItems.map((r) => ({
            id: String(r.id),
            name: r.name,
          })),
          timeSlots: timeSlots.length
            ? timeSlots.map((r) => ({
                id: String(r.id),
                startTime:
                  r.start_time ?? r.startTime ?? r.start ?? r.starttime ?? "",
                endTime: r.end_time ?? r.endTime ?? r.end ?? r.endtime ?? "",
                displayTime:
                  r.display_time ?? r.displayTime ?? r.display ?? r.label ?? "",
              }))
            : TIME_SLOTS,
          masterDataLoaded: true,
          masterDataLoading: false,
        };
      });
    } catch (e) {
      console.error("[masterData] load failed", e);
      set({ masterDataLoading: false });
    }
  },

  createSchedule: (snapshot: ScheduleSnapshot) =>
    new Promise<void>((resolve) => {
      set((state) =>
        syncOutingCompatibility({
          ...state,
          ...snapshot,
        } as ScheduleState),
      );
      resolve();
    }),

  patchSchedule: (patch: Partial<ScheduleSnapshot>) =>
    set((state) => {
      const next: ScheduleState = {
        ...state,
        ...patch,
      };

      // Normalise dropoffs
      if (patch.dropoffAssignments) {
        const normalizedDropoffs = normalizeDropoffAssignments(
          patch.dropoffAssignments,
        );
        next.dropoffAssignments = normalizedDropoffs;
      }

      return syncOutingCompatibility(next);
    }),

  updateSchedule: (patch: Partial<ScheduleSnapshot>) => {
    set((state) => {
      const next: ScheduleState = {
        ...state,
        ...patch,
      };

      // If there's at least one field changed, mark that we've touched the schedule
      if (Object.keys(patch).length > 0) {
        next.meta = {
          ...(state.meta || {}),
          from: state.meta?.from || "create-wizard",
        };
      }

      return syncOutingCompatibility(next);
    });
  },

  resetOutings: async (options = {}) => {
    const resetDateKey = toTodayKey();
    const isAuto = options.reason === "auto";

    set((state) => {
      const next = clearOutingsFromSnapshot(
        {
          ...state,
          meta: {
            ...(state.meta || {}),
            from: state.meta?.from || "create-wizard",
          },
        } as ScheduleState,
        isAuto ? resetDateKey : undefined,
      ) as ScheduleState;

      return next;
    });

    if (options.persist) {
      try {
        const current = get();
        const result = await saveOutingsForDate({
          house: current.activeScheduleHouse || DEFAULT_HOUSE_ID,
          outingDate: resetDateKey,
          outings: [],
          autoResetEnabled: current.outingAutoResetEnabled !== false,
          lastAutoResetDate: isAuto ? resetDateKey : current.outingLastAutoResetDate,
        });
        if (!result.ok) throw result.error;
      } catch (error) {
        console.error("[outings] failed to persist outing reset", error);
      }
    }
  },

  maybeAutoResetOutings: async (now = new Date()) => {
    const state = get();
    if (state.outingAutoResetEnabled === false) return false;

    const resetDateKey = toTodayKey(now);
    if (state.outingLastAutoResetDate === resetDateKey) return false;
    if (minutesSinceMidnight(now) < OUTING_AUTO_RESET_MINUTES) return false;

    if (!shouldAutoResetOutings(state, now)) {
      set((current) => ({
        ...current,
        outingLastAutoResetDate: resetDateKey,
      }));
      return false;
    }

    await get().resetOutings({ persist: true, reason: "auto" });
    return true;
  },

  setOutingAutoResetEnabled: (enabled: boolean) =>
    set((state) => ({
      ...state,
      outingAutoResetEnabled: enabled,
      meta: {
        ...(state.meta || {}),
        from: state.meta?.from || "create-wizard",
      },
    })),

  setScheduleStep: (step: number) =>
    set((state) => ({
      ...state,
      scheduleStep: step,
    })),

  setSelectedDate: (date?: string) =>
    set((state) => ({
      ...state,
      selectedDate: date,
    })),

  setBanner: (banner: ScheduleBanner | null) =>
    set((state) => ({
      ...state,
      banner,
    })),

  markInitialisedForDate: (date: string) =>
    set((state) => ({
      ...state,
      hasInitialisedToday: true,
      currentInitDate: date,
    })),

  setActiveScheduleRecord: (record: ScheduleRecord | null) =>
    set((state) => ({
      ...state,
      activeScheduleId: record?.id ?? null,
      activeScheduleHouse: record?.house ?? null,
      activeScheduleDate: record?.scheduleDate ?? null,
      activeScheduleUpdatedAt: record?.updatedAt ?? null,
      todayScheduleStatus: record ? "ready" : "missing",
      scheduleLoadError: null,
    })),

  setRecentCleaningSnapshots: (snaps: ScheduleSnapshot[]) =>
    set((state) => ({
      ...state,
      recentCleaningSnapshots: snaps,
    })),

  touch: () =>
    set((state) => ({
      ...state,
      meta: {
        ...(state.meta || {}),
        from: state.meta?.from || "create-wizard",
      },
    })),
}));

// ----------------------------------------------------------------------------------
// Derived selectors
// ----------------------------------------------------------------------------------

export function useWorkingStaff() {
  const { staff, workingStaff } = useSchedule();
  return useMemo(
    () => staff.filter((s) => workingStaff.includes(s.id as ID)),
    [staff, workingStaff],
  );
}

export function useAttendingParticipants() {
  const { participants, attendingParticipants } = useSchedule();
  return useMemo(
    () => participants.filter((p) => attendingParticipants.includes(p.id)),
    [participants, attendingParticipants],
  );
}

// ----------------------------------------------------------------------------------
// Init / banner helpers
// ----------------------------------------------------------------------------------

function applyIndependentOutings(
  snapshot: ScheduleSnapshot,
  outingsResult: Awaited<ReturnType<typeof fetchOutingsForDate>>,
): ScheduleSnapshot {
  if (!outingsResult.ok) return snapshot;

  const record = outingsResult.data;
  return syncOutingCompatibility({
    ...snapshot,
    outingGroups: record?.outings || [],
    outingGroup: record?.outings?.[0] ?? null,
    outingAutoResetEnabled: record?.autoResetEnabled !== false,
    outingLastAutoResetDate: record?.lastAutoResetDate,
  } as ScheduleSnapshot);
}

function setMissingScheduleState(
  houseId: string,
  todayKey: string,
  outingsResult?: Awaited<ReturnType<typeof fetchOutingsForDate>>,
) {
  useSchedule.setState((current) => {
    const empty = applyIndependentOutings(
      {
        ...makeInitialSnapshot(),
        staff: current.staff,
        participants: current.participants,
        date: todayKey,
      },
      outingsResult || ({ ok: true, data: null } as any),
    );

    return {
      ...current,
      ...empty,
      chores: current.chores,
      checklistItems: current.checklistItems,
      timeSlots: current.timeSlots.length ? current.timeSlots : TIME_SLOTS,
      masterDataLoaded: current.masterDataLoaded,
      masterDataLoading: false,
      banner: { type: "missing", scheduleDate: todayKey },
      hasInitialisedToday: true,
      currentInitDate: todayKey,
      activeScheduleId: null,
      activeScheduleHouse: houseId,
      activeScheduleDate: todayKey,
      activeScheduleUpdatedAt: null,
      todayScheduleStatus: "missing",
      scheduleLoadError: null,
    };
  });
}

function applyLoadedScheduleState(
  record: ScheduleRecord,
  todayKey: string,
  outingsResult: Awaited<ReturnType<typeof fetchOutingsForDate>>,
) {
  useSchedule.setState((current) => {
    const normalized = normaliseSnapshotForStore(record.snapshot);
    const withMasterData = applyLiveMasterDataToSnapshot(
      normalized,
      current.staff,
      current.participants,
    );
    const withOutings = applyIndependentOutings(withMasterData, outingsResult);

    return {
      ...current,
      ...withOutings,
      date: todayKey,
      banner: { type: "loaded", scheduleDate: todayKey },
      hasInitialisedToday: true,
      currentInitDate: todayKey,
      activeScheduleId: record.id,
      activeScheduleHouse: record.house,
      activeScheduleDate: record.scheduleDate,
      activeScheduleUpdatedAt: record.updatedAt,
      todayScheduleStatus: "ready",
      scheduleLoadError: null,
    };
  });
}

/** Initialise the exact current Sydney-date schedule for a location. */
export async function initScheduleForToday(houseId: string) {
  return initialiseScheduleForTodayIfNeeded(houseId, toTodayKey());
}

export async function initialiseScheduleForTodayIfNeeded(
  houseId: string,
  todayKey: string,
) {
  const state = useSchedule.getState();

  try {
    await state.loadMasterData({ force: true });
  } catch {}

  const latestState = useSchedule.getState();
  if (
    latestState.hasInitialisedToday &&
    latestState.currentInitDate === todayKey &&
    latestState.activeScheduleHouse === houseId &&
    latestState.todayScheduleStatus === "ready"
  ) {
    return;
  }

  useSchedule.setState({
    todayScheduleStatus: "loading",
    scheduleLoadError: null,
  });

  const [scheduleResult, outingsResult] = await Promise.all([
    fetchScheduleForHouseAndDate(houseId, todayKey),
    fetchOutingsForDate(houseId, todayKey),
  ]);

  if (!scheduleResult.ok) {
    useSchedule.setState((current) => ({
      ...current,
      date: todayKey,
      activeScheduleId: null,
      activeScheduleHouse: houseId,
      activeScheduleDate: todayKey,
      activeScheduleUpdatedAt: null,
      todayScheduleStatus: "error",
      scheduleLoadError: String((scheduleResult.error as any)?.message || scheduleResult.error),
      hasInitialisedToday: true,
      currentInitDate: todayKey,
    }));
    return;
  }

  if (!scheduleResult.data) {
    setMissingScheduleState(houseId, todayKey, outingsResult);
    return;
  }

  applyLoadedScheduleState(scheduleResult.data, todayKey, outingsResult);
  await useSchedule.getState().maybeAutoResetOutings();
}

/**
 * Poll the exact current Sydney-date record. A missing record clears stale daily
 * operational data; a temporary network failure never substitutes yesterday.
 */
export async function refreshScheduleFromSupabase(houseId: string) {
  const todayKey = toTodayKey();
  const state = useSchedule.getState();

  try {
    await state.loadMasterData();
  } catch {}

  const [scheduleResult, outingsResult] = await Promise.all([
    fetchScheduleForHouseAndDate(houseId, todayKey),
    fetchOutingsForDate(houseId, todayKey),
  ]);

  if (!scheduleResult.ok) {
    const current = useSchedule.getState();
    const alreadyHoldingVerifiedToday =
      current.todayScheduleStatus === "ready" &&
      current.activeScheduleHouse === houseId &&
      current.activeScheduleDate === todayKey;

    useSchedule.setState((value) => ({
      ...value,
      todayScheduleStatus: alreadyHoldingVerifiedToday ? "ready" : "error",
      scheduleLoadError: String((scheduleResult.error as any)?.message || scheduleResult.error),
      ...(alreadyHoldingVerifiedToday
        ? applyIndependentOutings(value, outingsResult)
        : {}),
    }));
    return scheduleResult;
  }

  if (!scheduleResult.data) {
    setMissingScheduleState(houseId, todayKey, outingsResult);
    return scheduleResult;
  }

  applyLoadedScheduleState(scheduleResult.data, todayKey, outingsResult);
  await useSchedule.getState().maybeAutoResetOutings();
  return scheduleResult;
}
