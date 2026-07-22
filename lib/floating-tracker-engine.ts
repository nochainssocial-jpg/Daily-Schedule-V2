import { TIME_SLOTS } from '@/constants/data';
import { resolveOutingTiming } from '@/lib/outingSlots';
import { supabase } from '@/lib/supabase';
import {
  HOUSE_ID,
  WEEK_DAYS,
  getWorkingWeek,
  type WeekDayLabel,
} from '@/lib/admin-report-engine';

export type FloatingRoomKey = 'frontRoom' | 'scotty' | 'twins';
export type FloatingFairnessStatus =
  | 'balanced'
  | 'slightly-low'
  | 'low'
  | 'slightly-high'
  | 'high'
  | 'limited'
  | 'not-available';

export type FloatingRoomTotals = Record<FloatingRoomKey, number>;

export type FloatingTrackerDayCell = {
  assigned: number;
  expected: number;
  availableSlots: number;
  offsiteSlots: number;
  training: boolean;
  frontRoom: number;
  scotty: number;
  twins: number;
  fso: number;
};

export type FloatingTrackerRow = {
  staffId: string;
  name: string;
  dreamTeamDays: number;
  availableSlots: number;
  eligibilityWeight: number;
  offsiteSlots: number;
  trainingDays: number;
  assigned: number;
  expected: number;
  difference: number;
  allocationRate: number;
  frontRoom: number;
  scotty: number;
  twins: number;
  fso: number;
  status: FloatingFairnessStatus;
  byDay: Record<WeekDayLabel, FloatingTrackerDayCell | null>;
};

export type FloatingTrackerDaySummary = {
  day: WeekDayLabel;
  dateKey: string;
  requiredAssignments: number;
  validAssignments: number;
  coverageGaps: number;
  invalidAssignments: number;
  offsiteStaffSlots: number;
  offsiteParticipantSlots: number;
};

export type FloatingTrackerResult = {
  weekStartKey: string;
  weekEndKey: string;
  weekLabel: string;
  rows: FloatingTrackerRow[];
  savedDays: WeekDayLabel[];
  missingDays: WeekDayLabel[];
  missingOutingHistoryDays: WeekDayLabel[];
  daySummaries: FloatingTrackerDaySummary[];
  totals: {
    requiredAssignments: number;
    validAssignments: number;
    coverageGaps: number;
    invalidAssignments: number;
    offsiteStaffSlots: number;
    offsiteParticipantSlots: number;
    balancedStaff: number;
    assessedStaff: number;
    roomAssigned: FloatingRoomTotals;
  };
};

type SnapshotStaff = {
  id: string;
  name: string;
  gender?: string | null;
  legacy_id?: string | number | null;
  legacyId?: string | number | null;
};

type SnapshotParticipant = {
  id: string;
  name: string;
  dbId?: string | null;
  db_id?: string | null;
  legacyId?: string | number | null;
  legacy_id?: string | number | null;
};

type Snapshot = {
  date?: string | null;
  staff: SnapshotStaff[];
  participants: SnapshotParticipant[];
  workingStaff: string[];
  attendingParticipants: string[];
  trainingStaffToday: string[];
  floatingAssignments: Record<string, Partial<Record<FloatingRoomKey, string | null>>>;
};

type ScheduleRow = {
  id: string;
  snapshot: unknown;
  created_at: string | null;
  updated_at?: string | null;
  seq_id: number | null;
  schedule_date?: string | null;
};

type OutingGroup = {
  id?: string;
  name?: string;
  staffIds: string[];
  participantIds: string[];
  driverId?: string;
  linkedOutingId?: string;
  startTime?: string;
  endTime?: string;
};

type OutingRow = {
  outing_date: string;
  outings?: unknown;
  archived_outings?: unknown;
  last_auto_reset_date?: string | null;
};

type DayData = {
  dateKey: string;
  day: WeekDayLabel;
  snapshot: Snapshot;
  outings: OutingGroup[];
  outingHistoryMissing: boolean;
};

type MutableRow = Omit<
  FloatingTrackerRow,
  'expected' | 'difference' | 'allocationRate' | 'status'
> & {
  expected: number;
  difference: number;
  allocationRate: number;
  status: FloatingFairnessStatus;
  dailyWeights: Record<WeekDayLabel, number>;
};

const ROOMS: FloatingRoomKey[] = ['frontRoom', 'scotty', 'twins'];
const EXCLUDED_NAMES = new Set(['everyone', 'audit', 'zara', 'zoya']);
const PARTICIPANT_ROOM_NAMES: Record<FloatingRoomKey, string[]> = {
  frontRoom: ['Paul', 'Jessica', 'Naveed', 'Tiffany', 'Sumera', 'Jacob'],
  scotty: ['Scott'],
  twins: ['Zara', 'Zoya'],
};

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter(Boolean) as T[] : [];
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseDateKey(value?: string | null): Date | null {
  if (!value) return null;
  const key = String(value).slice(0, 10);
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function sydneyDateKeyFromTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fall back to the runtime calendar date below.
  }

  return toDateKey(date);
}

function labelForDateKey(dateKey: string): WeekDayLabel | null {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  const index = (date.getDay() + 6) % 7;
  return index >= 0 && index < 5 ? WEEK_DAYS[index] : null;
}

function normaliseSnapshot(raw: unknown): Snapshot {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const snapshot = safeObject(parsed);
    const floatingRaw = safeObject(snapshot.floatingAssignments);
    const floatingAssignments: Snapshot['floatingAssignments'] = {};

    Object.entries(floatingRaw).forEach(([slotId, value]) => {
      const row = safeObject(value);
      floatingAssignments[String(slotId)] = {
        frontRoom: row.frontRoom == null ? null : String(row.frontRoom),
        scotty: row.scotty == null ? null : String(row.scotty),
        twins: row.twins == null ? null : String(row.twins),
      };
    });

    return {
      date: typeof snapshot.date === 'string' ? snapshot.date : null,
      staff: safeArray<SnapshotStaff>(snapshot.staff).map((staff) => ({
        ...staff,
        id: String(staff.id),
        name: String(staff.name || ''),
      })),
      participants: safeArray<SnapshotParticipant>(snapshot.participants).map((participant) => ({
        ...participant,
        id: String(participant.id),
        name: String(participant.name || ''),
      })),
      workingStaff: safeArray<unknown>(snapshot.workingStaff).map(String),
      attendingParticipants: safeArray<unknown>(snapshot.attendingParticipants).map(String),
      trainingStaffToday: safeArray<unknown>(snapshot.trainingStaffToday).map(String),
      floatingAssignments,
    };
  } catch {
    return {
      date: null,
      staff: [],
      participants: [],
      workingStaff: [],
      attendingParticipants: [],
      trainingStaffToday: [],
      floatingAssignments: {},
    };
  }
}

function scheduleDateKey(row: ScheduleRow, snapshot: Snapshot): string | null {
  if (typeof row.schedule_date === 'string' && parseDateKey(row.schedule_date)) {
    return row.schedule_date.slice(0, 10);
  }
  if (typeof snapshot.date === 'string' && parseDateKey(snapshot.date)) {
    return snapshot.date.slice(0, 10);
  }
  return sydneyDateKeyFromTimestamp(row.created_at);
}

function compareScheduleRows(a: ScheduleRow, b: ScheduleRow): number {
  const seqA = typeof a.seq_id === 'number' ? a.seq_id : 0;
  const seqB = typeof b.seq_id === 'number' ? b.seq_id : 0;
  if (seqA !== seqB) return seqA - seqB;
  const timeA = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
  const timeB = new Date(b.updated_at || b.created_at || 0).getTime() || 0;
  return timeA - timeB;
}

function normaliseOutings(raw: unknown): OutingGroup[] {
  return safeArray<Record<string, unknown>>(raw)
    .slice(0, 3)
    .map((outing, index) => ({
      id: String(outing.id || `outing-${index + 1}`),
      name: String(outing.name || ''),
      staffIds: safeArray<unknown>(outing.staffIds).map(String),
      participantIds: safeArray<unknown>(outing.participantIds).map(String),
      driverId: outing.driverId ? String(outing.driverId) : '',
      linkedOutingId: outing.linkedOutingId ? String(outing.linkedOutingId) : '',
      startTime: outing.startTime ? String(outing.startTime) : '',
      endTime: outing.endTime ? String(outing.endTime) : '',
    }))
    .filter((outing) => outing.staffIds.length > 0 || outing.participantIds.length > 0);
}

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const normalised = String(value).trim().toLowerCase().replace(/\s+/g, '');
  const match = normalised.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3];
  if (minute < 0 || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
  }
  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

function slotWindow(slot: { startTime?: string; endTime?: string }) {
  return {
    start: parseTimeToMinutes(slot.startTime),
    end: parseTimeToMinutes(slot.endTime),
  };
}

function outingWindow(outing: OutingGroup) {
  const start = parseTimeToMinutes(outing.startTime);
  const end = parseTimeToMinutes(outing.endTime);
  if (start == null || end == null || end <= start) return { start: null, end: null };
  return { start, end };
}

function windowsOverlap(
  first: { start: number | null; end: number | null },
  second: { start: number | null; end: number | null },
): boolean {
  if (first.start == null || first.end == null) return false;
  if (second.start == null || second.end == null) return true;
  return first.start < second.end && second.start < first.end;
}

function outingIdsForSlot(
  slot: { startTime?: string; endTime?: string },
  outings: OutingGroup[],
  key: 'staffIds' | 'participantIds',
): Set<string> {
  const ids = new Set<string>();
  const slotRange = slotWindow(slot);
  outings.forEach((outing) => {
    if (!windowsOverlap(slotRange, outingWindow(outing))) return;
    outing[key].forEach((id) => ids.add(String(id)));
  });
  return ids;
}

function isFsoSlot(slotId: string, slot: { startTime?: string; endTime?: string }): boolean {
  if (slotId === '3' || slotId === '7') return true;
  const start = parseTimeToMinutes(slot.startTime);
  return start === 11 * 60 || start === 13 * 60;
}

function isAfter2Pm(slot: { startTime?: string }): boolean {
  const start = parseTimeToMinutes(slot.startTime);
  return start != null && start >= 14 * 60;
}

function normalisedName(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function isExcludedStaff(staff?: SnapshotStaff): boolean {
  return !staff?.id || !staff.name || EXCLUDED_NAMES.has(normalisedName(staff.name));
}

function isFemale(staff?: SnapshotStaff): boolean {
  return normalisedName(staff?.gender) === 'female';
}

function isMikaela(staff?: SnapshotStaff): boolean {
  if (!staff) return false;
  const id = normalisedName(staff.id);
  const legacy = normalisedName(String(staff.legacy_id ?? staff.legacyId ?? ''));
  return normalisedName(staff.name) === 'mikaela'
    || id === '2c00094c-4a46-43fd-b5b8-de891bf5a7e3'
    || id === '20'
    || legacy === '20';
}

function isAntoinette(staff?: SnapshotStaff): boolean {
  return normalisedName(staff?.name).includes('antoinette');
}

function participantIdsByRoom(snapshot: Snapshot): Record<FloatingRoomKey, string[]> {
  const byName = new Map<string, string>();
  snapshot.participants.forEach((participant) => {
    const name = normalisedName(participant.name);
    if (!name) return;
    const ids = [
      participant.id,
      participant.dbId,
      participant.db_id,
      participant.legacyId,
      participant.legacy_id,
    ]
      .filter((value) => value !== null && value !== undefined && String(value).trim())
      .map(String);
    const preferred = ids[0];
    if (preferred) byName.set(name, preferred);
  });

  const result = {} as Record<FloatingRoomKey, string[]>;
  ROOMS.forEach((room) => {
    result[room] = PARTICIPANT_ROOM_NAMES[room]
      .map((name) => byName.get(normalisedName(name)))
      .filter((id): id is string => Boolean(id));
  });
  return result;
}

function activeRoomsForSlot(
  snapshot: Snapshot,
  outings: OutingGroup[],
  slot: { startTime?: string; endTime?: string },
): { activeRooms: FloatingRoomKey[]; offsiteParticipantCount: number } {
  const attending = new Set(snapshot.attendingParticipants.map(String));
  const groups = participantIdsByRoom(snapshot);
  const offsite = outingIdsForSlot(slot, outings, 'participantIds');
  const activeRooms: FloatingRoomKey[] = [];
  let offsiteParticipantCount = 0;

  ROOMS.forEach((room) => {
    const attendingGroup = groups[room].filter((id) => attending.has(String(id)));
    const offsiteCount = attendingGroup.filter((id) => offsite.has(String(id))).length;
    const onsiteCount = attendingGroup.length - offsiteCount;
    offsiteParticipantCount += offsiteCount;

    if (room === 'frontRoom') {
      if (onsiteCount >= 3) activeRooms.push(room);
      return;
    }
    if (onsiteCount > 0) activeRooms.push(room);
  });

  return { activeRooms, offsiteParticipantCount };
}

function isEligibleForRoom(
  staff: SnapshotStaff,
  room: FloatingRoomKey,
  slotId: string,
  slot: { startTime?: string; endTime?: string },
): boolean {
  if (isExcludedStaff(staff)) return false;
  if (isAntoinette(staff) && !isAfter2Pm(slot)) return false;
  const fso = room === 'twins' && isFsoSlot(slotId, slot);
  if (room === 'frontRoom' && isMikaela(staff)) return false;
  if (fso && isMikaela(staff)) return false;
  if (fso && !isFemale(staff)) return false;
  return true;
}

function emptyDayRecord<T>(factory: () => T): Record<WeekDayLabel, T> {
  return {
    Mon: factory(),
    Tue: factory(),
    Wed: factory(),
    Thu: factory(),
    Fri: factory(),
  };
}

function emptyDayCell(): FloatingTrackerDayCell {
  return {
    assigned: 0,
    expected: 0,
    availableSlots: 0,
    offsiteSlots: 0,
    training: false,
    frontRoom: 0,
    scotty: 0,
    twins: 0,
    fso: 0,
  };
}

function ensureMutableRow(
  rows: Record<string, MutableRow>,
  staff: SnapshotStaff,
): MutableRow | null {
  if (isExcludedStaff(staff)) return null;
  const id = String(staff.id);
  if (!rows[id]) {
    rows[id] = {
      staffId: id,
      name: staff.name,
      dreamTeamDays: 0,
      availableSlots: 0,
      eligibilityWeight: 0,
      offsiteSlots: 0,
      trainingDays: 0,
      assigned: 0,
      expected: 0,
      difference: 0,
      allocationRate: 0,
      frontRoom: 0,
      scotty: 0,
      twins: 0,
      fso: 0,
      status: 'limited',
      byDay: emptyDayRecord<FloatingTrackerDayCell | null>(() => null),
      dailyWeights: emptyDayRecord(() => 0),
    };
  }
  return rows[id];
}

function fairnessStatus(actual: number, expected: number, availableSlots: number): FloatingFairnessStatus {
  if (availableSlots === 0 || expected === 0) return 'not-available';
  if (expected < 1.5 || availableSlots < 3) return 'limited';

  const difference = actual - expected;
  const balancedTolerance = Math.max(1, expected * 0.25);
  const moderateTolerance = Math.max(2, expected * 0.5);
  if (Math.abs(difference) <= balancedTolerance) return 'balanced';
  if (difference < 0) {
    return Math.abs(difference) <= moderateTolerance ? 'slightly-low' : 'low';
  }
  return Math.abs(difference) <= moderateTolerance ? 'slightly-high' : 'high';
}

async function fetchOutingsForWeek(startKey: string, endKey: string): Promise<Record<string, OutingRow>> {
  const buildMap = (data: unknown): Record<string, OutingRow> => {
    const out: Record<string, OutingRow> = {};
    safeArray<OutingRow>(data).forEach((row) => {
      const dateKey = String(row.outing_date || '').slice(0, 10);
      if (dateKey) out[dateKey] = row;
    });
    return out;
  };

  const withArchive = await supabase
    .from('daily_outings')
    .select('outing_date, outings, archived_outings, last_auto_reset_date')
    .eq('house', HOUSE_ID)
    .gte('outing_date', startKey)
    .lte('outing_date', endKey);

  if (!withArchive.error) return buildMap(withArchive.data);

  // Compatibility path until the archive migration has been applied.
  const legacy = await supabase
    .from('daily_outings')
    .select('outing_date, outings, last_auto_reset_date')
    .eq('house', HOUSE_ID)
    .gte('outing_date', startKey)
    .lte('outing_date', endKey);

  if (legacy.error) throw legacy.error;
  return buildMap(legacy.data);
}

async function fetchWeekData(weekOffset: number): Promise<{
  week: ReturnType<typeof getWorkingWeek>;
  days: DayData[];
}> {
  const week = getWorkingWeek(weekOffset);
  const targetDates = new Set(week.dates.map(({ dateKey }) => dateKey));

  const [scheduleResponse, outingsByDate] = await Promise.all([
    supabase
      .from('schedules')
      .select('id, snapshot, created_at, updated_at, seq_id, schedule_date')
      .eq('house', HOUSE_ID)
      .gte('schedule_date', week.startKey)
      .lte('schedule_date', week.endKey)
      .order('created_at', { ascending: false })
      .limit(100),
    fetchOutingsForWeek(week.startKey, week.endKey),
  ]);

  if (scheduleResponse.error) throw scheduleResponse.error;

  const latestByDate: Record<string, { row: ScheduleRow; snapshot: Snapshot }> = {};
  safeArray<ScheduleRow>(scheduleResponse.data).forEach((row) => {
    const snapshot = normaliseSnapshot(row.snapshot);
    const dateKey = scheduleDateKey(row, snapshot);
    if (!dateKey || !targetDates.has(dateKey)) return;
    const existing = latestByDate[dateKey];
    if (!existing || compareScheduleRows(existing.row, row) < 0) {
      latestByDate[dateKey] = { row, snapshot };
    }
  });

  const days: DayData[] = [];
  week.dates.forEach(({ day, dateKey }) => {
    const schedule = latestByDate[dateKey];
    if (!schedule) return;
    const outingRow = outingsByDate[dateKey];
    const liveOutings = normaliseOutings(outingRow?.outings);
    const archivedOutings = normaliseOutings(outingRow?.archived_outings);
    const outings = (liveOutings.length ? liveOutings : archivedOutings)
      .map((outing) => resolveOutingTiming(outing, liveOutings.length ? liveOutings : archivedOutings));
    const autoResetDate = String(outingRow?.last_auto_reset_date || '').slice(0, 10);
    const outingHistoryMissing = Boolean(
      outingRow
      && liveOutings.length === 0
      && archivedOutings.length === 0
      && autoResetDate === dateKey,
    );

    days.push({
      dateKey,
      day,
      snapshot: schedule.snapshot,
      outings,
      outingHistoryMissing,
    });
  });

  return { week, days };
}

export async function loadFloatingAssignmentsTracker(
  weekOffset: number,
): Promise<FloatingTrackerResult> {
  const { week, days } = await fetchWeekData(weekOffset);
  const rows: Record<string, MutableRow> = {};
  const daySummaries: FloatingTrackerDaySummary[] = [];
  const roomAssigned: FloatingRoomTotals = { frontRoom: 0, scotty: 0, twins: 0 };

  days.forEach(({ day, dateKey, snapshot, outings }) => {
    const staffById = new Map<string, SnapshotStaff>();
    snapshot.staff.forEach((staff) => staffById.set(String(staff.id), staff));
    const workingIds = snapshot.workingStaff.map(String);
    const workingSet = new Set(workingIds);
    const trainingSet = new Set(snapshot.trainingStaffToday.map(String));

    workingIds.forEach((staffId) => {
      const staff = staffById.get(staffId);
      if (!staff) return;
      const row = ensureMutableRow(rows, staff);
      if (!row) return;
      row.dreamTeamDays += 1;
      row.byDay[day] = emptyDayCell();
      if (trainingSet.has(staffId)) {
        row.trainingDays += 1;
        row.byDay[day]!.training = true;
      }
    });

    const daySummary: FloatingTrackerDaySummary = {
      day,
      dateKey,
      requiredAssignments: 0,
      validAssignments: 0,
      coverageGaps: 0,
      invalidAssignments: 0,
      offsiteStaffSlots: 0,
      offsiteParticipantSlots: 0,
    };

    TIME_SLOTS.forEach((slot, index) => {
      const slotId = String(slot.id ?? index);
      const { activeRooms, offsiteParticipantCount } = activeRoomsForSlot(snapshot, outings, slot);
      const activeRoomSet = new Set(activeRooms);
      const offsiteStaff = outingIdsForSlot(slot, outings, 'staffIds');
      const activeRoomCount = activeRooms.length;
      daySummary.requiredAssignments += activeRoomCount;
      daySummary.offsiteParticipantSlots += offsiteParticipantCount;

      workingIds.forEach((staffId) => {
        const staff = staffById.get(staffId);
        if (!staff || isExcludedStaff(staff)) return;
        const row = ensureMutableRow(rows, staff);
        const cell = row?.byDay[day];
        if (!row || !cell) return;

        if (offsiteStaff.has(staffId)) {
          row.offsiteSlots += 1;
          cell.offsiteSlots += 1;
          daySummary.offsiteStaffSlots += 1;
          return;
        }
        if (trainingSet.has(staffId) || activeRoomCount === 0) return;

        const eligibleRooms = activeRooms.filter((room) =>
          isEligibleForRoom(staff, room, slotId, slot),
        );
        if (!eligibleRooms.length) return;

        row.availableSlots += 1;
        cell.availableSlots += 1;
        const weight = eligibleRooms.length / activeRoomCount;
        row.eligibilityWeight += weight;
        row.dailyWeights[day] += weight;
      });

      const assignmentRow = snapshot.floatingAssignments[slotId] || {};
      ROOMS.forEach((room) => {
        const rawStaffId = assignmentRow[room];
        const staffId = rawStaffId ? String(rawStaffId) : '';
        if (!staffId || staffId === '__OFFSITE__') {
          if (activeRoomSet.has(room)) daySummary.coverageGaps += 1;
          return;
        }

        const staff = staffById.get(staffId);
        const isValid = Boolean(
          staff
          && workingSet.has(staffId)
          && !trainingSet.has(staffId)
          && !offsiteStaff.has(staffId)
          && activeRoomSet.has(room)
          && isEligibleForRoom(staff, room, slotId, slot),
        );

        if (!isValid || !staff) {
          daySummary.invalidAssignments += 1;
          return;
        }

        const row = ensureMutableRow(rows, staff);
        const cell = row?.byDay[day];
        if (!row || !cell) return;
        row.assigned += 1;
        row[room] += 1;
        cell.assigned += 1;
        cell[room] += 1;
        roomAssigned[room] += 1;
        daySummary.validAssignments += 1;
        if (room === 'twins' && isFsoSlot(slotId, slot)) {
          row.fso += 1;
          cell.fso += 1;
        }
      });
    });

    daySummaries.push(daySummary);
  });

  const totalAssignments = Object.values(rows).reduce((sum, row) => sum + row.assigned, 0);
  const totalWeight = Object.values(rows).reduce((sum, row) => sum + row.eligibilityWeight, 0);
  const dailyWeightTotals = emptyDayRecord(() => 0);
  Object.values(rows).forEach((row) => {
    WEEK_DAYS.forEach((day) => {
      dailyWeightTotals[day] += row.dailyWeights[day];
    });
  });
  const daySummaryByDay = new Map(daySummaries.map((summary) => [summary.day, summary]));

  const finalRows = Object.values(rows)
    .map((row): FloatingTrackerRow => {
      const expected = totalWeight > 0
        ? totalAssignments * (row.eligibilityWeight / totalWeight)
        : 0;
      WEEK_DAYS.forEach((day) => {
        const cell = row.byDay[day];
        if (!cell) return;
        const dayTotal = daySummaryByDay.get(day)?.validAssignments || 0;
        cell.expected = dailyWeightTotals[day] > 0
          ? dayTotal * (row.dailyWeights[day] / dailyWeightTotals[day])
          : 0;
      });
      const difference = row.assigned - expected;
      const allocationRate = row.availableSlots > 0
        ? row.assigned / row.availableSlots
        : 0;
      return {
        staffId: row.staffId,
        name: row.name,
        dreamTeamDays: row.dreamTeamDays,
        availableSlots: row.availableSlots,
        eligibilityWeight: row.eligibilityWeight,
        offsiteSlots: row.offsiteSlots,
        trainingDays: row.trainingDays,
        assigned: row.assigned,
        expected,
        difference,
        allocationRate,
        frontRoom: row.frontRoom,
        scotty: row.scotty,
        twins: row.twins,
        fso: row.fso,
        status: fairnessStatus(row.assigned, expected, row.availableSlots),
        byDay: row.byDay,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));

  const savedDays = days.map(({ day }) => day);
  const savedSet = new Set(savedDays);
  const missingDays = WEEK_DAYS.filter((day) => !savedSet.has(day));
  const missingOutingHistoryDays = days
    .filter(({ outingHistoryMissing }) => outingHistoryMissing)
    .map(({ day }) => day);
  const totals = daySummaries.reduce(
    (acc, day) => ({
      ...acc,
      requiredAssignments: acc.requiredAssignments + day.requiredAssignments,
      validAssignments: acc.validAssignments + day.validAssignments,
      coverageGaps: acc.coverageGaps + day.coverageGaps,
      invalidAssignments: acc.invalidAssignments + day.invalidAssignments,
      offsiteStaffSlots: acc.offsiteStaffSlots + day.offsiteStaffSlots,
      offsiteParticipantSlots: acc.offsiteParticipantSlots + day.offsiteParticipantSlots,
    }),
    {
      requiredAssignments: 0,
      validAssignments: 0,
      coverageGaps: 0,
      invalidAssignments: 0,
      offsiteStaffSlots: 0,
      offsiteParticipantSlots: 0,
      balancedStaff: 0,
      assessedStaff: 0,
      roomAssigned,
    },
  );
  totals.assessedStaff = finalRows.filter((row) => !['limited', 'not-available'].includes(row.status)).length;
  totals.balancedStaff = finalRows.filter((row) => row.status === 'balanced').length;

  return {
    weekStartKey: week.startKey,
    weekEndKey: week.endKey,
    weekLabel: week.label,
    rows: finalRows,
    savedDays,
    missingDays,
    missingOutingHistoryDays,
    daySummaries,
    totals,
  };
}
