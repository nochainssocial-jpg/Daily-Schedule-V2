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

export type CleaningAssignments = Record<ID, ID | null>;

export type DropoffAssignment = {
  staffId: ID | null;
  locationId: number | null;
};

export type FinalChecklist = {
  isPrinted: boolean;
  isSigned: boolean;
};

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
  scheduleDate: string; // YYYY-MM-DD for the schedule being edit
};

export type ScheduleState = ScheduleSnapshot & {
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
    helperStaff: null,
    dropoffAssignments: {},
    dropoffLocations: {},
    outingGroup: null,
    date: undefined,
    meta: undefined,
  };
}

function normalizeDropoffAssignments(
  value: ScheduleSnapshot['dropoffAssignments'] | undefined | null,
): ScheduleSnapshot['dropoffAssignments'] {
  const result: ScheduleSnapshot['dropoffAssignments'] = {};

  if (!value || typeof value !== 'object') {
    return result;
  }

  for (const [key, assignment] of Object.entries(value)) {
    if (!assignment) {
      result[key as ID] = null;
      continue;
    }

    const v = assignment as any;

    // Newer shape: { staffId, locationId }
    if (typeof v === 'object' && 'staffId' in v && 'locationId' in v) {
      const staffId = (v.staffId ?? null) as ID | null;
      const locationId =
        typeof v.locationId === 'number' ? (v.locationId as number) : null;

      result[key as ID] = {
        staffId,
        locationId,
      };
      continue;
    }

    // Older shape: value is a staffId string
    const staffId = (assignment as any) as ID | null;
    result[key as ID] = {
      staffId,
      locationId: null,
    };
  }

  return result;
}

// ----------------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------------

export const useSchedule = create<ScheduleState>((set, get) => ({
  ...makeInitialSnapshot(),

  scheduleStep: 0,
  selectedDate: undefined,

  banner: null,
  hasInitialisedToday: false,
  currentInitDate: undefined,

  recentCleaningSnapshots: [],

  createSchedule: (snapshot: ScheduleSnapshot) =>
    new Promise<void>((resolve) => {
      set((state) => ({
        ...state,
        ...snapshot,
      }));
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

      return next;
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
          from: state.meta?.from || 'create-wizard',
        };
      }

      return next;
    });
  },

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
        from: state.meta?.from || 'create-wizard',
      },
    })),
}));

// ----------------------------------------------------------------------------------
// Derived selectors
// ----------------------------------------------------------------------------------

export function useWorkingStaff() {
  const { staff, workingStaff } = useSchedule();
  return useMemo(
    () =>
      staff.filter((s) =>
        workingStaff.includes(s.id as ID),
      ),
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
  todayKey: string,
) {
  const state = useSchedule.getState();

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

    // Normalise dropoffs and merge snapshot
    const normalizedDropoffs = normalizeDropoffAssignments(
      (snapshot as any).dropoffAssignments,
    );

    const normalizedSnapshot: ScheduleSnapshot = {
      ...makeInitialSnapshot(),
      ...(snapshot as ScheduleSnapshot),
      dropoffAssignments: normalizedDropoffs,
    };

    // Decide banner type
    const bannerType: ScheduleBannerType =
      scheduleDate === todayKey ? 'loaded' : 'prefilled';

    const banner: ScheduleBanner = {
      type: bannerType,
      scheduleDate: todayKey,
      ...(bannerType === 'prefilled' ? { sourceDate: scheduleDate } : {}),
    };

    useSchedule.setState((s) => ({
      ...s,
      ...normalizedSnapshot,
      banner,
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
