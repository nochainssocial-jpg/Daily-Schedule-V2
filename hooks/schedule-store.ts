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

export type BannerType = 'created' | 'loaded' | 'prefilled';

export type ScheduleBanner = {
  type: BannerType;
  scheduleDate: string;   // the date we’re editing (today)
  sourceDate?: string | null; // original schedule date if prefilled
};

export type ScheduleSnapshot = {
  staff: Staff[];
  participants: Participant[];

  // Who is working at B2 today
  workingStaff: ID[];

  // Who is attending B2 today
  attendingParticipants: ID[];

  // Participant -> staff assignment
  assignments: Record<ID, ID | null>;

  // Floating assignments (Front room / Scotty / Twins)
  floatingAssignments: {
    frontRoom: ID | null;
    scotty: ID | null;
    twins: ID | null;
  };

  // Cleaning assignments (chore slots)
  cleaningAssignments: Record<ID, ID | null>;

  // Final checklist
  finalChecklist: {
    isPrinted: boolean;
    isSigned: boolean;
  };

  // Staff responsible for checklist
  finalChecklistStaff: ID[];

  // Pickups / helpers
  pickupParticipants: ID[];
  helperStaff: ID | null;

  // Dropoff assignments and locations
  dropoffAssignments: Record<
    ID,
    {
      staffId: ID | null;
      locationId: ID | null;
    } | null
  >;

  dropoffLocations: Record<
    ID,
    {
      label: string;
    }
  >;

  // Optional outing group (not fully wired yet)
  outingGroup: OutingGroup | null;

  // Schedule date as YYYY-MM-DD (local calendar date)
  date?: string;

  // Misc metadata
  meta?: {
    from?: 'create-wizard' | 'prefill';
  };
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
    finalChecklist: {
      isPrinted: false,
      isSigned: false,
    },
    finalChecklistStaff: [],
    pickupParticipants: [],
    helperStaff: null,
    dropoffAssignments: {},
    dropoffLocations: {},
    outingGroup: null,
    date: undefined,
    meta: {},
  };
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

  // create or replace entire snapshot
  createSchedule: (snapshot: ScheduleSnapshot) =>
    set((state) => ({
      ...state,
      ...snapshot,
    })),

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

          // 4) Helper
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

      // If attendingParticipants changed, clean dropoffAssignments + locations
      if (patch.attendingParticipants) {
        const oldParts = state.attendingParticipants;
        const newParts = patch.attendingParticipants;
        const removedParts = oldParts.filter((id) => !newParts.includes(id));

        if (removedParts.length > 0) {
          const newDropoffs: ScheduleSnapshot['dropoffAssignments'] = {};
          for (const [pid, assignment] of Object.entries(
            next.dropoffAssignments
          )) {
            if (removedParts.includes(pid as ID)) {
              continue;
            }
            newDropoffs[pid as ID] = assignment;
          }
          next.dropoffAssignments = newDropoffs;
        }
      }

      return next;
    }),

  setScheduleStep: (step: number) => set({ scheduleStep: step }),
  setSelectedDate: (date?: string) => set({ selectedDate: date }),

  setBanner: (banner: ScheduleBanner | null) => set({ banner }),
  markInitialisedForDate: (date: string) =>
    set({
      currentInitDate: date,
      hasInitialisedToday: true,
    }),

  setRecentCleaningSnapshots: (snaps: ScheduleSnapshot[]) =>
    set({ recentCleaningSnapshots: snaps }),

  touch: () => set((state) => ({ ...state })),
}));

// Hook wrapper for components
export function useScheduleSnapshot() {
  return useSchedule(
    ({
      staff,
      participants,
      workingStaff,
      attendingParticipants,
      assignments,
      floatingAssignments,
      cleaningAssignments,
      finalChecklist,
      finalChecklistStaff,
      pickupParticipants,
      helperStaff,
      dropoffAssignments,
      dropoffLocations,
      outingGroup,
      date,
      meta,
    }) => ({
      staff,
      participants,
      workingStaff,
      attendingParticipants,
      assignments,
      floatingAssignments,
      cleaningAssignments,
      finalChecklist,
      finalChecklistStaff,
      pickupParticipants,
      helperStaff,
      dropoffAssignments,
      dropoffLocations,
      outingGroup,
      date,
      meta,
    })
  );
}

// Derived helpers for UI (e.g. assignments per staff, per slot, etc.)
export function useScheduleDerived() {
  const snapshot = useScheduleSnapshot();

  return useMemo(() => {
    const staffById = new Map<ID, Staff>();
    snapshot.staff.forEach((s) => staffById.set(s.id as ID, s));

    const participantById = new Map<ID, Participant>();
    snapshot.participants.forEach((p) =>
      participantById.set(p.id as ID, p)
    );

    const assignmentsByStaff: Record<ID, ID[]> = {};
    for (const [pid, sid] of Object.entries(snapshot.assignments)) {
      if (!sid) continue;
      if (!assignmentsByStaff[sid as ID]) {
        assignmentsByStaff[sid as ID] = [];
      }
      assignmentsByStaff[sid as ID].push(pid as ID);
    }

    // Cleaning by slot
    const cleaningBySlot: Record<string, ID[]> = {};
    for (const slot of TIME_SLOTS) {
      cleaningBySlot[slot.id] = [];
    }
    for (const [sid, slotId] of Object.entries(snapshot.cleaningAssignments)) {
      if (!slotId) continue;
      if (!cleaningBySlot[slotId]) {
        cleaningBySlot[slotId] = [];
      }
      cleaningBySlot[slotId].push(sid as ID);
    }

    return {
      staffById,
      participantById,
      assignmentsByStaff,
      cleaningBySlot,
    };
  }, [snapshot]);
}

// ----------------------------------------------------------------------------------
// Auto-init helpers: load / prefill today's schedule when app starts
// ----------------------------------------------------------------------------------
export async function initialiseScheduleForTodayIfNeeded(
  houseId: string,
  todayKey: string
) {
  const state = useSchedule.getState();

  // Avoid re-initialising for the same day
  if (state.hasInitialisedToday && state.currentInitDate === todayKey) {
    return;
  }

  // Mark immediately to guard against concurrent inits for the same date
  state.markInitialisedForDate(todayKey);

  const result = await fetchLatestScheduleForHouse(houseId);
  if (!result.ok || !result.data) {
    // Nothing to hydrate for this house/date – leave banner as-is
    return;
  }

  const { snapshot, scheduleDate } = result.data;
  await state.createSchedule(snapshot);

  const sourceDate = (scheduleDate || '').slice(0, 10);
  const isSameDay = sourceDate === todayKey;

  let type: BannerType = 'created';
  let bannerScheduleDate = todayKey;
  let bannerSourceDate: string | null = null;

  if (!scheduleDate) {
    // We created a new blank schedule for today
    type = 'created';
    bannerScheduleDate = todayKey;
  } else if (isSameDay) {
    // We loaded an existing schedule that was already created for today
    type = 'loaded';
    bannerScheduleDate = todayKey;
  } else {
    // We are using a previous day's schedule as the basis for today
    type = 'prefilled';
    bannerScheduleDate = todayKey;
    bannerSourceDate = sourceDate;
  }

  state.setBanner({
    type,
    scheduleDate: bannerScheduleDate,
    sourceDate: bannerSourceDate,
  });
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
