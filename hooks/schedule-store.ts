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

export const useSchedule = create<ScheduleState>((set) => ({
  ...makeInitialSnapshot(),

  createSchedule: (snapshot) => {
    // Replace the entire snapshot when finishing the create wizard
    set(() => ({ ...snapshot }));
  },

  updateSchedule: (patch) => {
    // Merge partial updates from edit screens
    set((state) => ({
      ...state,
      ...patch,
    }));
  },
}));

// Helpers to quickly check if everything has been assigned

export const useFloatingMissing = (rooms: { id: string }[]) => {
  const { floatingAssignments } = useSchedule();
  const requiredKeys: string[] = [];

  // Every room should have a staff member for every time-slot
  for (const room of rooms || []) {
    for (const slot of TIME_SLOTS) {
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
