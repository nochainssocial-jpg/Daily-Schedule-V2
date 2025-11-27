// hooks/schedule-store.ts
import { useMemo } from 'react';
import { create } from 'zustand';
import type { Staff, Participant } from '@/constants/data';
import { TIME_SLOTS } from '@/constants/data';
import { fetchLatestScheduleForHouse } from '@/lib/saveSchedule';

export type ID = string;

export type OutingGroup = {
  id: string;
  name: string;
  staffIds: ID[];
  participantIds: ID[];
  startTime?: string; // e.g. '11:00'
  endTime?: string;   // e.g. '15:00'
};

export type FloatingAssignments = {
  frontRoom: ID | null;
  scotty: ID | null;
  twins: ID | null;
};

export type CleaningAssignments = {
  [staffId: ID]: {
    slotId: ID;
    label: string;
  };
};

export type DropoffAssignment = {
  staffId: ID | null;
  locationId: number | null;
};

export type ScheduleSnapshot = {
  // Base lists
  staff: Staff[];
  participants: Participant[];

  // Who is working + who is attending
  workingStaff: ID[];
  attendingParticipants: ID[];

  // Core person → staff assignments
  assignments: Record<ID, ID | null>;

  // Floating staff by room
  floatingAssignments: FloatingAssignments;

  // Cleaning / chores
  cleaningAssignments: CleaningAssignments;

  // Helper staff (single person backing up)
  helperStaff: ID | null;

  // Dropoffs (participant → staff + location)
  dropoffAssignments: Record<ID, DropoffAssignment | null>;

  // Locations still stored separately (for now)
  dropoffLocations: Record<ID, number | null>;

  // Optional outing group (not fully wired yet)
  outingGroup: OutingGroup | null;

  // Schedule date as YYYY-MM-DD (local calendar date)
  date?: string;

  // Misc metadata
  meta?: {
    from?: 'create-wizard' | 'prefill';
  };
};

export type ScheduleBannerType = 'created' | 'loaded' | 'prefilled';

export type ScheduleBanner = {
  type: ScheduleBannerType;
  scheduleDate: string; // YYYY-MM-DD for the schedule being edited
  sourceDate?: string;  // YYYY-MM-DD for the older schedule we reused, when type === 'prefilled'
  message?: string;     // Optional preformatted message (not used yet, we compute in component)
};

export type ScheduleState = ScheduleSnapshot & {
  // Wizard / UI state
  scheduleStep: number;
  selectedDate?: string;

  // Banner + auto-init state
  banner: ScheduleBanner | null;
  currentInitDate?: string;
  hasInitialisedToday: boolean;

  // Cleaning history snapshots for fairness
  recentCleaningSnapshots: ScheduleSnapshot[];

  // Core ops
  createSchedule: (snapshot: ScheduleSnapshot) => Promise<void> | void;
  patchSchedule: (patch: Partial<ScheduleSnapshot>) => void;
  updateSchedule: (patch: Partial<ScheduleSnapshot>) => void;

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

function makeInitialSnapshot(): ScheduleSnapshot {
  return {
    staff: [],
    participants: [],
    workingStaff: [],
    attendingParticipants: [],
    assignments: {},
    floatingAssignments: {
      frontRoom: null,
      scotty: null,
      twins: null,
    },
    cleaningAssignments: {},
    helperStaff: null,
    dropoffAssignments: {},
    dropoffLocations: {},
    outingGroup: null,
    date: undefined,
    meta: undefined,
  };
}

function normalizeDropoffAssignments(raw: any): Record<ID, ID[]> {
  const result: Record<ID, ID[]> = {};

  if (!raw || typeof raw !== 'object') {
    return result;
  }

  Object.entries(raw as Record<string, any>).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    // Newer shape: staffId -> participantIds[]
    if (Array.isArray(value)) {
      const staffId = key as ID;
      const pids = (value as ID[]).filter(Boolean) as ID[];
      if (pids.length) {
        result[staffId] = pids;
      }
      return;
    }

    // Legacy shape: participantId -> { staffId, locationId }
    if (typeof value === 'object' && 'staffId' in (value as any)) {
      const v = value as { staffId?: ID | null };
      if (v.staffId) {
        const staffId = v.staffId as ID;
        if (!result[staffId]) result[staffId] = [];
        result[staffId].push(key as ID);
      }
      return;
    }

    // Fallback: treat value as a single participantId with key as staffId
    const staffId = key as ID;
    const pid = value as ID;
    if (!result[staffId]) result[staffId] = [];
    result[staffId].push(pid);
  });

  return result;
}



// Simple helper to turn Date → YYYY-MM-DD in local time
export function toLocalDateKey(date: Date): string {
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const dy = String(date.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

// ----------------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------------

export const useSchedule = create<ScheduleState>((set, get) => ({
  ...makeInitialSnapshot(),

  // wizard / UI state
  scheduleStep: 1,
  selectedDate: undefined,

  // banner/init
  banner: null,
  currentInitDate: undefined,
  hasInitialisedToday: false,

  // Cleaning history for fairness-aware auto-assignments
  recentCleaningSnapshots: [],

  // Create / replace full schedule
  createSchedule: (snapshot: ScheduleSnapshot) =>
    set((state) => {
      const normalizedDropoffs = normalizeDropoffAssignments(
        (snapshot as any).dropoffAssignments,
      );

      const normalizedSnapshot: ScheduleSnapshot = {
        ...makeInitialSnapshot(),
        ...snapshot,
        dropoffAssignments: normalizedDropoffs,
      };

      return {
        ...state,
        ...normalizedSnapshot,
      };
    }),

  // Patch schedule with some changes and clean dependent state
  patchSchedule: (patch: Partial<ScheduleSnapshot>) =>
    set((state) => {
      const next: ScheduleState = {
        ...state,
        ...patch,
      };

      // If workingStaff changed, clean dependent assignments
      if (patch.workingStaff) {
        const oldStaff = state.workingStaff;
        const newStaff = patch.workingStaff;
        const removed = oldStaff.filter((id) => !newStaff.includes(id));

        if (removed.length > 0) {
          // 1) Team daily assignments
          const newAssignments = { ...next.assignments };
          for (const [pid, sid] of Object.entries(newAssignments)) {
            if (sid && removed.includes(sid as ID)) {
              newAssignments[pid as ID] = null;
            }
          }
          next.assignments = newAssignments;

          // 2) Floating
          const newFloating = { ...next.floatingAssignments };
          (['frontRoom', 'scotty', 'twins'] as const).forEach((key) => {
            const sid = newFloating[key];
            if (sid && removed.includes(sid)) {
              newFloating[key] = null;
            }
          });
          next.floatingAssignments = newFloating;

          // 3) Cleaning
          const newCleaning = { ...next.cleaningAssignments };
          for (const [sid, slot] of Object.entries(newCleaning)) {
            if (removed.includes(sid as ID)) {
              delete newCleaning[sid as ID];
            }
          }
          next.cleaningAssignments = newCleaning;

          // 4) Helper staff
          if (next.helperStaff && removed.includes(next.helperStaff)) {
            next.helperStaff = null;
          }

          // 5) Dropoffs – clean staff & reindex locations
          if (Object.keys(next.dropoffAssignments).length > 0) {
            const newDropoffs: ScheduleSnapshot['dropoffAssignments'] = {};
            for (const [pid, assignment] of Object.entries(
              next.dropoffAssignments
            )) {
              if (!assignment) {
                newDropoffs[pid as ID] = null;
                continue;
              }
              const { staffId, locationId } = assignment;
              const keepStaff =
                staffId && !removed.includes(staffId as ID)
                  ? (staffId as ID)
                  : null;
              newDropoffs[pid as ID] = {
                staffId: keepStaff,
                locationId,
              };
            }
            next.dropoffAssignments = newDropoffs;
          }

          // Locations themselves don’t depend on staff, but if you ever add
          // per-staff locations, you’d clean here too.
        }
      }

      // If attendingParticipants changed, clean assignments that refer to removed participants
      if (patch.attendingParticipants) {
        const oldAtt = state.attendingParticipants;
        const newAtt = patch.attendingParticipants;
        const removed = oldAtt.filter((id) => !newAtt.includes(id));
        if (removed.length > 0) {
          const newAssignments = { ...next.assignments };
          const newDropoffs: ScheduleSnapshot['dropoffAssignments'] = {};
          for (const [pid, sid] of Object.entries(newAssignments)) {
            if (removed.includes(pid as ID)) {
              delete newAssignments[pid as ID];
            }
          }
          for (const [pid, assignment] of Object.entries(
            next.dropoffAssignments
          )) {
            if (removed.includes(pid as ID)) {
              continue;
            }
            newDropoffs[pid as ID] = assignment;
          }
          next.assignments = newAssignments;
          next.dropoffAssignments = newDropoffs;
        }
      }

      return next;
    }),

  updateSchedule: (patch: Partial<ScheduleSnapshot>) => {
    const { patchSchedule } = get();
    patchSchedule(patch);
  },

  setScheduleStep: (step: number) => set({ scheduleStep: step }),
  setSelectedDate: (date?: string) => set({ selectedDate: date }),

  setBanner: (banner: ScheduleBanner | null) => set({ banner }),
  markInitialisedForDate: (date: string) =>
    set({
      hasInitialisedToday: true,
      currentInitDate: date,
    }),

  setRecentCleaningSnapshots: (snaps: ScheduleSnapshot[]) =>
    set({ recentCleaningSnapshots: snaps }),

  touch: () => set((state) => ({ ...state })),
}));

// Hook wrapper for derived data in screens
export function useWorkingStaff() {
  const { staff, workingStaff } = useSchedule();
  return useMemo(
    () => staff.filter((s) => workingStaff.includes(s.id)),
    [staff, workingStaff]
  );
}

export function useAttendingParticipants() {
  const { participants, attendingParticipants } = useSchedule();
  return useMemo(
    () => participants.filter((p) => attendingParticipants.includes(p.id)),
    [participants, attendingParticipants]
  );
}

/**
 * Legacy helper used by home + edit hub screens.
 * Computes today's YYYY-MM-DD key and calls initialiseScheduleForTodayIfNeeded.
 */
export async function initScheduleForToday(houseId: string) {
  const now = new Date();
  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  return initialiseScheduleForTodayIfNeeded(houseId, todayKey);
}

/**
 * Initialises a schedule for the given house + date key if needed.
 * This is where we fetch from Supabase and decide which banner to show.
 */
export async function initialiseScheduleForTodayIfNeeded(
  houseId: string,
  todayKey: string
) {
  const state = useSchedule.getState();

  // If we've already initialised for this date, don't do it again
  if (state.hasInitialisedToday && state.currentInitDate === todayKey) {
    return;
  }

  try {
    const result = await fetchLatestScheduleForHouse(houseId);

    if (!result.ok) {
      // If there's an error, just create a fresh empty schedule for today
      useSchedule.setState((s) => ({
        ...s,
        ...makeInitialSnapshot(),
        date: todayKey,
        banner: {
          type: 'created',
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
        date: todayKey,
        banner: {
          type: 'created',
          scheduleDate: todayKey,
        },
        hasInitialisedToday: true,
        currentInitDate: todayKey,
      }));
      return;
    }

    // We have a snapshot; decide if it's for today, yesterday, or an older day.
    const sourceDate = scheduleDate ?? todayKey;

    // For now we always set the schedule date to todayKey (we are editing today's schedule),
    // but the banner message explains where it was prefilled from.
    const isSameDay = sourceDate === todayKey;

    let type: ScheduleBannerType;
    let bannerScheduleDate = todayKey;
    let bannerSourceDate: string | undefined = undefined;

    if (!scheduleDate) {
      // We got a snapshot but no explicit date in the DB
      type = 'created';
      bannerScheduleDate = todayKey;
    } else if (isSameDay) {
      type = 'loaded';
      bannerScheduleDate = todayKey;
    } else {
      type = 'prefilled';
      bannerScheduleDate = todayKey;
      bannerSourceDate = sourceDate;
    }

    const normalizedDropoffs = normalizeDropoffAssignments(
      (snapshot as any).dropoffAssignments,
    );

    const normalizedSnapshot: ScheduleSnapshot = {
      ...makeInitialSnapshot(),
      ...snapshot,
      dropoffAssignments: normalizedDropoffs,
    };

    useSchedule.setState((s) => ({
      ...s,
      ...normalizedSnapshot,
      date: todayKey,
      banner: {
        type,
        scheduleDate: bannerScheduleDate,
        sourceDate: bannerSourceDate,
      },
      hasInitialisedToday: true,
      currentInitDate: todayKey,
    }));
  } catch (error) {
    console.error('Error initialising schedule for today:', error);
    useSchedule.setState((s) => ({
      ...s,
      ...makeInitialSnapshot(),
      date: todayKey,
      banner: {
        type: 'created',
        scheduleDate: todayKey,
      },
      hasInitialisedToday: true,
      currentInitDate: todayKey,
    }));
  }
}
