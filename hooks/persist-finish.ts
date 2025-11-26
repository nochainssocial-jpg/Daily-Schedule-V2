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

  // From the Team Daily Assignments step
  assignments?: Record<ID, ID[]>;

  // Optional drafts from later steps
  floatingDraft?: Record<string, ID>;
  cleaningDraft?: Record<string, ID>;
  finalChecklistDraft?: Record<string, boolean>;
  finalChecklistStaff: ID;

  // Transport (pickups / helpers / dropoffs)
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

  // Fallback: simple round-robin across Dream Team if nothing came through
  if (!Object.keys(seededAssignments).length && attendingParticipants.length) {
    const workerIds = Array.from(workingSet);
    if (workerIds.length) {
      let idx = 0;
      for (const pid of attendingParticipants as ID[]) {
        const sid = workerIds[idx % workerIds.length];
        if (!seededAssignments[sid]) seededAssignments[sid] = [];
        seededAssignments[sid].push(pid);
        idx++;
      }
    }
  }

  // ---------- CLEANING ASSIGNMENTS ----------
  const chores = (Data as any).DEFAULT_CHORES || [];
  const cleaningAssignments: Record<string, ID> = {};

  if (cleaningDraft && Object.keys(cleaningDraft).length) {
    // User explicitly edited cleaning – trust the draft
    for (const [choreId, staffId] of Object.entries(cleaningDraft)) {
      const validChore = chores.some((c: any) => c.id === choreId);
      if (!validChore) continue;
      if (!staffById.has(staffId as ID)) continue;
      cleaningAssignments[choreId] = staffId as ID;
    }
  } else if (chores.length) {
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
            historyByChore[choreId] = {} as Record<ID, number>;
          }
          const map = historyByChore[choreId] as Record<ID, number>;
          map[sid] = (map[sid] ?? 0) + 1;
        }
      }

      // Track today's cleaning load so we don't stack the same person repeatedly
      const todayCounts: Record<ID, number> = {};

      for (const chore of chores) {
        const choreId = String(chore.id);

        // Candidate staff = workingPool (already filtered above)
        const candidates = pool.filter((s) => workingSet.has(s.id as ID));
        if (!candidates.length) continue;

        // 1) Chore-specific fairness: minimise how often they've had THIS chore
        let minChore = Infinity;
        for (const s of candidates) {
          const sid = s.id as ID;
          const c = historyByChore[choreId]?.[sid] ?? 0;
          if (c < minChore) minChore = c;
        }

        let best = candidates.filter((s) => {
          const sid = s.id as ID;
          return (historyByChore[choreId]?.[sid] ?? 0) === minChore;
        });

        // 2) Overall cleaning load fairness (history + today)
        let minTotal = Infinity;
        for (const s of best) {
          const sid = s.id as ID;
          const c =
            (totalHistoryByStaff[sid] ?? 0) + (todayCounts[sid] ?? 0);
          if (c < minTotal) minTotal = c;
        }

        best = best.filter((s) => {
          const sid = s.id as ID;
          return (
            (totalHistoryByStaff[sid] ?? 0) + (todayCounts[sid] ?? 0) ===
            minTotal
          );
        });

        // 3) Tie-breaker: random between equally good options
        const chosen =
          best[Math.floor(Math.random() * Math.max(best.length, 1))];
        if (!chosen) continue;

        const sid = chosen.id as ID;
        cleaningAssignments[choreId] = sid;
        todayCounts[sid] = (todayCounts[sid] ?? 0) + 1;
      }

      // Safety: if for some reason nothing got assigned, fall back to classic round-robin
      if (!Object.keys(cleaningAssignments).length) {
        let idx = 0;
        for (const chore of chores) {
          const s = pool[idx % pool.length];
          cleaningAssignments[String(chore.id)] = s.id as ID;
          idx++;
        }
      }
    }
  }

  // ---------- AUTO-FLOATING ENGINE ----------
  const timeSlots: { id: ID }[] = ((Data as any).TIME_SLOTS || []) as {
    id: ID;
  }[];
  const rooms: { id: ID }[] =
    ((Data as any).FLOATING_ROOMS as { id: ID }[] | undefined) || [
      { id: 'front-room' as ID },
      { id: 'scotty' as ID },
      { id: 'twins' as ID },
    ];

  const floatingAssignments: Record<string, ID> = {};

  const workingStaffList = staff.filter((s) => workingSet.has(s.id as ID));
  const floatingPool = (workingStaffList.length
    ? workingStaffList
    : staff) as Staff[];

  const load: Record<ID, number> = {};
  const roomLoad: Record<ID, Record<ID, number>> = {};
  const twinsLoad: Record<ID, number> = {};

  for (const s of floatingPool) {
    const sid = s.id as ID;
    load[sid] = 0;
    roomLoad[sid] = {};
    twinsLoad[sid] = 0;
  }

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

      // Twins fairness: max 2 total per staff where possible
      if (isTwinsRoom) {
        const underCap = candidates.filter(
          (s) => (twinsLoad[s.id as ID] ?? 0) < 2,
        );
        if (underCap.length) {
          candidates = underCap;
        }
      }

      // Cooldown across slots – prefer staff who were not used in previous slot
      const cooled = candidates.filter(
        (s) => !prevSlotStaff.has(s.id as ID),
      );
      if (cooled.length) {
        candidates = cooled;
      }

      if (!candidates.length) continue;

      // 1) Global fairness: minimise total assignments
      let minTotal = Infinity;
      for (const s of candidates) {
        const sid = s.id as ID;
        const c = load[sid] ?? 0;
        if (c < minTotal) minTotal = c;
      }
      let bestCandidates = candidates.filter((s) => {
        const sid = s.id as ID;
        return (load[sid] ?? 0) === minTotal;
      });

      // 2) Room fairness: minimise assignments in this specific room
      let minRoom = Infinity;
      for (const s of bestCandidates) {
        const sid = s.id as ID;
        const c = roomLoad[sid]?.[room.id] ?? 0;
        if (c < minRoom) minRoom = c;
      }
      bestCandidates = bestCandidates.filter((s) => {
        const sid = s.id as ID;
        return (roomLoad[sid]?.[room.id] ?? 0) === minRoom;
      });

      // 3) Tie-breaker: random between equally good options
      const chosen =
        bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
      if (!chosen) continue;

      const sid = chosen.id as ID;
      const key = `${slot.id}|${room.id}`;
      floatingAssignments[key] = sid;
      load[sid] = (load[sid] ?? 0) + 1;
      roomLoad[sid][room.id] = (roomLoad[sid][room.id] ?? 0) + 1;
      if (isTwinsRoom) {
        twinsLoad[sid] = (twinsLoad[sid] ?? 0) + 1;
      }
      usedThisSlot.add(sid);
    }

    prevSlotStaff = usedThisSlot;
  }

  // If the wizard captured any explicit floatingDraft overrides, merge them on top
  if (floatingDraft && Object.keys(floatingDraft).length) {
    for (const [key, sid] of Object.entries(floatingDraft)) {
      if (!staffById.has(sid as ID)) continue;
      floatingAssignments[key] = sid as ID;
    }
  }

  // ---------- FINAL CHECKLIST ----------
  const finalChecklist: Record<string, boolean> = {};
  if (finalChecklistDraft) {
    for (const [id, done] of Object.entries(finalChecklistDraft)) {
      finalChecklist[id] = !!done;
    }
  }

  // ---------- TRANSPORT (PICKUPS / DROPOFFS) ----------
  const validPickup = (pickupParticipants || []).filter((pid) =>
    participantsById.has(pid as ID),
  ) as ID[];

  const validHelpers = (helperStaff || []).filter((sid) =>
    staffById.has(sid as ID),
  ) as ID[];

  const cleanedDropoffs: Record<ID, ID[]> = {};
  if (dropoffAssignments) {
    for (const [sid, partIds] of Object.entries(dropoffAssignments)) {
      if (!staffById.has(sid as ID)) continue;
      const cleaned = (partIds || []).filter(
        (pid) =>
          participantsById.has(pid as ID) && !validPickup.includes(pid as ID),
      ) as ID[];
      cleanedDropoffs[sid as ID] = cleaned;
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

    pickupParticipants: validPickup,
    helperStaff: validHelpers,
    dropoffAssignments: cleanedDropoffs,
    dropoffLocations: dropoffLocations || {},

    outingGroup: null,

    // Use local calendar date for the schedule
    date:
      date ??
      [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-'),
    meta: { from: 'create-wizard' },
  };

  await Promise.resolve(createSchedule(snapshot));
}
