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
import { fetchLatestScheduleForHouse, saveScheduleToSupabase } from "@/lib/saveSchedule";
import { supabase } from "@/lib/supabase";

export type ID = string;

export type OutingGroup = {
  id: string;
  name: string;
  staffIds: ID[];
  participantIds: ID[];
  driverId?: ID;
  startTime?: string; // e.g. '11:00'
  endTime?: string; // e.g. '15:00'
  notes?: string;
};

export type FloatingAssignments = {
  frontRoom: ID | null;
  scotty: ID | null;
  twins: ID | null;
};

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

  // Core person → staff assignments (participant -> staff)
  assignments: Record<ID, ID | null>;

  // Floating staff by room
  floatingAssignments: FloatingAssignments;

  // Cleaning / chores
  cleaningAssignments: CleaningAssignments;

  // Special bins variant for "Take the bins out" task
  // 0 = default, 1 = red + yellow, 2 = red + green, 3 = bring in & clean
  cleaningBinsVariant?: 0 | 1 | 2 | 3;

  // Helper staff (one or more staff helping with pickups/dropoffs)
  helperStaff: ID[];

  // Dropoffs (participant → staff + location)
  dropoffAssignments: Record<ID, DropoffAssignment | null>;

  // Locations still stored separately (for now)
  dropoffLocations: Record<ID, number | null>;

  // End of shift checklist state.
  // finalChecklist is itemId -> checked.
  // finalChecklistStaff is the staff member selected as last to leave.
  finalChecklist: FinalChecklist;
  finalChecklistStaff: ID | null;

  // Primary outings model. The UI currently supports up to two outings.
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
  meta?: {
    from?: "create-wizard" | "prefill";
  };
};

export type ScheduleBannerType = "created" | "loaded" | "prefilled";

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

  setRecentCleaningSnapshots: (snaps: ScheduleSnapshot[]) => void;

  touch: () => void;
};

// ----------------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------------

const DEFAULT_HOUSE_ID = "B2";
const OUTING_AUTO_RESET_MINUTES = 17 * 60;

function minutesSinceMidnight(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
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
    .slice(0, 2)
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

function syncOutingCompatibility<T extends Partial<ScheduleSnapshot>>(
  next: T,
): T {
  const anyNext = next as any;

  if ("outingGroups" in anyNext) {
    const outingGroups = normalizeOutingGroupsFromSnapshot(anyNext);
    anyNext.outingGroups = outingGroups;
    anyNext.outingGroup = outingGroups[0] ?? null;
    return next;
  }

  if ("outingGroup" in anyNext) {
    const outingGroups = normalizeOutingGroupsFromSnapshot(anyNext);
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
  const now = date;
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
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

function buildPersistableSnapshotFromState(
  schedule: ScheduleState,
  dateKey = toTodayKey(),
): ScheduleSnapshot {
  const outingGroups = normalizeOutingGroupsFromSnapshot(schedule);

  return {
    staff: schedule.staff,
    participants: schedule.participants,
    workingStaff: schedule.workingStaff,
    attendingParticipants: schedule.attendingParticipants,

    trainingStaffToday: schedule.trainingStaffToday,

    assignments: schedule.assignments,
    floatingAssignments: schedule.floatingAssignments,
    cleaningAssignments: schedule.cleaningAssignments,
    cleaningBinsVariant: schedule.cleaningBinsVariant ?? 0,

    finalChecklist: schedule.finalChecklist,
    finalChecklistStaff: schedule.finalChecklistStaff,

    // Kept for compatibility with existing saved snapshots/screens.
    pickupParticipants: (schedule as any).pickupParticipants,
    helperStaff: schedule.helperStaff,
    helperPickupStaff: (schedule as any).helperPickupStaff || [],

    dropoffAssignments: schedule.dropoffAssignments,
    dropoffLocations: schedule.dropoffLocations || {},

    outingGroups,
    outingGroup: outingGroups[0] ?? null,
    outingAutoResetEnabled: schedule.outingAutoResetEnabled !== false,
    outingLastAutoResetDate: schedule.outingLastAutoResetDate,

    date: dateKey,
    meta: schedule.meta ?? {},
  } as ScheduleSnapshot;
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
        const snapshot = buildPersistableSnapshotFromState(
          get(),
          resetDateKey,
        );
        await saveScheduleToSupabase(DEFAULT_HOUSE_ID, snapshot);
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

/**
 * Initialise schedule for today if we haven't already.
 */
export async function initScheduleForToday(houseId: string) {
  return initialiseScheduleForTodayIfNeeded(houseId, toTodayKey());
}

/**
 * Initialises a schedule for the given house + date key if needed.
 * This is where we fetch from Supabase and decide which banner to show.
 */
export async function initialiseScheduleForTodayIfNeeded(
  houseId: string,
  todayKey: string,
) {
  const state = useSchedule.getState();

  // Ensure master data is loaded (staff, participants, chores, checklist)
  try {
    await state.loadMasterData({ force: true });
  } catch {}

  // If we've already initialised for this date, do nothing
  if (state.hasInitialisedToday && state.currentInitDate === todayKey) {
    return;
  }

  try {
    const result = await fetchLatestScheduleForHouse(houseId);

    if (!result.ok || !result.data) {
      // Treat as new schedule for today
      useSchedule.setState((s) => ({
        ...s,
        ...makeInitialSnapshot(),
        staff: s.staff,
        participants: s.participants,
        chores: s.chores,
        checklistItems: s.checklistItems,
        timeSlots: s.timeSlots.length ? s.timeSlots : TIME_SLOTS,
        masterDataLoaded: s.masterDataLoaded,
        masterDataLoading: false,
        date: todayKey,
        banner: {
          type: "created",
          scheduleDate: todayKey,
        },
        hasInitialisedToday: true,
        currentInitDate: todayKey,
      }));
      return;
    }

    const { snapshot, scheduleDate } = result.data;

    // If there's no snapshot in Supabase, treat as new schedule for today
    if (!snapshot) {
      useSchedule.setState((s) => ({
        ...s,
        ...makeInitialSnapshot(),
        staff: s.staff,
        participants: s.participants,
        chores: s.chores,
        checklistItems: s.checklistItems,
        timeSlots: s.timeSlots.length ? s.timeSlots : TIME_SLOTS,
        masterDataLoaded: s.masterDataLoaded,
        masterDataLoading: false,
        date: todayKey,
        banner: {
          type: "created",
          scheduleDate: todayKey,
        },
        hasInitialisedToday: true,
        currentInitDate: todayKey,
      }));
      return;
    }

    // Normalise dropoffs/outings and merge snapshot
    const normalizedSnapshot = normaliseSnapshotForStore(snapshot);

    // Decide banner type
    const bannerType: ScheduleBannerType =
      scheduleDate === todayKey ? "loaded" : "prefilled";

    // Outings are day-only operational data. They should not be carried
    // forward when today's schedule is prefilled from an older schedule.
    const outingReset =
      bannerType === "prefilled"
        ? clearOutingsFromSnapshot(normalizedSnapshot)
        : normalizedSnapshot;

    const banner: ScheduleBanner = {
      type: bannerType,
      scheduleDate: todayKey,
      ...(bannerType === "prefilled" ? { sourceDate: scheduleDate } : {}),
    };

    // Daily operational completion state must not be carried forward when
    // we prefill a new working day from an older schedule. Staff/participants
    // may be reused, but the end-of-shift checklist should always start clear
    // for the new schedule date.
    const checklistReset =
      bannerType === "prefilled"
        ? { finalChecklist: {}, finalChecklistStaff: null }
        : {};

    useSchedule.setState((s) => ({
      ...s,
      ...applyLiveMasterDataToSnapshot(outingReset, s.staff, s.participants),
      ...checklistReset,
      date: todayKey,
      banner,
      hasInitialisedToday: true,
      currentInitDate: todayKey,
    }));

    await useSchedule.getState().maybeAutoResetOutings();
  } catch (error) {
    console.error("Error initialising schedule for today:", error);
    useSchedule.setState((s) => ({
      ...s,
      ...makeInitialSnapshot(),
      staff: s.staff,
      participants: s.participants,
      chores: s.chores,
      checklistItems: s.checklistItems,
      timeSlots: s.timeSlots.length ? s.timeSlots : TIME_SLOTS,
      masterDataLoaded: s.masterDataLoaded,
      masterDataLoading: false,
      date: todayKey,
      banner: {
        type: "created",
        scheduleDate: todayKey,
      },
      hasInitialisedToday: true,
      currentInitDate: todayKey,
    }));
  }
}

/**
 * Soft-refreshes the currently displayed schedule from Supabase.
 * Unlike initScheduleForToday(), this intentionally does not return early after
 * the dashboard has already initialised. It is designed for TV/dashboard polling.
 */
export async function refreshScheduleFromSupabase(houseId: string) {
  const todayKey = toTodayKey();
  const state = useSchedule.getState();

  try {
    await state.loadMasterData();
  } catch {}

  try {
    const result = await fetchLatestScheduleForHouse(houseId);

    if (!result.ok || !result.data?.snapshot) {
      return result;
    }

    const { snapshot, scheduleDate } = result.data;
    const normalizedSnapshot = normaliseSnapshotForStore(snapshot);
    const isTodaySchedule = scheduleDate === todayKey;
    const outingReset = isTodaySchedule
      ? normalizedSnapshot
      : clearOutingsFromSnapshot(normalizedSnapshot);

    // If the latest saved schedule is an older prefill source, keep daily
    // completion state clear for today's dashboard until today's schedule is saved.
    const checklistReset = isTodaySchedule
      ? {}
      : { finalChecklist: {}, finalChecklistStaff: null };

    useSchedule.setState((current) => ({
      ...current,
      ...applyLiveMasterDataToSnapshot(
        outingReset,
        current.staff,
        current.participants,
      ),
      ...checklistReset,
      date: todayKey,
      banner: current.banner,
      hasInitialisedToday: true,
      currentInitDate: todayKey,
    }));

    await useSchedule.getState().maybeAutoResetOutings();

    return result;
  } catch (error) {
    console.error("Error refreshing schedule from Supabase:", error);
    return { ok: false, error };
  }
}

