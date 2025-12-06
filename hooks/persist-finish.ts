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
  } = params;

  // Build maps for quick validation
  const staffMap = new Map<ID, Staff>();
  const participantMap = new Map<ID, Participant>();

  staff.forEach((s) => {
    if (!s || !s.id) return;
    staffMap.set(s.id as ID, s);
  });

  participants.forEach((p) => {
    if (!p || !p.id) return;
    participantMap.set(p.id as ID, p);
  });

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
    const staffId = sid as ID | null;

    // Participant must exist and be attending
    if (!participantMap.has(participantId) || !attendingSet.has(participantId)) {
      normalizedAssignments[participantId] = null;
      return;
    }

    // Staff must exist and be working
    if (!staffId || !staffMap.has(staffId) || !workingSet.has(staffId)) {
      normalizedAssignments[participantId] = null;
      return;
    }

    normalizedAssignments[participantId] = staffId;
  });

  // ---------------------------------------------------------------------------
  // FLOATING ASSIGNMENTS
  // ---------------------------------------------------------------------------

  const normalizedFloating: ScheduleSnapshot['floatingAssignments'] = {
    frontRoom: null,
    scotty: null,
    twins: null,
  };

  (['frontRoom', 'scotty', 'twins'] as const).forEach((key) => {
    const id = floatingAssignments?.[key] ?? null;
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

  const timeSlots =
    ((Data as any).TIME_SLOTS as { id: ID; label: string }[] | undefined) ||
    [];

  const rooms =
    ((Data as any).FLOATING_ROOMS as
      | { id: ID; label: string; icon?: string }[]
      | undefined) || [];

  // Start from any existing (manual) cleaning assignments that still make sense
  const baseCleaning: ScheduleSnapshot['cleaningAssignments'] = {};

  Object.entries(cleaningAssignments || {}).forEach(([sid, assignment]) => {
    const staffId = sid as ID;
    if (!assignment) return;
    if (!workingSet.has(staffId)) return;

    baseCleaning[staffId] = {
      slotId: assignment.slotId,
      label: assignment.label,
    };
  });

  // Fairness stats from recent snapshots
  const recentCleaningStats: Record<ID, number> = {};
  (recentSnapshots || []).forEach((snap) => {
    if (!snap || !snap.cleaningAssignments) return;
    Object.keys(snap.cleaningAssignments).forEach((sid) => {
      const staffId = sid as ID;
      recentCleaningStats[staffId] = (recentCleaningStats[staffId] ?? 0) + 1;
    });
  });

  const availableStaff = staff.filter((s) => workingSet.has(s.id as ID));

  type CleaningEntry = {
    choreId: ID;
    slotId: ID;
    label: string;
  };

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
        assigned.slotId === entry.slotId && assigned.label === entry.label,
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
      if (nextCleaning[sId]?.slotId === slotId) return false;
      return true;
    });

    if (!eligible.length) continue;

    // Sort by fairness (fewest recent chores first) then by name
    let candidates = eligible.slice().sort((a, b) => {
      const countA = recentCleaningStats[a.id as ID] ?? 0;
      const countB = recentCleaningStats[b.id as ID] ?? 0;
      if (countA !== countB) return countA - countB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    // Avoid giving the same slot to the same person repeatedly in this run
    candidates = candidates.filter((s) => !prevSlotStaff.has(s.id as ID));
    if (!candidates.length) {
      candidates = eligible;
    }

    const chosen = candidates[0];
    if (!chosen) continue;

    nextCleaning[chosen.id as ID] = {
      slotId: entry.slotId,
      label: entry.label,
    };

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

    const staffId = assignment.staffId as ID | null;
    const locationId = assignment.locationId;

    if (!participantMap.has(participantId) || !attendingSet.has(participantId)) {
      normalizedDropoffs[participantId] = null;
      return;
    }

    if (!staffId || !staffMap.has(staffId) || !workingSet.has(staffId)) {
      normalizedDropoffs[participantId] = null;
      return;
    }

    normalizedDropoffs[participantId] = {
      staffId,
      locationId,
    };
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

  // ---------------------------------------------------------------------------
  // FINAL SNAPSHOT
  // ---------------------------------------------------------------------------

  const now = new Date();

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
