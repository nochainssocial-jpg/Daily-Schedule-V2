// hooks/persist-finish.ts
//
// Single place where we take everything the wizard collected and turn it into
// a ScheduleSnapshot for the zustand store.

import * as Data from '@/constants/data';
import type { Staff, Participant } from '@/constants/data';
import type { ID, ScheduleSnapshot } from './schedule-store';

type PersistParams = {
  createSchedule: (snapshot: ScheduleSnapshot) => Promise<void> | void;

  staff: Staff[];
  participants: Participant[];

  workingStaff: ID[];
  attendingParticipants: ID[];

  // Staff explicitly marked as "training today" (no own assignments)
  trainingStaffToday?: ID[];

  // assignments: participant ID -> staff ID
  assignments?: Record<ID, ID | null>;

  // floating room assignments
  floatingAssignments?: {
    frontRoom: ID | null;
    scotty: ID | null;
    twins: ID | null;
  };

  // cleaning assignments: staff ID -> { slotId, label }
  cleaningAssignments?: ScheduleSnapshot['cleaningAssignments'];

  // Special bins variant for "Take the bins out" task
  // 0 = default, 1 = red + yellow, 2 = red + green, 3 = bring in & clean
  cleaningBinsVariant?: ScheduleSnapshot['cleaningBinsVariant'];

  // helper staff
  helperStaff?: ID | null;

  // dropoffs
  dropoffAssignments?: ScheduleSnapshot['dropoffAssignments'];
  dropoffLocations?: ScheduleSnapshot['dropoffLocations'];

  // pickups / helpers / dropoffs (participants)
  pickupParticipants?: ID[];
  helperPickupStaff?: ID[];

  // final checklist
  finalChecklist?: ScheduleSnapshot['finalChecklist'];
  finalChecklistStaff?: ID[];

  // prior snapshots for cleaning fairness
  recentSnapshots?: ScheduleSnapshot[];

  // explicit schedule date (optional; we overwrite with "today" below)
  date?: string;
};

export async function persistFinish(params: PersistParams) {
  const {
    createSchedule,

    staff = [],
    participants = [],

    workingStaff = [],
    attendingParticipants = [],

    trainingStaffToday = [],

    assignments = {},
    floatingAssignments = {
      frontRoom: null,
      scotty: null,
      twins: null,
    },

    cleaningAssignments = {},
    cleaningBinsVariant = 0,
    helperStaff = null,

    dropoffAssignments = {},
    dropoffLocations = {},

    pickupParticipants = [],
    helperPickupStaff = [],

    finalChecklist = {
      isPrinted: false,
      isSigned: false,
    },
    finalChecklistStaff = [],

    recentSnapshots = [],

    date,
  } = params;

  const now = new Date();

  const staffMap = new Map<ID, Staff>(
    (staff || []).map((s) => [s.id as ID, s]),
  );

  const workingSet = new Set<ID>(
    (workingStaff && workingStaff.length ? workingStaff : staff.map((s) => s.id)) as ID[],
  );

  const attendingSet = new Set<ID>(attendingParticipants as ID[]);

  // ---------------------------------------------------------------------------
  // TEAM DAILY ASSIGNMENTS (participant -> staff)
  // ---------------------------------------------------------------------------

  const normalizedAssignments: Record<ID, ID | null> = {};

  Object.entries(assignments || {}).forEach(([pid, sid]) => {
    const participantId = pid as ID;
    const staffId = (sid || null) as ID | null;

    if (!attendingSet.has(participantId)) {
      normalizedAssignments[participantId] = null;
      return;
    }

    if (staffId && workingSet.has(staffId)) {
      normalizedAssignments[participantId] = staffId;
    } else {
      normalizedAssignments[participantId] = null;
    }
  });

  // ---------------------------------------------------------------------------
  // FLOATING
  // ---------------------------------------------------------------------------

  const normalizedFloating: ScheduleSnapshot['floatingAssignments'] = {
    frontRoom: null,
    scotty: null,
    twins: null,
  };

  Object.entries(floatingAssignments || {}).forEach(([roomKey, value]) => {
    const key = roomKey as keyof ScheduleSnapshot['floatingAssignments'];
    const id = (value || null) as ID | null;

    if (id && staffMap.has(id) && workingSet.has(id)) {
      normalizedFloating[key] = id;
    } else {
      normalizedFloating[key] = null;
    }
  });

  // ---------------------------------------------------------------------------
  // CLEANING – fairness based on recent snapshots
  // ---------------------------------------------------------------------------

  const chores =
    ((Data as any).DEFAULT_CHORES as
      | { id: ID; name: string; slotId?: ID }[]
      | undefined) || [];

  type CleaningEntry = {
    choreId: ID;
    slotId: ID;
    label: string;
  };

  const baseCleaning: ScheduleSnapshot['cleaningAssignments'] = {
    ...(cleaningAssignments || {}),
  };

  const availableStaff: Staff[] = (staff || []).filter((s) =>
    workingSet.has(s.id as ID),
  );

  const staffChoreHistory: Record<ID, { count: number }> = {};
  availableStaff.forEach((s) => {
    staffChoreHistory[s.id as ID] = { count: 0 };
  });

  (recentSnapshots || []).forEach((snap) => {
    const snapCleaning = snap.cleaningAssignments || {};
    Object.values(snapCleaning).forEach((sid) => {
      if (!sid) return;
      if (!staffChoreHistory[sid as ID]) {
        staffChoreHistory[sid as ID] = { count: 0 };
      }
      staffChoreHistory[sid as ID].count += 1;
    });
  });

  const choresToAssign: CleaningEntry[] = chores.map((c) => ({
    choreId: c.id as ID,
    slotId: (c.slotId ?? c.id) as ID,
    label: c.name,
  }));

  const nextCleaning: ScheduleSnapshot['cleaningAssignments'] = { ...baseCleaning };

  const remainingAssignments: CleaningEntry[] = [];

  choresToAssign.forEach((entry) => {
    const alreadyAssigned = Object.values(nextCleaning).some(
      (assigned) =>
        !!assigned &&
        assigned === entry.choreId,
    );
    if (!alreadyAssigned) {
      remainingAssignments.push(entry);
    }
  });

  remainingAssignments.sort((a, b) => a.label.localeCompare(b.label));

  let prevSlotStaff: Set<ID> = new Set();

  for (const entry of remainingAssignments) {
    const slotId = entry.slotId;

    const eligible = availableStaff.filter((s) => {
      const sId = s.id as ID;
      if (!workingSet.has(sId)) return false;
      if (prevSlotStaff.has(sId)) return false;
      return true;
    });

    if (!eligible.length) {
      prevSlotStaff = new Set();
      eligible.push(...availableStaff);
    }

    if (!eligible.length) {
      nextCleaning[entry.choreId] = null;
      continue;
    }

    eligible.sort((a, b) => {
      const aCount = staffChoreHistory[a.id as ID]?.count ?? 0;
      const bCount = staffChoreHistory[b.id as ID]?.count ?? 0;
      if (aCount !== bCount) return aCount - bCount;
      return (a.name || '').localeCompare(b.name || '');
    });

    const chosen = eligible[0];
    nextCleaning[entry.choreId] = chosen.id as ID;
    prevSlotStaff = new Set([...prevSlotStaff, chosen.id as ID]);
  }

  // ---------------------------------------------------------------------------
  // DROPOFFS
  // ---------------------------------------------------------------------------

  const normalizedDropoffs: ScheduleSnapshot['dropoffAssignments'] = {};

  Object.entries(dropoffAssignments || {}).forEach(([pid, assignment]) => {
    const participantId = pid as ID;

    if (!assignment) {
      normalizedDropoffs[participantId] = null;
      return;
    }

    const staffId = (assignment as any).staffId as ID | null;
    const locationId =
      typeof (assignment as any).locationId === 'number'
        ? (assignment as any).locationId
        : null;

    if (!attendingSet.has(participantId)) {
      normalizedDropoffs[participantId] = null;
      return;
    }

    if (staffId && workingSet.has(staffId)) {
      normalizedDropoffs[participantId] = { staffId, locationId };
    } else {
      normalizedDropoffs[participantId] = { staffId: null, locationId };
    }
  });

  const normalizedDropoffLocations: ScheduleSnapshot['dropoffLocations'] = {
    ...(dropoffLocations || {}),
  };

  // ---------------------------------------------------------------------------
  // PICKUPS & HELPERS (participants)
  // ---------------------------------------------------------------------------

  const validPickupParticipants = (pickupParticipants || []).filter((id) =>
    attendingSet.has(id as ID),
  ) as ID[];

  const validHelperPickupStaff = (helperPickupStaff || []).filter((id) =>
    workingSet.has(id as ID),
  ) as ID[];

  const snapshot: ScheduleSnapshot = {
    staff,
    participants,
    workingStaff,
    attendingParticipants,

    // ✅ Persist training flags
    trainingStaffToday: Array.from(new Set(trainingStaffToday as ID[])),

    assignments: normalizedAssignments,
    floatingAssignments: normalizedFloating,

    cleaningAssignments: nextCleaning,
    cleaningBinsVariant: cleaningBinsVariant ?? 0,

    helperStaff: helperStaff ?? null,

    dropoffAssignments: normalizedDropoffs,
    dropoffLocations: normalizedDropoffLocations,

    pickupParticipants: validPickupParticipants,
    helperPickupStaff: validHelperPickupStaff,

    finalChecklist,
    finalChecklistStaff,

    outingGroup: null,

    // Use local calendar date for the schedule (today)
    date: [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-'),

    meta: { from: 'create-wizard' },
  };

  await Promise.resolve(createSchedule(snapshot));
}
