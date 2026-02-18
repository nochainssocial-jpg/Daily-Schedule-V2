// hooks/persist-finish.ts
//
// Single place where we take everything the wizard collected and convert it
// into a canonical ScheduleSnapshot for the zustand store.

import * as Data from '@/constants/data';
import type { Staff, Participant } from '@/constants/data';
import type { ID, ScheduleSnapshot } from './schedule-store';

type PersistParams = {
  createSchedule: (snapshot: ScheduleSnapshot) => Promise<void> | void;

  staff: Staff[];
  participants: Participant[];

  workingStaff: ID[];
  attendingParticipants: ID[];

  trainingStaffToday?: ID[];

  // assignments: participantId -> staffId | null   (WIZARD → CANONICAL)
  assignments?: Record<ID, ID | null>;

  // floating: canonical slot → { twins, scotty, frontRoom }
  floatingAssignments?: ScheduleSnapshot['floatingAssignments'];

  // cleaning
  cleaningAssignments?: ScheduleSnapshot['cleaningAssignments'];
  cleaningBinsVariant?: ScheduleSnapshot['cleaningBinsVariant'];

  // helpers (staff IDs, not participant helper assignments)
  helperStaff?: ID[];

  // dropoffs: canonical participant → { staffId, locationId }
  dropoffAssignments?: ScheduleSnapshot['dropoffAssignments'];
  dropoffLocations?: ScheduleSnapshot['dropoffLocations'];

  // pickups
  pickupParticipants?: ID[];
  helperPickupStaff?: ID[];

  finalChecklist?: ScheduleSnapshot['finalChecklist'];

  // ❗ SINGLE STAFF ID, not array
  finalChecklistStaff?: ID;

  recentSnapshots?: ScheduleSnapshot[];
  chores?: { id: ID; name: string; slotId?: ID }[];

  date?: string;
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function findEveryoneStaffId(staff: Staff[]): ID | null {
  const everyone = staff.find(
    s => String(s.name).trim().toLowerCase() === 'everyone',
  );
  return everyone ? (String(everyone.id) as ID) : null;
}

function findParticipantByName(
  participants: Participant[],
  name: string,
): Participant | undefined {
  return participants.find(
    p => String(p.name).trim().toLowerCase() === name.trim().toLowerCase(),
  );
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------

export async function persistFinish(params: PersistParams) {
  const {
    createSchedule,

    staff = [],
    participants = [],

    workingStaff = [],
    attendingParticipants = [],

    trainingStaffToday = [],

    assignments = {},
    floatingAssignments = {},
    cleaningAssignments = {},
    cleaningBinsVariant = 0,

    helperStaff = [],

    dropoffAssignments = {},
    dropoffLocations = {},

    pickupParticipants = [],
    helperPickupStaff = [],

    finalChecklist = { isPrinted: false, isSigned: false },
    finalChecklistStaff = null,

    recentSnapshots = [],

    date,
  } = params;

  const now = new Date();

  const workingSet = new Set<ID>(workingStaff as ID[]);
  const attendingSet = new Set<ID>(attendingParticipants as ID[]);

  // ----------------------------------------------------------------------------
  // TEAM DAILY ASSIGNMENTS: participant → staffId  →  canonical staffId → [participants[]]
  // ----------------------------------------------------------------------------

  const assignmentsByStaff: Record<ID, ID[]> = {};

  Object.entries(assignments || {}).forEach(([pid, sid]) => {
    const participantId = pid as ID;
    const staffId = sid as ID | null;

    if (!attendingSet.has(participantId)) return;
    if (!staffId || !workingSet.has(staffId)) return;

    if (!assignmentsByStaff[staffId]) assignmentsByStaff[staffId] = [];
    if (!assignmentsByStaff[staffId].includes(participantId)) {
      assignmentsByStaff[staffId].push(participantId);
    }
  });

  // ----------------------------------------------------------------------------
  // FLOATING (already correct, just normalise IDs)
  // ----------------------------------------------------------------------------

  const normalizedFloating: ScheduleSnapshot['floatingAssignments'] = {};

  Object.entries(floatingAssignments || {}).forEach(([slot, obj]) => {
    const row: any = obj || {};

    const twins = row.twins && workingSet.has(row.twins) ? row.twins : null;
    const scotty = row.scotty && workingSet.has(row.scotty) ? row.scotty : null;
    const frontRoom =
      row.frontRoom && workingSet.has(row.frontRoom) ? row.frontRoom : null;

    normalizedFloating[slot as keyof ScheduleSnapshot['floatingAssignments']] = {
      twins,
      scotty,
      frontRoom,
    };
  });

  // ----------------------------------------------------------------------------
  // CLEANING — fairness engine (unchanged from your patched logic)
  // ----------------------------------------------------------------------------

  const chores = (params.chores && params.chores.length ? params.chores : (((Data as any).DEFAULT_CHORES as { id: ID; name: string; slotId?: ID }[]) || []));

  const nextCleaning: ScheduleSnapshot['cleaningAssignments'] = {
    ...(cleaningAssignments || {}),
  };

  const availableStaff = staff.filter(s => workingSet.has(s.id as ID));

  const staffChoreHistory: Record<ID, { count: number }> = {};
  availableStaff.forEach(s => {
    staffChoreHistory[s.id as ID] = { count: 0 };
  });

  recentSnapshots.forEach(snap => {
    Object.values(snap.cleaningAssignments || {}).forEach(staffId => {
      if (!staffId) return;
      if (!staffChoreHistory[staffId]) staffChoreHistory[staffId] = { count: 0 };
      staffChoreHistory[staffId].count += 1;
    });
  });

  const remaining = chores.filter(c => {
    const already = Object.values(nextCleaning).includes(c.id);
    return !already;
  });

  remaining.sort((a, b) => a.name.localeCompare(b.name));

  let prevSlot = new Set<ID>();

  remaining.forEach(entry => {
    const slot = entry.slotId ?? entry.id;

    let eligible = availableStaff.filter(s => !prevSlot.has(s.id as ID));

    if (!eligible.length) {
      prevSlot = new Set();
      eligible = availableStaff;
    }

    eligible.sort((a, b) => {
      const aC = staffChoreHistory[a.id].count;
      const bC = staffChoreHistory[b.id].count;
      if (aC !== bC) return aC - bC;
      return a.name.localeCompare(b.name);
    });

    const chosen = eligible[0];
    nextCleaning[entry.id] = chosen.id as ID;

    prevSlot.add(chosen.id as ID);
  });

  // ----------------------------------------------------------------------------
  // DROP-OFFS — FIXED (helpers included, no double helperSet, participant keyed)
  // ----------------------------------------------------------------------------

  const helperSet = new Set<ID>(helperStaff as ID[]);

  const normalizedDropoffs: ScheduleSnapshot['dropoffAssignments'] = {};
  const normalizedDropoffLocations: ScheduleSnapshot['dropoffLocations'] = {};

  Object.entries(dropoffAssignments || {}).forEach(([participantId, entry]) => {
    const pid = participantId as ID;

    if (!attendingSet.has(pid)) {
      normalizedDropoffs[pid] = null;
      return;
    }

    if (!entry) {
      normalizedDropoffs[pid] = null;
      return;
    }

    const staffId = entry.staffId as ID | null;
    const locationId =
      typeof entry.locationId === 'number' ? entry.locationId : null;

    const allowedOwner =
      staffId &&
      (workingSet.has(staffId as ID) || helperSet.has(staffId as ID))
        ? staffId
        : null;

    normalizedDropoffs[pid] = { staffId: allowedOwner, locationId };

    if (locationId !== null) {
      normalizedDropoffLocations[pid] = locationId;
    }
  });

  // ----------------------------------------------------------------------------
  // PICKUPS & helperPickupStaff
  // ----------------------------------------------------------------------------

  const validPickupParticipants = (pickupParticipants || []).filter(pid =>
    attendingSet.has(pid),
  ) as ID[];

  const validHelperPickupStaff = (helperPickupStaff || []).filter(sid =>
    workingSet.has(sid),
  ) as ID[];

  // ----------------------------------------------------------------------------
  // BASE SNAPSHOT
  // ----------------------------------------------------------------------------

  const snapshot: ScheduleSnapshot = {
    staff,
    participants,

    workingStaff,
    attendingParticipants,

    trainingStaffToday: [...new Set(trainingStaffToday)],

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
    finalChecklistStaff: finalChecklistStaff ?? null,

    outingGroup: null,

    date:
      date ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(now.getDate()).padStart(2, '0')}`,

    meta: {
      from: 'create-wizard',
      version: 2,
    },
  };

  // ----------------------------------------------------------------------------
  // SPECIAL RULE — Twins auto-assign to Everyone
  // ----------------------------------------------------------------------------

  const everyoneId = findEveryoneStaffId(staff);
  if (everyoneId) {
    const zara = findParticipantByName(participants, 'Zara');
    const zoya = findParticipantByName(participants, 'Zoya');

    const ensure = (p?: Participant) => {
      if (!p) return;
      const pid = p.id as ID;
      if (!attendingSet.has(pid)) return;

      if (!snapshot.assignments[everyoneId]) {
        snapshot.assignments[everyoneId] = [];
      }
      if (!snapshot.assignments[everyoneId].includes(pid)) {
        snapshot.assignments[everyoneId].push(pid);
      }
    };

    ensure(zara);
    ensure(zoya);
  }

  // ----------------------------------------------------------------------------

  await Promise.resolve(createSchedule(snapshot));
}
