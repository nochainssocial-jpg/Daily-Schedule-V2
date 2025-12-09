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

// LEGACY type kept for backward compatibility in the validator.
// Canonical storage now uses staffId -> participantIds[] for dropoffs.
export type DropoffAssignment = {
  staffId: ID | null;
  locationId: number | null;
};

export type OutingGroup = {
  start: string;          // canonical: "6:00AM"
  end: string;            // canonical: "12:00PM"
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

  // Canonical: staffId -> participantIds[] for DAILY ASSIGNMENTS
  // (legacy participant -> staff mapping is converted in validateSchedule)
  assignments: Record<ID, ID[]>;

  // Floating is its own custom shape (slot -> { twins, scotty, frontRoom })
  floatingAssignments: Record<string, any>;

  // Cleaning remains: participantId -> staffId | null
  cleaningAssignments: Record<ID, ID | null>;

  finalChecklist: Record<string, boolean>;
  finalChecklistStaff: ID | null;

  pickupParticipants: ID[];

  // Helper staff IDs for pickups/dropoffs
  helperStaff: ID[];

  // Canonical: staffId -> participantIds[] for dropoffs
  // (legacy participant-centric shapes are converted in validateSchedule)
  dropoffAssignments: Record<ID, ID[]>;

  // Index of location per staff or participant (consumer decides how to interpret)
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

  const date =
    typeof raw?.date === 'string'
      ? raw.date
      : new Date().toISOString().slice(0, 10);

  const staff = Array.isArray(raw?.staff) ? raw.staff : [];
  const participants = Array.isArray(raw?.participants) ? raw.participants : [];

  const workingStaff = Array.isArray(raw?.workingStaff)
    ? raw.workingStaff
    : fallbackArr();
  const trainingStaffToday = Array.isArray(raw?.trainingStaffToday)
    ? raw.trainingStaffToday
    : fallbackArr();
  const attendingParticipants = Array.isArray(raw?.attendingParticipants)
    ? raw.attendingParticipants
    : fallbackArr();

  // ---------------------------------------------------------------------------
  // ASSIGNMENTS (canonical: staffId -> participantIds[])
  // Supports legacy participantId -> staffId shape and new staffId -> participantIds[].
  // ---------------------------------------------------------------------------
  const assignments: Record<ID, ID[]> = {};
  if (raw?.assignments && typeof raw.assignments === 'object') {
    Object.entries(raw.assignments).forEach(([key, value]) => {
      const k = String(key);

      // NEW SHAPE: staffId -> participantIds[]
      if (Array.isArray(value)) {
        const staffId = k as ID;
        const list = (value as any[]).map((v) => String(v) as ID).filter(Boolean);
        assignments[staffId] = Array.from(new Set(list));
        return;
      }

      // LEGACY SHAPE: participantId -> staffId
      if (typeof value === 'string' && value) {
        const participantId = k as ID;
        const staffId = String(value) as ID;
        if (!assignments[staffId]) assignments[staffId] = [];
        if (!assignments[staffId].includes(participantId)) {
          assignments[staffId].push(participantId);
        }
        return;
      }

      // Anything else is ignored.
    });
  }

  // ---------------------------------------------------------------------------
  // CLEANING ASSIGNMENTS (unchanged: participantId -> staffId | null)
  // ---------------------------------------------------------------------------
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
    typeof raw?.finalChecklistStaff === 'string'
      ? (raw.finalChecklistStaff as ID)
      : null;

  const pickupParticipants = Array.isArray(raw?.pickupParticipants)
    ? raw.pickupParticipants
    : fallbackArr();

  const helperStaff = Array.isArray(raw?.helperStaff)
    ? raw.helperStaff.map((id: any) => String(id) as ID)
    : fallbackArr();

  // ---------------------------------------------------------------------------
  // DROPOFFS (canonical: staffId -> participantIds[])
  // Supports:
  //   - NEW SHAPE: staffId -> participantIds[]
  //   - LEGACY SHAPE: participantId -> { staffId, locationId }
  //   - LEGACY SHAPE: participantId -> staffId
  // ---------------------------------------------------------------------------
  const dropoffAssignments: Record<ID, ID[]> = {};
  const dropoffLocations: Record<ID, number | null> = {};

  if (raw?.dropoffAssignments && typeof raw.dropoffAssignments === 'object') {
    Object.entries(raw.dropoffAssignments).forEach(([key, value]) => {
      const k = String(key);

      // NEW SHAPE: staffId -> participantIds[]
      if (Array.isArray(value)) {
        const staffId = k as ID;
        const pids = (value as any[]).map((v) => String(v) as ID).filter(Boolean);
        dropoffAssignments[staffId] = Array.from(new Set(pids));
        return;
      }

      // LEGACY: participantId -> { staffId, locationId }
      if (value && typeof value === 'object' && ('staffId' in (value as any))) {
        const v = value as any;
        const participantId = k as ID;
        const staffId =
          typeof v.staffId === 'string'
            ? (v.staffId as ID)
            : v.staffId
            ? String(v.staffId)
            : null;
        if (staffId) {
          if (!dropoffAssignments[staffId]) dropoffAssignments[staffId] = [];
          if (!dropoffAssignments[staffId].includes(participantId)) {
            dropoffAssignments[staffId].push(participantId);
          }
        }
        // locationId will be handled separately via dropoffLocations if present
        return;
      }

      // LEGACY: participantId -> staffId
      if (typeof value === 'string' && value) {
        const participantId = k as ID;
        const staffId = String(value) as ID;
        if (!dropoffAssignments[staffId]) dropoffAssignments[staffId] = [];
        if (!dropoffAssignments[staffId].includes(participantId)) {
          dropoffAssignments[staffId].push(participantId);
        }
        return;
      }

      // Anything else ignored.
    });
  }

  if (raw?.dropoffLocations && typeof raw.dropoffLocations === 'object') {
    Object.entries(raw.dropoffLocations).forEach(([key, idx]) => {
      const k = String(key) as ID;
      dropoffLocations[k] = typeof idx === 'number' ? (idx as number) : null;
    });
  }

  // ---------------------------------------------------------------------------
  // OUTING GROUP (normalise both new and legacy shapes)
  // ---------------------------------------------------------------------------
  let outingGroup: OutingGroup | null = null;
  if (raw?.outingGroup && typeof raw.outingGroup === 'object') {
    const og = raw.outingGroup as any;

    const start =
      typeof og.start === 'string'
        ? og.start
        : typeof og.startTime === 'string'
        ? og.startTime
        : '';

    const end =
      typeof og.end === 'string'
        ? og.end
        : typeof og.endTime === 'string'
        ? og.endTime
        : '';

    const staffIds = Array.isArray(og.staffIds)
      ? og.staffIds.map((id: any) => String(id) as ID)
      : Array.isArray(og.staff)
      ? og.staff.map((id: any) => String(id) as ID)
      : [];

    const participantIds = Array.isArray(og.participantIds)
      ? og.participantIds.map((id: any) => String(id) as ID)
      : [];

    outingGroup = {
      start,
      end,
      staffIds,
      participantIds,
    };
  }

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
