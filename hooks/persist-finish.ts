import * as Data from '@/constants/data';
import type { Staff, Participant } from '@/constants/data';
import type { ID, ScheduleSnapshot } from './schedule-store';

export async function persistFinish(params: {
  createSchedule: (snapshot: ScheduleSnapshot) => Promise<void> | void;
  staff: Staff[];
  participants: Participant[];
  workingStaff: ID[];
  attendingParticipants: ID[];
  assignments?: Record<ID, ID[]>;
  floatingDraft?: Record<string, ID>;
  cleaningDraft?: Record<string, ID>;
  finalChecklistDraft?: Record<string, boolean>;
  finalChecklistStaff: ID;
  date?: string;
}) {
  const {
    createSchedule,
    staff,
    participants,
    workingStaff,
    attendingParticipants,
    assignments,
    floatingDraft,
    cleaningDraft,
    finalChecklistDraft,
    finalChecklistStaff,
    date,
  } = params;

  const seededFloating: Record<string, ID> =
    floatingDraft && Object.keys(floatingDraft).length
      ? floatingDraft
      : {};

  const seededCleaning: Record<string, ID> = (() => {
    if (cleaningDraft && Object.keys(cleaningDraft).length) return cleaningDraft;

    const chores = Data.DEFAULT_CHORES || [];
    const workers = workingStaff || [];
    if (!chores.length || !workers.length) return {};

    const out: Record<string, ID> = {};
    let i = 0;
    for (const chore of chores) {
      const id = String(chore.id);
      out[id] = workers[i % workers.length];
      i++;
    }
    return out;
  })();

  const seededChecklist: Record<string, boolean> = (() => {
    if (finalChecklistDraft && Object.keys(finalChecklistDraft).length) {
      return finalChecklistDraft;
    }
    const defs = Data.DEFAULT_CHECKLIST || [];
    const out: Record<string, boolean> = {};
    for (const c of defs || []) {
      out[String(c.id)] = false;
    }
    return out;
  })();

  const snapshot: ScheduleSnapshot = {
    staff,
    participants,
    workingStaff,
    attendingParticipants,
    assignments: assignments ?? {},
    floatingAssignments: seededFloating,
    cleaningAssignments: seededCleaning,
    finalChecklist: seededChecklist,
    finalChecklistStaff,
    date: date ?? new Date().toISOString(),
    meta: { from: 'create-wizard' },
  };

  await Promise.resolve(createSchedule(snapshot));
}
