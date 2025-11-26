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
  notes?: string;
};

type BannerType = 'loaded' | 'created' | null;

export type ScheduleBanner = {
  type: BannerType;
  scheduleDate?: string; // YYYY-MM-DD (today we're using it for)
  sourceDate?: string;   // YYYY-MM-DD (original creation date)
};

export type ScheduleSnapshot = {
  staff: Staff[];
  participants: Participant[];

  // Outings
  outingGroup?: OutingGroup | null;

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
  outingGroup: null,
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
          next.assignments = newAssignments;

          // 2) Floating assignments
          const newFloating = { ...next.floatingAssignments };
          for (const [key, staffId] of Object.entries(newFloating)) {
            if (removed.includes(staffId)) {
              delete newFloating[key];
            }
          }
          next.floatingAssignments = newFloating;

          // 3) Cleaning assignments
          const newCleaning = { ...next.cleaningAssignments };
          for (const [choreId, staffId] of Object.entries(newCleaning)) {
            if (removed.includes(staffId)) {
              delete newCleaning[choreId];
            }
          }
          next.cleaningAssignments = newCleaning;

          // 4) Final checklist staff
          if (
            next.finalChecklistStaff &&
            removed.includes(next.finalChecklistStaff)
          ) {
            next.finalChecklistStaff = undefined;
          }

          // 5) Transport: helperStaff, dropoffAssignments, dropoffLocations
          if (next.helperStaff?.length) {
            next.helperStaff = next.helperStaff.filter(
              (id) => !removed.includes(id)
            );
          }

          if (next.dropoffAssignments) {
            const newDrops: Record<ID, ID[]> = {};
            for (const [staffId, partIds] of Object.entries(
              next.dropoffAssignments
            )) {
              if (!removed.includes(staffId)) {
                newDrops[staffId] = partIds;
              }
            }
            next.dropoffAssignments = newDrops;
          }
        }
      }

      // If attendingParticipants changed, clean dropoffAssignments + dropoffLocations
      if (patch.attendingParticipants) {
        const oldParts = state.attendingParticipants;
        const newParts = patch.attendingParticipants;
        const removedParts = oldParts.filter((id) => !newParts.includes(id));

        if (removedParts.length > 0) {
          const newDrops: Record<ID, ID[]> = {};
          for (const [staffId, partIds] of Object.entries(
            next.dropoffAssignments ?? {}
          )) {
            const filtered = partIds.filter(
              (pid) => !removedParts.includes(pid)
            );
            if (filtered.length > 0) {
              newDrops[staffId] = filtered;
            }
          }
          next.dropoffAssignments = newDrops;

          const newLocs: Record<ID, number> = {};
          for (const [pid, idx] of Object.entries(next.dropoffLocations ?? {})) {
            if (!removedParts.includes(pid)) {
              newLocs[pid as ID] = idx as number;
            }
          }
          next.dropoffLocations = newLocs;
        }
      }

      return next;
    });
  },

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
export function useScheduleStore() {
  return useSchedule;
}

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

// Auto-init for today (B2) when app starts
export async function initialiseScheduleForTodayIfNeeded(
  houseId: string,
  todayKey: string
) {
  const state = useSchedule.getState();

  // Avoid re-initialising for the same day
  if (state.hasInitialisedToday && state.currentInitDate === todayKey) {
    return;
  }

  const result = await fetchLatestScheduleForHouse(houseId, todayKey);
  if (!result.ok || !result.data) {
    // Nothing to hydrate; mark as initialised (so we don't retry)
    state.markInitialisedForDate(todayKey);
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
