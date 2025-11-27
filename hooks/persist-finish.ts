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

  const now = new Date();

  // ---------- Normalise staff / participants ----------
  const staffById = new Map<ID, Staff>(staff.map((s) => [s.id as ID, s]));
  const participantsById = new Map<ID, Participant>(
    participants.map((p) => [p.id as ID, p]),
  );

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

  for (const [partId, locIds] of Object.entries(dropoffAssignments || {})) {
    if (!attendingSet.has(partId as ID)) continue;

    const cleanedLocs = (locIds || []).filter(
      (locId) => typeof dropoffLocations[locId as ID] === 'number',
    ) as ID[];

    if (!cleanedLocs.length) continue;

    cleanedDropoffs[partId as ID] = cleanedLocs;
  }

  // ---------- CLEANING FAIRNESS ----------
  const chores =
    ((Data as any).CLEANING_TASKS as
      | { id: ID; label: string; slotId?: ID }[]
      | undefined) || [];

  const timeSlots =
    ((Data as any).TIME_SLOTS as { id: ID; label: string }[] | undefined) ||
    [];

  const rooms =
    ((Data as any).FLOATING_ROOMS as
      | { id: ID; label: string; icon?: string }[]
      | undefined) || [];

  const normalizedCleaning: Record<ID, ID> = {};
  for (const [choreId, staffId] of Object.entries(cleaningAssignments || {})) {
    if (!staffById.has(staffId as ID)) continue;
    const validChore = chores.some((c: any) => c.id === choreId);
    if (!validChore) continue;
    normalizedCleaning[choreId as ID] = staffId as ID;
  }

  let finalCleaning: Record<ID, ID> = { ...normalizedCleaning };

  if (!Object.keys(finalCleaning).length && chores.length) {
    const pool = (staff.filter((s) => workingSet.has(s.id as ID)) || staff) as Staff[];

    if (pool.length) {
      const history = (recentSnapshots || []).slice(-7);

      const historyByChore: Record<string, Record<ID, number>> = {};
      const totalHistoryByStaff: Record<ID, number> = {};

      for (const snap of history) {
        const ca = (snap as any).cleaningAssignments as
          | Record<string, ID>
          | undefined;
        if (!ca) continue;

        for (const [choreId, staffId] of Object.entries(ca)) {
          const sid = staffId as ID;

          totalHistoryByStaff[sid] = (totalHistoryByStaff[sid] ?? 0) + 1;

          if (!historyByChore[choreId]) {
            historyByChore[choreId] = {};
          }
          historyByChore[choreId][sid] =
            (historyByChore[choreId][sid] ?? 0) + 1;
        }
      }

      const getScore = (sid: ID, choreId: ID): number => {
        const choreHistory = historyByChore[choreId] || {};
        const timesOnThisChore = choreHistory[sid] ?? 0;
        const totalLoad = totalHistoryByStaff[sid] ?? 0;

        return timesOnThisChore * 10 + totalLoad;
      };

      const assignmentsForToday: Record<ID, ID | null> = {};
      const usedStaff = new Set<ID>();

      for (const chore of chores) {
        const choreId = chore.id;
        const candidates = pool.filter(
          (s) => !usedStaff.has(s.id as ID) && workingSet.has(s.id as ID),
        );

        if (!candidates.length) {
          assignmentsForToday[choreId] = null;
          continue;
        }

        let best: Staff | null = null;
        let bestScore = Infinity;

        for (const s of candidates) {
          const sid = s.id as ID;
          const score = getScore(sid, choreId);

          if (score < bestScore) {
            bestScore = score;
            best = s;
          }
        }

        if (best) {
          const sid = best.id as ID;
          assignmentsForToday[choreId] = sid;
          usedStaff.add(sid);
        } else {
          assignmentsForToday[choreId] = null;
        }
      }

      const result: Record<ID, ID> = {};
      for (const [choreId, sid] of Object.entries(assignmentsForToday)) {
        if (!sid) continue;
        result[choreId as ID] = sid as ID;
      }

      finalCleaning = result;
    }
  }

  // ---------- FLOATING FAIRNESS ----------
  const floatingPool =
    (staff.filter((s) => workingSet.has(s.id as ID)) || staff) as Staff[];

  const fsoSlotIds: ID[] = ((Data as any).TWIN_FSO_TIME_SLOT_IDS ||
    []) as ID[];

  let prevSlotStaff = new Set<ID>();

  for (const slot of timeSlots) {
    const usedThisSlot = new Set<ID>();

    for (const room of rooms) {
      let eligible = floatingPool;

      const isTwinsRoom = room.id === ('twins' as ID);
      const isTwinsFSO =
        isTwinsRoom && fsoSlotIds.length && fsoSlotIds.includes(slot.id);

      if (isTwinsFSO) {
        const females = floatingPool.filter((s) => s.gender === 'female');
        if (females.length) {
          eligible = females;
        }
      }

      if (!eligible.length) {
        continue;
      }

      let candidates = eligible.filter((s) => !usedThisSlot.has(s.id as ID));
      if (!candidates.length) {
        candidates = eligible;
      }

      candidates = candidates.filter((s) => !prevSlotStaff.has(s.id as ID));
      if (!candidates.length) {
        candidates = eligible;
      }

      const chosen = candidates[0];
      if (!chosen) continue;

      usedThisSlot.add(chosen.id as ID);
    }

    prevSlotStaff = usedThisSlot;
  }

  const snapshot: ScheduleSnapshot = {
    staff,
    participants,
    workingStaff,
    attendingParticipants,

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
