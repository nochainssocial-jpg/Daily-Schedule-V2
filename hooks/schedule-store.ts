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
  scheduleDate?: string; // YYYY-MM-DD (today we're using it for)
  sourceDate?: string;   // YYYY-MM-DD (original creation date)
};

export type ScheduleSnapshot = {
  staff: Staff[];
  participants: Participant[];

  // Core selections
  workingStaff: ID[];          // The Dream Team (Working at B2)
  attendingParticipants: ID[]; // Attending Participants

  // Daily assignments (staff -> participantIds)
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
  dropoffLocations: Record<ID, number>; // participantId -> index into DROPOFF_OPTIONS

  // Meta
  date?: string;
  meta?: Record<string, any>;
};

type ScheduleState = ScheduleSnapshot & {
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

  touch: () => void;
};

// Initial snapshot
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
  dropoffLocations: {},
  date: undefined,
  meta: {},
});

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

  createSchedule: (snapshot: ScheduleSnapshot) => {
    set(() => ({
      ...snapshot,
      scheduleStep: 1,
      selectedDate: snapshot.date ?? get().selectedDate,
    }));
  },

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

          // 6) Helper staff
          const newHelpers = next.helperStaff.filter(
            (id: ID) => !removed.includes(id)
          );

          next.assignments = newAssignments;
          next.dropoffAssignments = newDropoffs;
          next.floatingAssignments = newFloating;
          next.cleaningAssignments = newCleaning;
          next.finalChecklistStaff = newFinalChecklistStaff;
          next.helperStaff = newHelpers;
        }
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

// Helper hooks to check if there are missing floating or cleaning assignments

export const useFloatingMissing = (rooms: { id: string }[]) => {
  return useMemo(() => {
    const { floatingAssignments } = useSchedule.getState();

    const keys = TIME_SLOTS.flatMap((slot) =>
      rooms.map((room) => `${slot.id}|${room.id}`)
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

// 🔁 Auto-init on app load / day change
export async function initScheduleForToday(houseId: string) {
  const now = new Date();
  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-'); // "YYYY-MM-DD"

  if (state.hasInitialisedToday && state.currentInitDate === todayKey) {
    return;
  }

  const result = await fetchLatestScheduleForHouse(houseId);

  if (!result.ok || !result.data) {
    state.markInitialisedForDate(todayKey);
    state.setBanner({
      type: 'created',
      scheduleDate: todayKey,
      sourceDate: todayKey,
    });
    return;
  }

  const { snapshot, scheduleDate } = result.data;
  await state.createSchedule(snapshot);

  const sourceDate = (scheduleDate || '').slice(0, 10);
  const isToday = sourceDate === todayKey;

  state.markInitialisedForDate(todayKey);
  state.setBanner({
    type: isToday ? 'created' : 'loaded',
    scheduleDate: todayKey,
    sourceDate,
  });
}
