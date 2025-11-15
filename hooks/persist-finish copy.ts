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
      );
      if (filtered.length) {
        seededAssignments[staffId as ID] = Array.from(new Set(filtered as ID[]));
      }
    }
  }

  // Make sure every working staff has an entry, even if empty
  for (const sid of workingSet) {
    if (!seededAssignments[sid]) {
      seededAssignments[sid] = [];
    }
  }

  // ---------- Seed CLEANING ASSIGNMENTS ----------
  const chores = Data.DEFAULT_CHORES || [];
  const cleaningAssignments: Record<string, ID> = {};

  if (cleaningDraft && Object.keys(cleaningDraft).length) {
    Object.assign(cleaningAssignments, cleaningDraft);
  } else if (chores.length) {
    // Round-robin the chores across the working staff for now
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
  const finalChecklist: Record<string, boolean> = {};

  if (finalChecklistDraft && Object.keys(finalChecklistDraft).length) {
    Object.assign(finalChecklist, finalChecklistDraft);
  } else {
    (Data.DEFAULT_CHECKLIST || []).forEach((item) => {
      finalChecklist[String(item.id)] = false;
    });
  }

  // ---------- Seed FLOATING ASSIGNMENTS ----------
  const timeSlots = Data.TIME_SLOTS || [];
  const rooms = Data.FLOATING_ROOMS || [
    { id: 'front', name: 'Front Room' },
    { id: 'scotty', name: 'Scotty' },
    { id: 'twins', name: 'Twins' },
  ];

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

      // Pick the staff with the lowest load who isn't already used in this slot
      let candidate: Staff | null = null;
      let bestLoad = Infinity;
      for (const st of eligible) {
        const sid = st.id as ID;
        if (usedThisSlot.has(sid)) continue;
        const l = load[sid] ?? 0;
        if (l < bestLoad) {
          bestLoad = l;
          candidate = st;
        }
      }

      if (!candidate) continue;

      const sid = candidate.id as ID;
      usedThisSlot.add(sid);
      load[sid] = (load[sid] ?? 0) + 1;

      const key = `${room.id}:${slot.id}`;
      floatingAssignments[key] = sid;
    }
  }

  // ---------- Transport: pickups / helpers / dropoffs -----------------------

  // Clean pickups: only attending participants
  const pickupClean: ID[] = (pickupParticipants || []).filter((pid) =>
    attendingParticipants.includes(pid as ID),
  );

  // Clean helpers: must be staff
  const helperClean: ID[] = (helperStaff || []).filter((sid) => staffById.has(sid));

  // Clean dropoff assignments: only helpers + pickup participants
  const dropoffClean: Record<ID, ID[]> = {};
  const pickupSet = new Set(pickupClean);

  if (dropoffAssignments && Object.keys(dropoffAssignments).length) {
    for (const [sid, list] of Object.entries(dropoffAssignments)) {
      if (!helperClean.includes(sid as ID)) continue;
      const cleaned = (list || []).filter((pid) => pickupSet.has(pid as ID));
      if (cleaned.length) {
        dropoffClean[sid as ID] = Array.from(new Set(cleaned as ID[]));
      }
    }
  }

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

    pickupParticipants: pickupClean,
    helperStaff: helperClean,
    dropoffAssignments: dropoffClean,

    date: date ?? new Date().toISOString(),
    meta: { from: 'create-wizard' },
  };

  await Promise.resolve(createSchedule(snapshot));
}
