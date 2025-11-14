// hooks/persist-finish.ts
import * as Data from '@/constants/data';
import type { Staff, Participant } from '@/constants/data';
import type { ID, ScheduleSnapshot } from './schedule-store';

type PersistParams = {
  createSchedule: (snapshot: ScheduleSnapshot) => Promise<void> | void;
  staff: Staff[];
  participants: Participant[];
  workingStaff: ID[];
  attendingParticipants: ID[];

  // From the wizard
  assignments?: Record<ID, ID[]>;

  // Optional drafts (not heavily used yet, but kept for compatibility)
  floatingDraft?: Record<string, ID>;
  cleaningDraft?: Record<string, ID>;
  finalChecklistDraft?: Record<string, boolean>;

  finalChecklistStaff: ID;

  // NEW transport fields
  pickupParticipants?: ID[];
  helperStaff?: ID[];
  dropoffAssignments?: Record<ID, ID[]>;

  date?: string;
};

export async function persistFinish(params: PersistParams) {
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
    pickupParticipants = [],
    helperStaff = [],
    dropoffAssignments = {},
    date,
  } = params;

  // ---------- Normalise staff / participants ----------
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const participantsById = new Map(participants.map((p) => [p.id, p]));

  const workingSet = new Set<ID>(
    (workingStaff && workingStaff.length ? workingStaff : staff.map((s) => s.id)) as ID[],
  );

  // ---------- Seed TEAM DAILY ASSIGNMENTS ----------
  const seededAssignments: Record<ID, ID[]> = {};

  if (assignments) {
    // Clean up any stray IDs and keep only attending participants
    for (const [staffId, partIds] of Object.entries(assignments)) {
      const validStaff = staffById.has(staffId as ID);
      if (!validStaff) continue;
      const filtered = (partIds || []).filter(
        (pid) => participantsById.has(pid as ID) && attendingParticipants.includes(pid as ID),
      ) as ID[];
      if (filtered.length) {
        seededAssignments[staffId as ID] = filtered;
      }
    }
  }

  // If nothing came through, fall back to simple round‑robin across the Dream Team
  if (!Object.keys(seededAssignments).length && attendingParticipants.length) {
    const workerIds = Array.from(workingSet);
    if (workerIds.length) {
      let idx = 0;
      for (const pid of attendingParticipants) {
        const sid = workerIds[idx % workerIds.length];
        if (!seededAssignments[sid]) seededAssignments[sid] = [];
        seededAssignments[sid].push(pid);
        idx++;
      }
    }
  }

  // ---------- Seed CLEANING ASSIGNMENTS ----------
  const chores = Data.DEFAULT_CHORES || [];
  const cleaningAssignments: Record<string, ID> = {};

  if (cleaningDraft && Object.keys(cleaningDraft).length) {
    Object.assign(cleaningAssignments, cleaningDraft);
  } else if (chores.length) {
    const workerIds = Array.from(workingSet);
    if (workerIds.length) {
      let idx = 0;
      for (const chore of chores) {
        const sid = workerIds[idx % workerIds.length];
        cleaningAssignments[String(chore.id)] = sid;
        idx++;
      }
    }
  }

  // ---------- Seed FINAL CHECKLIST ----------
  const checklistItems = Data.DEFAULT_CHECKLIST || [];
  const finalChecklist: Record<string, boolean> = {};

  if (finalChecklistDraft && Object.keys(finalChecklistDraft).length) {
    Object.assign(finalChecklist, finalChecklistDraft);
  } else {
    for (const item of checklistItems) {
      finalChecklist[String(item.id)] = false;
    }
  }

  // ---------- AUTO‑FLOATING ENGINE ----------
  const timeSlots = Data.TIME_SLOTS || [];
  const rooms = Data.FLOATING_ROOMS || [];

  const floatingAssignments: Record<string, ID> = {};

  // Pool of staff we can actually use for floating
  const workingStaffList = staff.filter((s) => workingSet.has(s.id as ID));
  const pool = (workingStaffList.length ? workingStaffList : staff) as Staff[];

  // Track how many floating slots each staff member has picked up
  const load: Record<ID, number> = {};
  for (const s of pool) {
    load[s.id as ID] = 0;
  }

  const isFSOSlotId = (slotId: string) =>
    slotId === '11:00-11:30' || slotId === '13:00-13:30';

  for (const slot of timeSlots) {
    const usedThisSlot = new Set<ID>();

    for (const room of rooms) {
      let eligible = pool;

      // Twins has FSO (Female Staff Only) for specific slots
      if (room.id === 'twins' && isFSOSlotId(slot.id)) {
        eligible = pool.filter((s) => s.gender === 'female');
      }

      if (!eligible.length) {
        // No-one can cover this cell; leave it blank
        continue;
      }

      // Prefer staff not already used in this timeslot
      const candidates = eligible.filter((s) => !usedThisSlot.has(s.id as ID));
      const considered = candidates.length ? candidates : eligible;

      // Pick the staff member with the lowest load so far
      let best: Staff | null = null;
      for (const s of considered) {
        const sid = s.id as ID;
        if (!best) {
          best = s;
          continue;
        }
        const currentLoad = load[sid] ?? 0;
        const bestLoad = load[best.id as ID] ?? 0;
        if (currentLoad < bestLoad) {
          best = s;
        }
      }

      if (!best) continue;

      const key = `${slot.id}|${room.id}`;
      const sid = best.id as ID;
      floatingAssignments[key] = sid;
      load[sid] = (load[sid] ?? 0) + 1;
      usedThisSlot.add(sid);
    }
  }

  // NOTE: floatingDraft is intentionally ignored now that we have a full engine.
  // If we ever want to let the wizard pre‑seed floating, we can merge it here.

  // ---------- Build final snapshot ----------
  const snapshot: ScheduleSnapshot = {
    staff,
    participants,
    workingStaff,
    attendingParticipants,
    assignments: seededAssignments,
    floatingAssignments,
    cleaningAssignments,
    finalChecklist,
    finalChecklistStaff,

    pickupParticipants,
    helperStaff,
    dropoffAssignments,

    date: date ?? new Date().toISOString(),
    meta: { from: 'create-wizard' },
  };

  await Promise.resolve(createSchedule(snapshot));
}
