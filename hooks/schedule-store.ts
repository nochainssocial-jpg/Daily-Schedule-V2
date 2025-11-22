// hooks/schedule-store.ts
import { useMemo } from 'react';
import { create } from 'zustand';
import type { Staff, Participant } from '@/constants/data';
import { TIME_SLOTS } from '@/constants/data';
import { fetchLatestScheduleForHouse } from '@/lib/saveSchedule';

export type ID = string;

type BannerType = 'loaded' | 'created' | null;

export type ScheduleBanner = {
  type: BannerType;
  scheduleDate?: string; // YYYY-MM-DD (today we’re using it for)
  sourceDate?: string;   // YYYY-MM-DD (original creation date)
};

export type ScheduleSnapshot = {
  staff: Staff[];
  participants: Participant[];

  // Core selections
  workingStaff: ID[];          // The Dream Team (Working at B2)
  attendingParticipants: ID[]; // Attending Participants

  // Team daily assignments (staff -> participantIds)
  assignments: Record<ID, ID[]>;

  // Floating: key is `${timeSlotId}|${roomId}` -> staffId
  floatingAssignments: Record<string, ID>;

  // Cleaning: key is `choreId` -> staffId
  cleaningAssignments: Record<string, ID>;

  // End-of-shift checklist
  finalChecklist: Record<string, boolean>;
  finalChecklistStaff?: ID;

  // Transport
  pickupParticipants: ID[];             // participantIds being picked up by third parties
  helperStaff: ID[];                    // helpers joining dropoffs
  dropoffAssignments: Record<ID, ID[]>; // staffId -> participantIds they drop off
  dropoffLocations: Record<ID, number>; // participantId -> index in DROPOFF_OPTIONS

  // Meta
  date?: string;                        // schedule date (YYYY-MM-DD)
  meta?: Record<string, any>;
};

type ScheduleState = ScheduleSnapshot & {
  // Core actions
  createSchedule: (snapshot: ScheduleSnapshot) => void | Promise<void>;
  updateSchedule: (patch: Partial<ScheduleSnapshot>) => void;

  // Wizard + UI state
  scheduleStep: number;
  selectedDate?: string;
  setScheduleStep: (step: number) => void;
  setSelectedDate: (date?: string) => void;

  // Auto-init + banner state
  banner: ScheduleBanner | null;
  currentInitDate?: string;          // which YYYY-MM-DD we last initialised for
  hasInitialisedToday: boolean;
  setBanner: (banner: ScheduleBanner | null) => void;
  markInitialisedForDate: (date: string) => void;

  // Cleaning history for fairness-aware auto-assignments
  recentCleaningSnapshots: ScheduleSnapshot[];
  setRecentCleaningSnapshots: (snaps: ScheduleSnapshot[]) => void;

  // Force subscribers to re-render
  touch: () => void;
};

// Base, safe default snapshot – used both for a new day and to layer under loaded snapshots
const makeInitialSnapshot = (): ScheduleSnapshot => ({
  staff: [],
  participants: [],
  workingStaff: [],
  attendingParticipants: [],
  assignments: {},
  floatingAssignments: {},
  cleaningAssignments: {},
  finalChecklist: {},
  finalChecklistStaff: undefined,
  pickupParticipants: [],
  helperStaff: [],
  dropoffAssignments: {},
  dropoffLocations: {},   // important: default to empty object
  date: undefined,
  meta: {},
});

export const useSchedule = create<ScheduleState>((set, get) => ({
  ...makeInitialSnapshot(),

  // Wizard / UI
  scheduleStep: 1,
  selectedDate: undefined,

  // Auto-init + banner
  banner: null,
  currentInitDate: undefined,
  hasInitialisedToday: false,
  recentCleaningSnapshots: [],

  // Create / replace whole schedule snapshot
  createSchedule: (snapshot: ScheduleSnapshot) => {
    // Layer the loaded snapshot on top of a clean initial snapshot.
    // This protects us when we add new fields (like dropoffLocations) that
    // older Supabase snapshots don’t know about yet.
    const base = makeInitialSnapshot();

    set(() => ({
      ...base,
      ...snapshot,
      scheduleStep: 1,
      selectedDate: snapshot.date ?? get().selectedDate,
    }));
  },

  // Patch update – used by all edit screens
  updateSchedule: (patch: Partial<ScheduleSnapshot>) => {
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
          for (const staffId of removed) {
            delete newAssignments[staffId];
          }

          // 2) Dropoffs
          const newDropoffs = { ...next.dropoffAssignments };
          for (const staffId of removed) {
            delete newDropoffs[staffId];
          }

          // 3) Floating assignments
          const newFloating = { ...next.floatingAssignments };
          for (const key of Object.keys(newFloating)) {
            if (removed.includes(newFloating[key])) {
              delete newFloating[key];
            }
          }

          // 4) Cleaning assignments
          const newCleaning = { ...next.cleaningAssignments };
          for (const choreId of Object.keys(newCleaning)) {
            if (removed.includes(newCleaning[choreId])) {
              delete newCleaning[choreId];
            }
          }

          // 5) End-of-shift checklist staff
          let newFinalChecklistStaff = next.finalChecklistStaff;
          if (newFinalChecklistStaff && removed.includes(newFinalChecklistStaff)) {
            newFinalChecklistStaff = undefined;
          }

          // 6) Helpers that are no longer working
          const newHelpers = (next.helperStaff || []).filter(
            (id) => !removed.includes(id),
          );

          next.assignments = newAssignments;
          next.dropoffAssignments = newDropoffs;
          next.floatingAssignments = newFloating;
          next.cleaningAssignments = newCleaning;
          next.finalChecklistStaff = newFinalChecklistStaff;
          next.helperStaff = newHelpers;
        }
      }

      // Safety: always ensure dropoffLocations exists
      if (!next.dropoffLocations) {
        next.dropoffLocations = {};
      }

      return next;
    });
  },

  setScheduleStep: (step: number) => set({ scheduleStep: step }),
  setSelectedDate: (date?: string) => set({ selectedDate: date }),

  setBanner: (banner: ScheduleBanner | null) => set({ banner }),
  markInitialisedForDate: (date: string) =>
    set({ currentInitDate: date, hasInitialisedToday: true }),

  setRecentCleaningSnapshots: (snaps: ScheduleSnapshot[]) =>
    set({ recentCleaningSnapshots: snaps }),

  touch: () => set((state) => ({ ...state })),
}));

// --- Helpers used in the Create flow & status banner ---

export const useFloatingMissing = (rooms: { id: string }[]) => {
  return useMemo(() => {
    const { floatingAssignments } = useSchedule.getState();

    const keys = TIME_SLOTS.flatMap((slot) =>
      rooms.map((room) => `${slot.id}|${room.id}`),
    );

    return keys.some((key) => !floatingAssignments[key]);
  }, [rooms]);
};

export const useCleaningMissing = (choreIds: string[]) => {
  return useMemo(() => {
    const { cleaningAssignments } = useSchedule.getState();

    return choreIds.some((id) => !cleaningAssignments[id]);
  }, [choreIds]);
};

// --- Auto-init on app load / day change ---

export async function initScheduleForToday(state: ScheduleState, houseId: string) {
  // We store / compare dates as YYYY-MM-DD in UTC to keep it consistent.
  const todayKey = new Date().toISOString().slice(0, 10);

  // Guard: don’t re-initialise twice in one day on the same client.
  if (state.hasInitialisedToday && state.currentInitDate === todayKey) {
    return;
  }

  // Try to fetch the latest saved schedule for this house
  const result = await fetchLatestScheduleForHouse(houseId);

  if (!result.ok || !result.data) {
    // Nothing saved yet → treat as "created" schedule for today (empty snapshot).
    state.markInitialisedForDate(todayKey);
    state.setBanner({
      type: 'created',
      scheduleDate: todayKey,
      sourceDate: todayKey,
    });
    return;
  }

  const { snapshot, scheduleDate } = result.data;

  // Safety: layer snapshot over initial defaults on the way *in*
  // (mirrors what createSchedule does).
  const base = makeInitialSnapshot();
  await state.createSchedule({
    ...base,
    ...snapshot,
  });

  const sourceDate = (scheduleDate || '').slice(0, 10);
  const isToday = sourceDate === todayKey;

  state.markInitialisedForDate(todayKey);
  state.setBanner({
    type: isToday ? 'created' : 'loaded',
    scheduleDate: todayKey,
    sourceDate,
  });
}
