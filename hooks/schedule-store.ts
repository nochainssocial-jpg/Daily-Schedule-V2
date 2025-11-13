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
  date: undefined,
  meta: undefined,
};

export const useSchedule = create<State>((set, get) => ({
  ...emptySnapshot,
  selectedDate: undefined,

  touch: (_key: string) => {
    // Reserved for future “dirty” tracking
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
