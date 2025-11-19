// hooks/schedule-store.ts
import { create } from 'zustand';
import type { Staff, Participant } from '@/constants/data';

export type ID = string;

// Banner types for auto-loaded vs created schedules
type BannerType = 'loaded' | 'created' | null;

export type ScheduleBanner = {
  type: BannerType;
  scheduleDate?: string;
  sourceDate?: string;
};

// Snapshot of a single saved schedule
export type ScheduleSnapshot = {
  staff: Staff[];
  participants: Participant[];

  // Core selections
  workingStaff: ID[];          
  attendingParticipants: ID[]; 

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
  pickupParticipants: ID[];
  helperStaff: ID[];
  dropoffAssignments: Record<ID, ID[]>;

  // Meta
  date?: string;
  meta?: Record<string, any>;
};

type ScheduleState = ScheduleSnapshot & {
  createSchedule: (snapshot: ScheduleSnapshot) => void | Promise<void>;
  updateSchedule: (patch: Partial<ScheduleSnapshot>) => void;

  // Wizard / UI state
  scheduleStep: number;
  selectedDate?: string;
  setScheduleStep: (step: number) => void;
  setSelectedDate: (date?: string) => void;

  // Auto-init + banner state
  banner: ScheduleBanner | null;
  currentInitDate?: string;
  hasInitialisedToday: boolean;
  setBanner: (banner: ScheduleBanner | null) => void;
  markInitialisedForDate: (date: string) => void;

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
  date: undefined,
  meta: {},
});

export const useSchedule = create<ScheduleState>((set, get) => ({
  ...makeInitialSnapshot(),

  // wizard UI
  scheduleStep: 1,
  selectedDate: undefined,

  // banner/init state
  banner: null,
  currentInitDate: undefined,
  hasInitialisedToday: false,

  // Create schedule
  createSchedule: (snapshot: ScheduleSnapshot) => {
    set(() => ({
      ...snapshot,
      scheduleStep: 1,
      selectedDate: snapshot.date ?? get().selectedDate,
    }));
  },

  // Update schedule with cleanup logic
  updateSchedule: (patch: Partial<ScheduleSnapshot>) => {
    set((state) => {
      const next = { ...state, ...patch };

      // If working staff changed → clean dependent data
      if (patch.workingStaff) {
        const oldStaff = state.workingStaff;
        const newStaff = patch.workingStaff;
        const removed = oldStaff.filter((id) => !newStaff.includes(id));

        if (removed.length > 0) {
          // 1) Daily assignments
          const newAssignments = { ...next.assignments };
          removed.forEach((id) => delete newAssignments[id]);

          // 2) Dropoffs
          const newDropoffs = { ...next.dropoffAssignments };
          removed.forEach((id) => delete newDropoffs[id]);

          // 3) Floating
          const newFloating = { ...next.floatingAssignments };
          Object.keys(newFloating).forEach((k) => {
            if (removed.includes(newFloating[k])) delete newFloating[k];
          });

          // 4) Cleaning
          const newCleaning = { ...next.cleaningAssignments };
          Object.keys(newCleaning).forEach((k) => {
            if (removed.includes(newCleaning[k])) delete newCleaning[k];
          });

          // 5) Checklist staff
          let newFinalChecklistStaff = next.finalChecklistStaff;
          if (newFinalChecklistStaff && removed.includes(newFinalChecklistStaff)) {
            newFinalChecklistStaff = undefined;
          }

          // 6) Helper staff
          const newHelpers = next.helperStaff.filter(id => !removed.includes(id));

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

  // UI
  setScheduleStep: (step: number) => set({
