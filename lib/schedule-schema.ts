// Canonical schedule schema + validator for Daily Schedule V2
// This file defines the single source of truth for the schedule shape
// used throughout the app (wizard, store, Supabase, trackers, edit hub).

export type ID = string;

export type Staff = {
  id: ID;
  name: string;
  phone?: string | null;
  color?: string | null;
  gender?: 'M' | 'F' | null;
  // Additional fields from Supabase are allowed via index signature
  [key: string]: any;
};

export type Participant = {
  id: ID;
  name: string;
  color?: string | null;
  gender?: 'M' | 'F' | null;
  // Behaviour / rating metadata comes from Supabase
  [key: string]: any;
};

export type DropoffAssignment = {
  staffId: ID | null;
  locationId: number | null;
};

export type OutingGroup = {
  start: string;
  end: string;
  staffIds: ID[];
  participantIds: ID[];
};

export type CanonicalSchedule = {
  date: string;

  staff: Staff[];
  participants: Participant[];

  workingStaff: ID[];
  trainingStaffToday: ID[];
  attendingParticipants: ID[];

  // Participant -> staff mapping for daily assignments & cleaning
  assignments: Record<ID, ID | null>;
  floatingAssignments: Record<string, any>;
  cleaningAssignments: Record<ID, ID | null>;

  finalChecklist: Record<string, boolean>;
  finalChecklistStaff: ID | null;

  pickupParticipants: ID[];
  helperStaff: ID[];

  // Participant-centric dropoff storage
  dropoffAssignments: Record<ID, DropoffAssignment | null>;
  dropoffLocations: Record<ID, number | null>;

  outingGroup: OutingGroup | null;

  meta: {
    from: 'create-wizard' | 'edit-hub';
    version: number;
    [key: string]: any;
  };
};

// A very small, defensive validator that we can call before using
// any schedule loaded from Supabase or constructed in memory.
export function validateSchedule(raw: any): CanonicalSchedule {
  const fallbackArr = () => [] as ID[];
  const fallbackObj = <T>() => ({} as Record<ID, T>);

  const date = typeof raw?.date === 'string' ? raw.date : new Date().toISOString().slice(0, 10);

  const staff = Array.isArray(raw?.staff) ? raw.staff : [];
  const participants = Array.isArray(raw?.participants) ? raw.participants : [];

  const workingStaff = Array.isArray(raw?.workingStaff) ? raw.workingStaff : fallbackArr();
  const trainingStaffToday = Array.isArray(raw?.trainingStaffToday)
    ? raw.trainingStaffToday
    : fallbackArr();
  const attendingParticipants = Array.isArray(raw?.attendingParticipants)
    ? raw.attendingParticipants
    : fallbackArr();

  const assignments: Record<ID, ID | null> = {};
  if (raw?.assignments && typeof raw.assignments === 'object') {
    Object.entries(raw.assignments).forEach(([pid, sid]) => {
      assignments[pid as ID] = sid ? (sid as ID) : null;
    });
  }

  const cleaningAssignments: Record<ID, ID | null> = {};
  if (raw?.cleaningAssignments && typeof raw.cleaningAssignments === 'object') {
    Object.entries(raw.cleaningAssignments).forEach(([pid, sid]) => {
      cleaningAssignments[pid as ID] = sid ? (sid as ID) : null;
    });
  }

  const floatingAssignments =
    raw?.floatingAssignments && typeof raw.floatingAssignments === 'object'
      ? raw.floatingAssignments
      : {};

  const finalChecklist =
    raw?.finalChecklist && typeof raw.finalChecklist === 'object'
      ? raw.finalChecklist
      : {};

  const finalChecklistStaff =
    typeof raw?.finalChecklistStaff === 'string' ? (raw.finalChecklistStaff as ID) : null;

  const pickupParticipants = Array.isArray(raw?.pickupParticipants)
    ? raw.pickupParticipants
    : fallbackArr();
  const helperStaff = Array.isArray(raw?.helperStaff) ? raw.helperStaff : fallbackArr();

  const dropoffAssignments: Record<ID, DropoffAssignment | null> = {};
  if (raw?.dropoffAssignments && typeof raw.dropoffAssignments === 'object') {
    Object.entries(raw.dropoffAssignments).forEach(([pid, value]) => {
      if (!value) {
        dropoffAssignments[pid as ID] = null;
        return;
      }
      const v = value as any;
      const staffId =
        v && typeof v.staffId === 'string'
          ? (v.staffId as ID)
          : (v?.staffId ?? null);
      const locationId =
        v && typeof v.locationId === 'number'
          ? (v.locationId as number)
          : null;
      dropoffAssignments[pid as ID] = { staffId, locationId };
    });
  }

  const dropoffLocations: Record<ID, number | null> = {};
  if (raw?.dropoffLocations && typeof raw.dropoffLocations === 'object') {
    Object.entries(raw.dropoffLocations).forEach(([pid, idx]) => {
      dropoffLocations[pid as ID] =
        typeof idx === 'number' ? (idx as number) : null;
    });
  }

  const outingGroup =
    raw?.outingGroup && typeof raw.outingGroup === 'object'
      ? (raw.outingGroup as OutingGroup)
      : null;

  const metaRaw = raw?.meta && typeof raw.meta === 'object' ? raw.meta : {};
  const meta = {
    from:
      metaRaw.from === 'create-wizard' || metaRaw.from === 'edit-hub'
        ? metaRaw.from
        : 'edit-hub',
    version: typeof metaRaw.version === 'number' ? metaRaw.version : 2,
    ...metaRaw,
  };

  return {
    date,
    staff,
    participants,
    workingStaff,
    trainingStaffToday,
    attendingParticipants,
    assignments,
    floatingAssignments,
    cleaningAssignments,
    finalChecklist,
    finalChecklistStaff,
    pickupParticipants,
    helperStaff,
    dropoffAssignments,
    dropoffLocations,
    outingGroup,
    meta,
  };
}
