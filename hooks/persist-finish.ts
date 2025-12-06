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

  // assignments: staff ID -> array of participant IDs (team daily assignments)
  assignments?: Record<ID, ID[]>;

  // floating room assignments (front room, Scotty, twins)
  floatingAssignments?: {
    frontRoom: ID | null;
    scotty: ID | null;
    twins: ID | null;
  };

  // cleaning assignments: chore ID -> staff ID
  cleaningAssignments?: Record<ID, ID>;

  finalChecklist?: {
    isPrinted: boolean;
    isSigned: boolean;
  };

  finalChecklistStaff?: ID[];

  pickupParticipants?: ID[];
  helperStaff?: ID[];
  dropoffAssignments?: Record<ID, ID[]>;
  dropoffLocations?: Record<ID, number>;

  date?: string;

  recentSnapshots?: ScheduleSnapshot[];
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
    finalChecklist = {
      isPrinted: false,
      isSigned: false,
    },
    finalChecklistStaff = [],
    pickupParticipants = [],
    helperStaff = [],
    dropoffAssignments = {},
    dropoffLocations = {},
    date,
    recentSnapshots = [],
  } = params;

  const staffById = new Map<ID, Staff>();
  const participantsById = new Map<ID, Participant>();

  staff.forEach((s) => {
    if (!s || !s.id) return;
    staffById.set(s.id as ID, s);
  });

  participants.forEach((p) => {
    if (!p || !p.id) return;
    participantsById.set(p.id as ID, p);
  });

  // Ensure workingStaff is always non-empty; fallback to "everyone" if it's empty
  const workingSet = new Set<ID>(
    (workingStaff && workingStaff.length
      ? workingStaff
      : staff.map((s) => s.id)) as ID[],
  );

  const attendingSet = new Set<ID>(attendingParticipants as ID[]);

  // ---------- TEAM DAILY ASSIGNMENTS ----------
  const seededAssignments: Record<ID, ID[]> = {};

  if (assignments) {
    for (const [sid, partIds] of Object.entries(assignments)) {
      if (!staffById.has(sid as ID)) continue;
      const cleaned = (partIds || []).filter(
        (pid) => participantsById.has(pid as ID) && attendingSet.has(pid as ID),
      ) as ID[];
      if (cleaned.length) {
        seededAssignments[sid as ID] = cleaned;
      }
    }
  }

  // ---------- PICKUPS & HELPERS ----------
  const validPickup = pickupParticipants.filter((id) =>
    attendingSet.has(id as ID),
  );

  const validHelpers = (helperStaff || []).filter((id) =>
    workingSet.has(id as ID),
  ) as ID[];

  // ---------- DROPOFFS ----------
  const cleanedDropoffs: Record<ID, ID[]> = {};
  for (const [staffId, pids] of Object.entries(dropoffAssignments || {})) {
    if (!workingSet.has(staffId as ID)) continue;
    const cleanedPids = (pids || []).filter((pid) =>
      attendingSet.has(pid as ID),
    ) as ID[];

    if (!cleanedPids.length) continue;

    cleanedDropoffs[staffId as ID] = cleanedPids;
  }

  // ---------- CLEANING FAIRNESS ----------
  const chores =
    ((Data as any).DEFAULT_CHORES as
      | { id: ID; name: string; slotId?: ID }[]
      | undefined) || [];

  const nextCleaning: ScheduleSnapshot['cleaningAssignments'] = {};

  // Bring in any existing cleaning assignments that still make sense
  if (cleaningAssignments && Object.keys(cleaningAssignments).length > 0) {
    for (const [choreId, staffId] of Object.entries(cleaningAssignments)) {
      if (!staffId) continue;
      if (!workingSet.has(staffId as ID)) continue;
      const choreStillExists = chores.some((c) => c.id === choreId);
      if (!choreStillExists) continue;

      nextCleaning[staffId as ID] = {
        slotId: chores.find((c) => c.id === choreId)?.slotId ?? choreId,
        label:
          chores.find((c) => c.id === choreId)?.name ??
          (choreId as unknown as string),
      };
    }
  }

  // Auto-fill any missing chores in a fairness-aware way based on recentSnapshots
  const recent = recentSnapshots || [];
  const recentCleaningStats: Record<ID, number> = {};

  for (const snap of recent) {
    if (!snap || !snap.cleaningAssignments) continue;
    for (const [staffId, assignment] of Object.entries(
      snap.cleaningAssignments,
    )) {
      if (!assignment) continue;
      const current = recentCleaningStats[staffId as ID] ?? 0;
      recentCleaningStats[staffId as ID] = current + 1;
    }
  }

  const availableStaff = staff.filter((s) =>
    workingSet.has(s.id as ID),
  ) as Staff[];

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

  const finalCleaning: ScheduleSnapshot['cleaningAssignments'] = {
    ...nextCleaning,
  };

  let prevSlotStaff: Set<ID> = new Set();

  for (const entry of remainingAssignments) {
    const slotId = entry.slotId;
    const eligible = availableStaff.filter((s) => {
      const sId = s.id as ID;
      if (!workingSet.has(sId)) return false;
      if (finalCleaning[sId]?.slotId === slotId) return false;
      return true;
    });

    if (!eligible.length) continue;

    let candidates = eligible.slice().sort((a, b) => {
      const countA = recentCleaningStats[a.id as ID] ?? 0;
      const countB = recentCleaningStats[b.id as ID] ?? 0;
      if (countA !== countB) return countA - countB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    candidates = candidates.filter((s) => !prevSlotStaff.has(s.id as ID));
    if (!candidates.length) {
      candidates = eligible;
    }

    const chosen = candidates[0];
    if (!chosen) continue;

    finalCleaning[chosen.id as ID] = {
      slotId: entry.slotId,
      label: entry.label,
    };

    prevSlotStaff = new Set([...prevSlotStaff, chosen.id as ID]);
  }

  // ---------- FINAL SNAPSHOT ----------
  const now = new Date();

  const snapshot: ScheduleSnapshot = {
    staff,
    participants,
    workingStaff,
    attendingParticipants,
    trainingStaffToday,

    assignments: seededAssignments,
    floatingAssignments,
    cleaningAssignments: finalCleaning,

    finalChecklist,
    finalChecklistStaff,

    pickupParticipants: validPickup,
    helperStaff: validHelpers,
    dropoffAssignments: cleanedDropoffs,
    dropoffLocations: dropoffLocations || {},

    outingGroup: null,

    // Use local calendar date for the schedule
    // ⬇️ ONLY CHANGE: always stamp today instead of reusing old `date`
    date: [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-'),
    meta: { from: 'create-wizard' },
  };

  await Promise.resolve(createSchedule(snapshot));
}
