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

  // assignments: participant ID -> staff ID (wizard view)
  assignments?: Record<ID, ID | null>;

  // floating room assignments
  floatingAssignments?: ScheduleSnapshot['floatingAssignments'];

  // cleaning assignments: choreId -> staffId
  cleaningAssignments?: ScheduleSnapshot['cleaningAssignments'];

  // Special bins variant for "Take the bins out" task
  // 0 = default, 1 = red + yellow, 2 = red + green, 3 = bring in & clean
  cleaningBinsVariant?: ScheduleSnapshot['cleaningBinsVariant'];

  // helper staff (can be multiple helpers, not just one)
  helperStaff?: ID[];

  // dropoffs (wizard view; can be legacy participant-centric or new staff-centric)
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

// Small helper: find "Everyone" staff entry
function findEveryoneStaffId(staff: Staff[]): ID | null {
  const everyone = staff.find(
    (s) => String(s.name).trim().toLowerCase() === 'everyone',
  );
  return everyone ? (String(everyone.id) as ID) : null;
}

// Small helper: find participant by exact name
function findParticipantByName(
  participants: Participant[],
  name: string,
): Participant | undefined {
  return participants.find((p) => String(p.name).trim() === name);
}

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
    helperStaff = [],

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
    (workingStaff && workingStaff.length
      ? workingStaff
      : staff.map((s) => s.id)) as ID[],
  );

  const attendingSet = new Set<ID>(attendingParticipants as ID[]);

  // ---------------------------------------------------------------------------
  // TEAM DAILY ASSIGNMENTS
  //
  // Wizard collects: participantId -> staffId
  // Canonical storage: staffId -> participantIds[]
  // ---------------------------------------------------------------------------

  const assignmentsByStaff: Record<ID, ID[]> = {};

  Object.entries(assignments || {}).forEach(([pid, sid]) => {
    const participantId = pid as ID;
    const staffId = (sid || null) as ID | null;

    // Only keep assignments for attending participants
    if (!attendingSet.has(participantId)) {
      return;
    }

    // Only keep assignments for staff actually working today
    if (!staffId || !workingSet.has(staffId)) {
      return;
    }

    const key = staffId as ID;
    if (!assignmentsByStaff[key]) assignmentsByStaff[key] = [];
    if (!assignmentsByStaff[key].includes(participantId)) {
      assignmentsByStaff[key].push(participantId);
    }
  });

  // ---------------------------------------------------------------------------
  // FLOATING
  // ---------------------------------------------------------------------------

  const normalizedFloating: ScheduleSnapshot['floatingAssignments'] = {};

  Object.entries(floatingAssignments || {}).forEach(([slotKey, value]) => {
    // Floating assignments are already in the canonical "slot -> { twins, scotty, frontRoom }" form.
    // We only need to ensure the staff IDs inside are valid working staff.
    const slot = slotKey as keyof ScheduleSnapshot['floatingAssignments'];
    const entry: any = value || {};

    const twinsId =
      entry.twins && workingSet.has(entry.twins as ID)
        ? (entry.twins as ID)
        : null;
    const scottyId =
      entry.scotty && workingSet.has(entry.scotty as ID)
        ? (entry.scotty as ID)
        : null;
    const frontRoomId =
      entry.frontRoom && workingSet.has(entry.frontRoom as ID)
        ? (entry.frontRoom as ID)
        : null;

    normalizedFloating[slot] = {
      twins: twinsId,
      scotty: scottyId,
      frontRoom: frontRoomId,
    };
  });

  // ---------------------------------------------------------------------------
  // CLEANING – fairness based on recent snapshots
  // (participantId -> staffId | null)
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
      (assigned) => !!assigned && assigned === entry.choreId,
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
    // Set of helper staff (for dropoffs only – not treated as working @ B2)
  const helperSet = new Set<ID>((helperStaff || []) as ID[]);

  // ---------------------------------------------------------------------------
  // DROPOFFS
  // ---------------------------------------------------------------------------

  const normalizedDropoffs: ScheduleSnapshot['dropoffAssignments'] = {};

  // Staff allowed to own dropoffs = working @ B2 + helpers
  const dropoffStaffSet = new Set<ID>([
    ...Array.from(workingSet),
    ...Array.from(helperSet),
  ]);

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

    // If participant is not attending, drop the assignment entirely
    if (!attendingSet.has(participantId)) {
      normalizedDropoffs[participantId] = null;
      return;
    }

    // Only keep staffId if they’re a valid dropoff owner (B2 worker or helper)
    if (staffId && dropoffStaffSet.has(staffId)) {
      normalizedDropoffs[participantId] = { staffId, locationId };
    } else {
      normalizedDropoffs[participantId] = { staffId: null, locationId };
    }
  });

  // ---------------------------------------------------------------------------
  // PICKUPS & HELPERS (participants)
  // ---------------------------------------------------------------------------

  const validPickupParticipants = (pickupParticipants || []).filter((id) =>
    attendingSet.has(id as ID),
  ) as ID[];

  const validHelperPickupStaff = (helperPickupStaff || []).filter((id) =>
    workingSet.has(id as ID),
  ) as ID[];

  // Merge helperStaff (single or array) with helperPickupStaff into a single array
  const mergedHelperStaffIds = new Set<ID>();

  if (Array.isArray(helperStaff)) {
    helperStaff.forEach((id) => {
      const sid = id as ID;
      if (workingSet.has(sid)) mergedHelperStaffIds.add(sid);
    });
  } else if (helperStaff) {
    const sid = helperStaff as ID;
    if (workingSet.has(sid)) mergedHelperStaffIds.add(sid);
  }

  validHelperPickupStaff.forEach((id) => {
    const sid = id as ID;
    if (workingSet.has(sid)) mergedHelperStaffIds.add(sid);
  });

  const finalHelperStaff: ID[] = Array.from(mergedHelperStaffIds);

  // ---------------------------------------------------------------------------
  // BASE SNAPSHOT (before special rules like twins)
  // ---------------------------------------------------------------------------

  const snapshot: ScheduleSnapshot = {
    staff,
    participants,
    workingStaff,
    attendingParticipants,

    // Persist training flags
    trainingStaffToday: Array.from(new Set(trainingStaffToday as ID[])),

    // Canonical daily assignments: staffId -> participantIds[]
    assignments: assignmentsByStaff,
    floatingAssignments: normalizedFloating,

    cleaningAssignments: nextCleaning,
    cleaningBinsVariant: cleaningBinsVariant ?? 0,

    helperStaff: Array.from(helperSet),

    dropoffAssignments: normalizedDropoffs,
    dropoffLocations: normalizedDropoffLocations,

    pickupParticipants: validPickupParticipants,
    helperPickupStaff: validHelperPickupStaff,

    finalChecklist,
    finalChecklistStaff,

    outingGroup: null, // Outings are generally created in Edit Hub

    // Use local calendar date for the schedule (today)
    date:
      date ||
      [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-'),

    meta: {
      from: 'create-wizard',
      version: 2,
    },
  };

  // ---------------------------------------------------------------------------
  // SPECIAL RULE: Twins auto-assigned to "Everyone"
  //
  // If Zara or Zoya is attending today, ensure they are included in
  // assignments[everyoneId] alongside existing participants.
  // ---------------------------------------------------------------------------

  const everyoneId = findEveryoneStaffId(staff);
  if (everyoneId) {
    const zara = findParticipantByName(participants, 'Zara');
    const zoya = findParticipantByName(participants, 'Zoya');

    const ensureTwin = (p?: Participant) => {
      if (!p) return;
      const pid = String(p.id) as ID;
      if (!attendingSet.has(pid)) return;

      if (!snapshot.assignments[everyoneId]) {
        snapshot.assignments[everyoneId] = [];
      }

      if (!snapshot.assignments[everyoneId].includes(pid)) {
        snapshot.assignments[everyoneId].push(pid);
      }
    };

    ensureTwin(zara);
    ensureTwin(zoya);
  }

  await Promise.resolve(createSchedule(snapshot));
}
