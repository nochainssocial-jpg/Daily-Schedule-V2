// hooks/schedule-store.ts
import { create } from 'zustand';
import type { Staff, Participant } from '@/constants/data';

export type ID = string;

export type ScheduleSnapshot = {
  staff: Staff[];
  participants: Participant[];
  workingStaff: ID[];                 // The Dream Team (Working at B2)
  attendingParticipants: ID[];        // Attending Participants
  assignments: Record<ID, ID[]>;      // staffId -> participantIds[]
  floatingAssignments: Record<string, ID>; // roomId -> staffId
  cleaningAssignments: Record<string, ID>; // dutyId -> staffId
  finalChecklist: Record<string, boolean>;
  finalChecklistStaff?: ID;

  // NEW: pickups & dropoffs
  pickupParticipants: ID[];           // participants picked up by third party
  helperStaff: ID[];                  // non-working staff helping with dropoffs
  dropoffAssignments: Record<ID, ID[]>; // staffId -> participantIds[] for dropoffs

  date?: string;
  meta?: any;
};

type State = ScheduleSnapshot & {
  selectedDate?: string;
  touch?: (key: string) => void;
  updateSchedule: (patch: Partial<ScheduleSnapshot>) => void;
  createSchedule: (snapshot: ScheduleSnapshot) => void;
};

const emptySnapshot: ScheduleSnapshot = {
  staff: [],
  participants: [],
  workingStaff: [],
  attendingParticipants: [],
  assignments: {},
  floatingAssignments: {},
  cleaningAssignments: {},
  finalChecklist: {},
  finalChecklistStaff: undefined,

  // NEW fields default
  pickupParticipants: [],
  helperStaff: [],
  dropoffAssignments: {},

  date: undefined,
  meta: undefined,
};

export const useSchedule = create<State>((set, get) => ({
  ...emptySnapshot,
  selectedDate: undefined,

  touch: (_key: string) => {
    // Reserved for future “dirty” tracking if needed
  },

  updateSchedule: (patch) =>
    set((state) => ({
      ...state,
      ...patch,
    })),

  createSchedule: (snapshot) =>
    set((state) => ({
      ...emptySnapshot,
      ...snapshot,
      selectedDate: snapshot.date ?? state.selectedDate,
    })),
}));

// Helpers used by other screens
export const useUnassignedParticipants = () => {
  const { attendingParticipants, assignments } = useSchedule();
  const assigned = new Set<string>();
  Object.values(assignments || {}).forEach((arr) =>
    (arr || []).forEach((pid) => assigned.add(pid)),
  );
  return (attendingParticipants || []).filter((pid) => !assigned.has(pid));
};

export const useAssignmentsComplete = () => {
  const { attendingParticipants, assignments } = useSchedule();
  const assigned = new Set<string>();
  Object.values(assignments || {}).forEach((arr) =>
    (arr || []).forEach((pid) => assigned.add(pid)),
  );
  const missing = (attendingParticipants || []).filter((pid) => !assigned.has(pid));
  return { ok: missing.length === 0, missing };
};

export const useFloatingMissing = (rooms: { id: string }[]) => {
  const { floatingAssignments } = useSchedule();
  const missing = (rooms || [])
    .map((r) => r.id)
    .filter((id) => !floatingAssignments?.[id]);
  return { ok: missing.length === 0, missing };
};

export const useCleaningMissing = (chores: { id: string }[]) => {
  const { cleaningAssignments } = useSchedule();
  const missing = (chores || [])
    .map((c) => String(c.id))
    .filter((id) => !cleaningAssignments?.[id]);
  return { ok: missing.length === 0, missing };
};
