import { supabase } from '@/lib/supabase';
import { DEFAULT_LOCATION_ID } from '@/constants/location';

export const HOUSE_ID = DEFAULT_LOCATION_ID;
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export type WeekDayLabel = (typeof WEEK_DAYS)[number];

export type WeeklyReportRow = {
  staffId: string;
  name: string;
  byDay: Record<WeekDayLabel, string[]>;
  totals: Record<string, number>;
};

export type WeeklyReportResult = {
  weekStartKey: string;
  weekEndKey: string;
  weekLabel: string;
  rows: WeeklyReportRow[];
  savedDays: WeekDayLabel[];
  missingDays: WeekDayLabel[];
};

type ScheduleRow = {
  id: string;
  house: string;
  snapshot: any;
  created_at: string | null;
  updated_at?: string | null;
  seq_id: number | null;
  schedule_date?: string | null;
};

type SnapshotStaff = { id: string; name: string };
type SnapshotParticipant = { id: string; name: string };

type Snapshot = {
  date?: string | null;
  staff: SnapshotStaff[];
  participants: SnapshotParticipant[];
  workingStaff: string[];
  assignments: any;
  cleaningAssignments: any;
};

type DaySnapshot = {
  dateKey: string;
  dayLabel: WeekDayLabel;
  row: ScheduleRow;
  snapshot: Snapshot;
};

type ChoreRow = { id: string | number; name: string };

const EXCLUDED_NAMES = new Set(['everyone', 'zara', 'zoya']);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateKey(value?: string | null): Date | null {
  if (!value) return null;
  const key = String(value).slice(0, 10);
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function sydneyDateKeyFromTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {}

  return toDateKey(d);
}

export function getSydneyTodayKey(): string {
  return sydneyDateKeyFromTimestamp(new Date().toISOString()) ?? toDateKey(new Date());
}

function getWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffToMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);
  return start;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + days);
  return out;
}

export function getWorkingWeek(weekOffset: number) {
  const today = parseDateKey(getSydneyTodayKey()) ?? new Date();
  const start = getWeekStart(today);
  start.setDate(start.getDate() + weekOffset * 7);
  const end = addDays(start, 4);
  const dates = WEEK_DAYS.map((day, index) => ({
    day,
    dateKey: toDateKey(addDays(start, index)),
  }));
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return {
    start,
    end,
    startKey: toDateKey(start),
    endKey: toDateKey(end),
    dates,
    label: `Week: ${start.toLocaleDateString('en-AU', opts)} – ${end.toLocaleDateString('en-AU', opts)}`,
  };
}

function labelForDateKey(dateKey: string): WeekDayLabel | null {
  const d = parseDateKey(dateKey);
  if (!d) return null;
  const idx = (d.getDay() + 6) % 7;
  return idx >= 0 && idx < 5 ? WEEK_DAYS[idx] : null;
}

function safeArray<T>(value: any): T[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function safeObject(value: any): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normaliseSnapshot(raw: any): Snapshot {
  try {
    const snap = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
    return {
      date: typeof snap.date === 'string' ? snap.date : null,
      staff: safeArray<SnapshotStaff>(snap.staff),
      participants: safeArray<SnapshotParticipant>(snap.participants),
      workingStaff: safeArray<any>(snap.workingStaff).map(String),
      assignments: safeObject(snap.assignments),
      cleaningAssignments: safeObject(snap.cleaningAssignments),
    };
  } catch {
    return {
      date: null,
      staff: [],
      participants: [],
      workingStaff: [],
      assignments: {},
      cleaningAssignments: {},
    };
  }
}

function getRowDateKey(row: ScheduleRow, snapshot: Snapshot): string | null {
  if (typeof row.schedule_date === 'string' && parseDateKey(row.schedule_date)) {
    return row.schedule_date.slice(0, 10);
  }

  if (typeof snapshot.date === 'string' && parseDateKey(snapshot.date)) {
    return snapshot.date.slice(0, 10);
  }

  return sydneyDateKeyFromTimestamp(row.created_at);
}

function compareLatestRows(a: ScheduleRow, b: ScheduleRow): number {
  const seqA = typeof a.seq_id === 'number' ? a.seq_id : 0;
  const seqB = typeof b.seq_id === 'number' ? b.seq_id : 0;
  if (seqA !== seqB) return seqA - seqB;

  const timeA = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
  const timeB = new Date(b.updated_at || b.created_at || 0).getTime() || 0;
  return timeA - timeB;
}

function isExcludedName(name?: string | null): boolean {
  return EXCLUDED_NAMES.has(String(name || '').trim().toLowerCase());
}

function makeEmptyDays(): Record<WeekDayLabel, string[]> {
  return { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
}

function ensureRow(
  rows: Record<string, WeeklyReportRow>,
  staffId: string,
  staffName: string,
): WeeklyReportRow | null {
  if (!staffId || !staffName || isExcludedName(staffName)) return null;
  if (!rows[staffId]) {
    rows[staffId] = {
      staffId,
      name: staffName,
      byDay: makeEmptyDays(),
      totals: {},
    };
  }
  return rows[staffId];
}

function addCellValue(row: WeeklyReportRow | null, day: WeekDayLabel, value?: string | null) {
  const label = String(value || '').trim();
  if (!row || !label || isExcludedName(label)) return;
  if (!row.byDay[day].includes(label)) row.byDay[day].push(label);
  row.totals[label] = (row.totals[label] || 0) + 1;
}

function buildStaffById(snapshot: Snapshot): Record<string, string> {
  const out: Record<string, string> = {};
  snapshot.staff.forEach((staff) => {
    if (staff?.id && staff?.name) out[String(staff.id)] = String(staff.name);
  });
  return out;
}

function buildParticipantById(snapshot: Snapshot): Record<string, string> {
  const out: Record<string, string> = {};
  snapshot.participants.forEach((participant: any) => {
    if (!participant?.id || !participant?.name) return;
    out[String(participant.id)] = String(participant.name);
    if (participant.legacyId != null) out[String(participant.legacyId)] = String(participant.name);
    if (participant.legacy_id != null) out[String(participant.legacy_id)] = String(participant.name);
    if (participant.dbId != null) out[String(participant.dbId)] = String(participant.name);
  });
  return out;
}

function normaliseAssignments(raw: any, staffById: Record<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const obj = safeObject(raw);

  Object.entries(obj).forEach(([keyRaw, value]) => {
    const key = String(keyRaw);

    // Shape A: staffId -> participantIds[]
    if (Array.isArray(value)) {
      if (!staffById[key]) return;
      const pids = value.filter(Boolean).map(String);
      if (!pids.length) return;
      out[key] = Array.from(new Set([...(out[key] || []), ...pids]));
      return;
    }

    // Shape B: participantId -> staffId
    const participantId = key;
    const staffId = value == null ? '' : String(value);
    if (!participantId || !staffId || !staffById[staffId]) return;
    out[staffId] = Array.from(new Set([...(out[staffId] || []), participantId]));
  });

  return out;
}

async function fetchChoreLabels(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('cleaning_chores')
      .select('id, name')
      .order('id', { ascending: true });

    if (error || !data) return {};
    const out: Record<string, string> = {};
    (data as ChoreRow[]).forEach((chore) => {
      if (chore?.id != null && chore?.name) out[String(chore.id)] = String(chore.name);
    });
    return out;
  } catch {
    return {};
  }
}

async function getLatestDaySnapshots(weekOffset: number): Promise<{ week: ReturnType<typeof getWorkingWeek>; days: DaySnapshot[] }> {
  const week = getWorkingWeek(weekOffset);
  const targetKeys = new Set(week.dates.map((d) => d.dateKey));

  const { data, error } = await supabase
    .from('schedules')
    .select('id, house, snapshot, created_at, updated_at, seq_id, schedule_date')
    .eq('house', HOUSE_ID)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  const latestByDate: Record<string, DaySnapshot> = {};

  ((data || []) as ScheduleRow[]).forEach((row) => {
    const snapshot = normaliseSnapshot(row.snapshot);
    const dateKey = getRowDateKey(row, snapshot);
    if (!dateKey || !targetKeys.has(dateKey)) return;
    const dayLabel = labelForDateKey(dateKey);
    if (!dayLabel) return;

    const existing = latestByDate[dateKey];
    if (!existing || compareLatestRows(existing.row, row) < 0) {
      latestByDate[dateKey] = { dateKey, dayLabel, row, snapshot };
    }
  });

  const days = week.dates
    .map(({ dateKey }) => latestByDate[dateKey])
    .filter(Boolean) as DaySnapshot[];

  return { week, days };
}

function finaliseResult(week: ReturnType<typeof getWorkingWeek>, days: DaySnapshot[], rows: Record<string, WeeklyReportRow>): WeeklyReportResult {
  const savedDays = days.map((d) => d.dayLabel);
  const savedSet = new Set(savedDays);
  const missingDays = WEEK_DAYS.filter((d) => !savedSet.has(d));

  const sortedRows = Object.values(rows)
    .filter((row) => !isExcludedName(row.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));

  // Keep values inside each day stable and readable.
  sortedRows.forEach((row) => {
    WEEK_DAYS.forEach((day) => {
      row.byDay[day] = Array.from(new Set(row.byDay[day])).sort((a, b) =>
        a.localeCompare(b, 'en-AU'),
      );
    });
  });

  return {
    weekStartKey: week.startKey,
    weekEndKey: week.endKey,
    weekLabel: week.label,
    rows: sortedRows,
    savedDays,
    missingDays,
  };
}

export async function loadTeamAssignmentsReport(weekOffset: number): Promise<WeeklyReportResult> {
  const { week, days } = await getLatestDaySnapshots(weekOffset);
  const rows: Record<string, WeeklyReportRow> = {};

  days.forEach(({ snapshot, dayLabel }) => {
    const staffById = buildStaffById(snapshot);
    const participantById = buildParticipantById(snapshot);

    // Add all real rostered staff for the day so gaps are visible.
    snapshot.workingStaff.forEach((staffId) => {
      const staffName = staffById[staffId];
      ensureRow(rows, staffId, staffName);
    });

    const assignments = normaliseAssignments(snapshot.assignments, staffById);
    Object.entries(assignments).forEach(([staffId, participantIds]) => {
      const row = ensureRow(rows, staffId, staffById[staffId]);
      participantIds.forEach((participantId) => {
        addCellValue(row, dayLabel, participantById[participantId] || participantId);
      });
    });
  });

  return finaliseResult(week, days, rows);
}

export async function loadCleaningAssignmentsReport(weekOffset: number): Promise<WeeklyReportResult> {
  const [{ week, days }, choreLabels] = await Promise.all([
    getLatestDaySnapshots(weekOffset),
    fetchChoreLabels(),
  ]);
  const rows: Record<string, WeeklyReportRow> = {};

  days.forEach(({ snapshot, dayLabel }) => {
    const staffById = buildStaffById(snapshot);

    // Add all real rostered staff for the day so gaps are visible.
    snapshot.workingStaff.forEach((staffId) => {
      const staffName = staffById[staffId];
      ensureRow(rows, staffId, staffName);
    });

    const cleaningAssignments = safeObject(snapshot.cleaningAssignments);
    Object.entries(cleaningAssignments).forEach(([choreId, staffIdRaw]) => {
      if (!staffIdRaw) return;
      const staffId = String(staffIdRaw);
      const row = ensureRow(rows, staffId, staffById[staffId]);
      addCellValue(row, dayLabel, choreLabels[String(choreId)] || `Chore ${choreId}`);
    });
  });

  return finaliseResult(week, days, rows);
}
