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

  // ✅ NEW: all of these are optional so we can safely call persistFinish
  // from different wizard shapes without exploding.
  assignments?: Record<ID, ID | null>;

  floatingAssignments?: {
    frontRoom: ID | null;
    scotty: ID | null;
    twins: ID | null;
  };

  cleaningAssignments?: Record<ID, ID | null>;

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

  // 🔁 NEW — recent snapshots (previous day / week) for cleaning fairness
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

  const staffById = new Map<ID, Staff>();
  staff.forEach((s) => staffById.set(s.id as ID, s));

  const participantById = new Map<ID, Participant>();
  participants.forEach((p) => participantById.set(p.id as ID, p));

  const workingSet = new Set<ID>(workingStaff);
  const attendingSet = new Set<ID>(attendingParticipants);

  const validPickup = pickupParticipants.filter((id) =>
    attendingSet.has(id as ID)
  );

  // ❗ helperStaff came in as ID[]; we only allow a single helper
  const firstHelper = helperStaff.length ? (helperStaff[0] as ID) : null;
  const validHelpers =
    firstHelper && workingSet.has(firstHelper as ID) ? firstHelper : null;

  // Clean team assignments by attendance + working staff
  const seededAssignments: Record<ID, ID | null> = {};
  for (const [partId, staffId] of Object.entries(assignments || {})) {
    if (!attendingSet.has(partId as ID)) continue;
    if (staffId && !workingSet.has(staffId as ID)) continue;
    seededAssignments[partId as ID] = (staffId as ID) || null;
  }

  // Dropoffs — normalize into structured assignments
  const cleanedDropoffs: Record<
    ID,
    { staffId: ID | null; locationId: ID | null } | null
  > = {};

  for (const [partId, locIds] of Object.entries(dropoffAssignments || {})) {
    if (!attendingSet.has(partId as ID)) continue;

    // For now we only support a single dropoff location per participant
    const locId = (locIds && locIds[0]) as ID | undefined;

    if (!locId) {
      cleanedDropoffs[partId as ID] = null;
      continue;
    }

    const exists = typeof dropoffLocations[locId as ID] === 'number';
    if (!exists) {
      cleanedDropoffs[partId as ID] = null;
      continue;
    }

    // Staff for dropoff is determined elsewhere (e.g. in dropoffs screen)
    cleanedDropoffs[partId as ID] = {
      staffId: null,
      locationId: locId as ID,
    };
  }

  // ───────────────────────────────────────────────
  // 🔥 CLEANING FAIRNESS LOGIC
  // ───────────────────────────────────────────────

  const chores =
    ((Data as any).CLEANING_TASKS as
      | { id: ID; label: string; slotId?: ID }[]
      | undefined) || [];

  const timeSlots =
    ((Data as any).TIME_SLOTS as { id: ID; label: string }[] | undefined) || [];

  const rooms =
    ((Data as any).FLOATING_ROOMS as
      | { id: ID; label: string; icon?: string }[]
      | undefined) || [];

  // Normalize cleaning assignments, ensuring only working staff are assigned
  const normalizedCleaning: Record<ID, ID | null> = {};
  for (const [staffId, choreId] of Object.entries(cleaningAssignments || {})) {
    if (!workingSet.has(staffId as ID)) continue;
    const validChore = chores.some((c: any) => c.id === choreId);
    if (!validChore) continue;
    if (!staffById.has(staffId as ID)) continue;
    normalizedCleaning[staffId as ID] = choreId as ID;
  }

  let finalCleaning = { ...normalizedCleaning };

  if (!Object.keys(finalCleaning).length && chores.length) {
    // 🔁 NEW — fairness based on recent history (previous day / week)
    const pool = (staff.filter((s) => workingSet.has(s.id as ID)) || staff) as Staff[];

    if (pool.length) {
      // Look at last up to 7 snapshots for fairness
      const history = (recentSnapshots || []).slice(-7);

      // For each chore, track how many times each staff has done it recently
      const historyByChore: Record<string, Record<ID, number>> = {};
      // Total cleaning load across all chores
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

      // Helper to get score for a (staff, chore)
      const getScore = (sid: ID, choreId: ID): number => {
        const choreHistory = historyByChore[choreId] || {};
        const timesOnThisChore = choreHistory[sid] ?? 0;
        const totalLoad = totalHistoryByStaff[sid] ?? 0;

        // Lower is better. We want:
        //  - staff who have done this chore fewer times
        //  - staff who have lower overall load
        return timesOnThisChore * 10 + totalLoad;
      };

      // For each chore, pick the best candidate
      const assignmentsForToday: Record<ID, ID | null> = {};
      const usedStaff = new Set<ID>();

      for (const chore of chores) {
        const choreId = chore.id;
        const candidates = pool.filter(
          (s) => !usedStaff.has(s.id as ID) && workingSet.has(s.id as ID)
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

      // Now flip it to Staff -> chore mapping (to match cleaningAssignments shape)
      const result: Record<ID, ID | null> = {};
      for (const [choreId, sid] of Object.entries(assignmentsForToday)) {
        if (!sid) continue;
        result[sid as ID] = choreId as ID;
      }

      finalCleaning = result;
    }
  }

  // ───────────────────────────────────────────────
  // 🔥 FLOATING FAIRNESS / ASSIGNMENT LOGIC
  // ───────────────────────────────────────────────

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

      // Prefer staff not already used in this timeslot
      let candidates = eligible.filter((s) => !usedThisSlot.has(s.id as ID));
      if (!candidates.length) {
        candidates = eligible;
      }

      // Avoid the same person being in the same room across consecutive slots
      candidates = candidates.filter((s) => !prevSlotStaff.has(s.id as ID));
      if (!candidates.length) {
        candidates = eligible;
      }

      // Pick the first candidate (could be randomized in future)
      const chosen = candidates[0];
      if (!chosen) continue;

      usedThisSlot.add(chosen.id as ID);
    }

    prevSlotStaff = usedThisSlot;
  }

  // ───────────────────────────────────────────────
  // 🔥 FINAL SNAPSHOT
  // ───────────────────────────────────────────────

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
    date: [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-'),
    meta: { from: 'create-wizard' },
  };

  await Promise.resolve(createSchedule(snapshot));
}
