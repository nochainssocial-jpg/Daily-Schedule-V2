// hooks/schedule-store.ts
import { create } from 'zustand';
import type { Staff, Participant } from '@/constants/data';
import { TIME_SLOTS } from '@/constants/data';

export type ID = string;

// Snapshot of a single saved schedule
export type ScheduleSnapshot = {
  staff: Staff[];
  participants: Participant[];

  type BannerType = 'loaded' | 'created' | null;
};

export type ScheduleBanner = {
  type: BannerType;
  // Date we are *using* the schedule for (today)
  scheduleDate?: string; // 'YYYY-MM-DD'
  // Original date the schedule was created (for loaded-from-previous)
  sourceDate?: string;   // 'YYYY-MM-DD'
};

  // Core selections
  workingStaff: ID[];                 // The Dream Team (Working at B2)
  attendingParticipants: ID[];        // Attending Participants

  // Daily assignments (staff -> participantIds)
  assignments: Record<ID, ID[]>;

  // Floating: key is `${timeSlotId}|${roomId}` -> staffId
  floatingAssignments: Record<string, ID>;

  // Cleaning: key is `choreId` -> staffId
  cleaningAssignments: Record<string, ID>;

  // End-of-shift checklist
  finalChecklist: Record<string, boolean>;
  finalChecklistStaff?: ID;

  // Transport
  pickupParticipants: ID[];                // participantIds being picked up by third parties
  helperStaff: ID[];                       // helpers joining dropoffs
  dropoffAssignments: Record<ID, ID[]>;    // staffId -> participantIds they drop off

  // Meta
  date?: string;
  meta?: Record<string, any>;
};

type ScheduleState = ScheduleSnapshot & {
  createSchedule: (snapshot: ScheduleSnapshot) => void | Promise<void>;
  updateSchedule: (patch: Partial<ScheduleSnapshot>) => void;

  // Wizard + UI state
  scheduleStep: number;
  selectedDate?: string;
  setScheduleStep: (step: number) => void;
  setSelectedDate: (date?: string) => void;
  touch: () => void;

  // Auto-init + banner state
  banner: ScheduleBanner | null;
  currentInitDate?: string;          // which YYYY-MM-DD we last initialised for
  hasInitialisedToday: boolean;
  setBanner: (banner: ScheduleBanner | null) => void;
  markInitialisedForDate: (date: string) => void;
};

const makeInitialSnapshot = (): ScheduleSnapshot => ({
  staff: [],
  participants: [],
  workingStaff: [],
  attendingParticipants: [],
  assignments: {},
  floatingAssignments: {},
  cleaningAssignments: {},
  finalChecklist: {},
  finalChecklistStaff: undefined,
  pickupParticipants: [],
  helperStaff: [],
  dropoffAssignments: {},
  date: undefined,
  meta: {},
});

export const useSchedule = create<ScheduleState>((set, get) => ({
  ...makeInitialSnapshot(),

  // wizard / UI state
  scheduleStep: 1,
  selectedDate: undefined,

  // banner / init state
  banner: null,
  currentInitDate: undefined,
  hasInitialisedToday: false,

  createSchedule: (snapshot: ScheduleSnapshot) => {
    set(() => ({
      ...snapshot,
      // reset wizard state when a new schedule is created
      scheduleStep: 1,
      selectedDate: snapshot.date ?? get().selectedDate,
    }));
  },

  updateSchedule: (patch: Partial<ScheduleSnapshot>) => {
    // <keep your existing implementation here>
    ...
  },

  setScheduleStep: (step: number) => set({ scheduleStep: step }),
  setSelectedDate: (date?: string) => set({ selectedDate: date }),

  setBanner: (banner: ScheduleBanner | null) => set({ banner }),
  markInitialisedForDate: (date: string) =>
    set({ currentInitDate: date, hasInitialisedToday: true }),

  touch: () => set((state) => ({ ...state })),
}));
  },

updateSchedule: (patch: Partial<ScheduleSnapshot>) => {
  set((state) => {
    const next = { ...state, ...patch };

    // Only apply cleanup logic if workingStaff changed
    if (patch.workingStaff) {
      const oldStaff = state.workingStaff;
      const newStaff = patch.workingStaff;

      // Staff removed from Dream Team
      const removed = oldStaff.filter((id) => !newStaff.includes(id));

      if (removed.length > 0) {
        // 1️⃣ TEAM DAILY ASSIGNMENTS
        const newAssignments = { ...next.assignments };
        for (const staffId of removed) {
          delete newAssignments[staffId];
        }

        // 2️⃣ DROPOFF ASSIGNMENTS
        const newDropoffs = { ...next.dropoffAssignments };
        for (const staffId of removed) {
          delete newDropoffs[staffId];
        }

        // 3️⃣ FLOATING ASSIGNMENTS
        const newFloating = { ...next.floatingAssignments };
        for (const key of Object.keys(newFloating)) {
          if (removed.includes(newFloating[key])) {
            delete newFloating[key];
          }
        }

        // 4️⃣ CLEANING ASSIGNMENTS
        const newCleaning = { ...next.cleaningAssignments };
        for (const choreId of Object.keys(newCleaning)) {
          if (removed.includes(newCleaning[choreId])) {
            delete newCleaning[choreId];
          }
        }

        // 5️⃣ END-OF-SHIFT CHECKLIST STAFF
        let newFinalChecklistStaff = next.finalChecklistStaff;
        if (newFinalChecklistStaff && removed.includes(newFinalChecklistStaff)) {
          newFinalChecklistStaff = undefined;
        }

        // 6️⃣ HELPER STAFF
        const newHelpers = next.helperStaff.filter(
          (id) => !removed.includes(id)
        );

        // 7️⃣ PARTICIPANTS MUST REMAIN ATTENDING
        // nothing to change here — kept intentionally

        // Apply all cleaned-up values
        next.assignments = newAssignments;
        next.dropoffAssignments = newDropoffs;
        next.floatingAssignments = newFloating;
        next.cleaningAssignments = newCleaning;
        next.finalChecklistStaff = newFinalChecklistStaff;
        next.helperStaff = newHelpers;
      }
    }

    return next;
  });
},


  setScheduleStep: (step: number) => {
    set({ scheduleStep: step });
  },

  setSelectedDate: (date?: string) => {
    set({ selectedDate: date });
  },

  touch: () => {
    // no-op for now; used just to trigger a rerender in some places
  },
}));

// Helpers to quickly check if everything has been assigned

export const useFloatingMissing = (rooms: { id: string }[]) => {
  const { floatingAssignments } = useSchedule();

  // Build the set of required keys for all time slots + rooms
  const requiredKeys: string[] = [];
  for (const slot of TIME_SLOTS) {
    for (const room of rooms) {
      requiredKeys.push(`${slot.id}|${room.id}`);
    }
  }

  const missing = requiredKeys.filter((key) => !floatingAssignments?.[key]);
  return { ok: missing.length === 0, missing };
};

export const useCleaningMissing = (chores: { id: string }[]) => {
  const { cleaningAssignments } = useSchedule();
  const missing = (chores || [])
    .map((c) => String(c.id))
    .filter((id) => !cleaningAssignments?.[id]);
  return { ok: missing.length === 0, missing };
};
import { fetchLatestScheduleForHouse } from '@/lib/saveSchedule';

/**
 * Initialise the schedule store when the app starts for a given house.
 * - If the latest schedule's date is today  → banner = "created"
 * - Otherwise                              → banner = "loaded" (from previous day)
 */
export async function initScheduleForToday(house: string) {
  const state = useSchedule.getState();
  const todayKey = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  if (state.hasInitialisedToday && state.currentInitDate === todayKey) {
    return;
  }

  const result = await fetchLatestScheduleForHouse(house);

  if (!result.ok || !result.data) {
    // Nothing saved yet – just mark as initialised with no banner
    state.markInitialisedForDate(todayKey);
    state.setBanner(null);
    return;
  }

  const { snapshot, scheduleDate } = result.data;

  // Apply the snapshot as the current working schedule
  await state.createSchedule(snapshot);

  const sourceDate = (scheduleDate || '').slice(0, 10);
  const isToday = sourceDate === todayKey;

  state.markInitialisedForDate(todayKey);
  state.setBanner({
    type: isToday ? 'created' : 'loaded',
    scheduleDate: todayKey,
    sourceDate,
  });
}
