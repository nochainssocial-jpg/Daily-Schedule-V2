// hooks/schedule-store.ts
import { create } from 'zustand';
import type { Staff, Participant } from '@/constants/data';
import { TIME_SLOTS } from '@/constants/data';

export type ID = string;

// Snapshot of a single saved schedule
export type ScheduleSnapshot = {
  staff: Staff[];
  participants: Participant[];

  // Core selections
  workingStaff: ID[];                 // The Dream Team (Working at B2)
  attendingParticipants: ID[];        // Attending Participants

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
  pickupParticipants: ID[];                // participantIds being picked up by third parties
  helperStaff: ID[];                       // helpers joining dropoffs
  dropoffAssignments: Record<ID, ID[]>;    // staffId -> participantIds they drop off

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
  touch: () => void;
};

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

  // wizard / UI state
  scheduleStep: 1,
  selectedDate: undefined,

  createSchedule: (snapshot: ScheduleSnapshot) => {
    set(() => ({
      ...snapshot,
      // reset wizard state when a new schedule is created
      scheduleStep: 1,
      selectedDate: snapshot.date ?? get().selectedDate,
    }));
  },

  updateSchedule: (patch: Partial<ScheduleSnapshot>) => {
    set((state) => ({
      ...state,
      ...patch,
    }));
  },

  setScheduleStep: (step: number) => {
    set({ scheduleStep: step });
  },

  setSelectedDate: (date?: string) => {
    set({ selectedDate: date });
  },

  touch: () => {
    // no-op for now; used just to trigger a rerender in some places
  },
}));

// Helpers to quickly check if everything has been assigned

export const useFloatingMissing = (rooms: { id: string }[]) => {
  const { floatingAssignments } = useSchedule();

  // Build the set of required keys for all time slots + rooms
  const requiredKeys: string[] = [];
  for (const slot of TIME_SLOTS) {
    for (const room of rooms) {
      requiredKeys.push(`${slot.id}|${room.id}`);
    }
  }

  const missing = requiredKeys.filter((key) => !floatingAssignments?.[key]);
  return { ok: missing.length === 0, missing };
};

export const useCleaningMissing = (chores: { id: string }[]) => {
  const { cleaningAssignments } = useSchedule();
  const missing = (chores || [])
    .map((c) => String(c.id))
    .filter((id) => !cleaningAssignments?.[id]);
  return { ok: missing.length === 0, missing };
};
