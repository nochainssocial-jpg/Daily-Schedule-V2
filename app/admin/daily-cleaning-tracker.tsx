import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useIsAdmin } from '@/hooks/access-control';
import { supabase } from '@/lib/supabase';
import { useSchedule } from '@/hooks/schedule-store';

const HOUSE_ID = 'B2';
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
type WeekDayLabel = (typeof WEEK_DAYS)[number];

type SnapshotStaff = { id: string; name: string };
type SnapshotParticipant = { id: string; name: string };

type ScheduleRow = {
  id: string;
  house: string;
  snapshot: any;
  created_at: string | null;
  updated_at?: string | null;
  seq_id: number | null;
  schedule_date?: string | null;
};

type StaffRow = {
  staffId: string;
  name: string;
  byDay: Record<WeekDayLabel, string[]>;
};

type Snapshot = {
  date?: string | null;
  staff?: SnapshotStaff[];
  participants?: SnapshotParticipant[];
  assignments?: any;
  cleaningAssignments?: any;
};

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
      assignments: safeObject(snap.assignments),
      cleaningAssignments: safeObject(snap.cleaningAssignments),
    };
  } catch {
    return {
      date: null,
      staff: [],
      participants: [],
      assignments: {},
      cleaningAssignments: {},
    };
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateKey(value?: string | null): Date | null {
  if (!value) return null;
  const key = String(value).slice(0, 10);
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function sydneyTodayKey(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {}

  return toDateKey(new Date());
}

function getWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffToMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);
  return start;
}

function getWeekStartForOffset(weekOffset: number): Date {
  const today = parseDateKey(sydneyTodayKey()) ?? new Date();
  const start = getWeekStart(today);
  start.setDate(start.getDate() + weekOffset * 7);
  return start;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + days);
  return out;
}

function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 4);
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return `Week: ${weekStart.toLocaleDateString('en-AU', opts)} – ${end.toLocaleDateString('en-AU', opts)}`;
}

function labelForDateKey(dateKey: string): WeekDayLabel | null {
  const d = parseDateKey(dateKey);
  if (!d) return null;
  const idx = (d.getDay() + 6) % 7;
  return idx >= 0 && idx < 5 ? WEEK_DAYS[idx] : null;
}

function getRowDateKey(row: ScheduleRow, snapshot: Snapshot): string | null {
  // Primary source: new database column. This is the business/working date.
  if (typeof row.schedule_date === 'string' && parseDateKey(row.schedule_date)) {
    return row.schedule_date.slice(0, 10);
  }

  // Backwards compatibility for older rows saved before schedule_date existed.
  if (typeof snapshot.date === 'string' && parseDateKey(snapshot.date)) {
    return snapshot.date.slice(0, 10);
  }

  // Last resort only: created_at converted by the user's browser/local runtime.
  if (typeof row.created_at === 'string' && row.created_at) {
    const d = new Date(row.created_at);
    if (!Number.isNaN(d.getTime())) return toDateKey(d);
  }

  return null;
}

function compareLatest(a: ScheduleRow, b: ScheduleRow): number {
  const seqA = typeof a.seq_id === 'number' ? a.seq_id : 0;
  const seqB = typeof b.seq_id === 'number' ? b.seq_id : 0;
  if (seqA !== seqB) return seqA - seqB;

  const timeA = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
  const timeB = new Date(b.updated_at || b.created_at || 0).getTime() || 0;
  return timeA - timeB;
}

function makeEmptyDays(): Record<WeekDayLabel, string[]> {
  return { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
}

function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function toStringArray(v: any): string[] {
  return Array.isArray(v) ? v.filter(Boolean).map((x) => String(x)) : [];
}

function resolveStaffIdFromKey(
  key: string,
  staffById: Record<string, string>,
  staffList: SnapshotStaff[],
): string | null {
  const k = String(key ?? '').trim();
  if (!k) return null;
  if (staffById[k]) return k;

  if (/^\d+$/.test(k)) {
    const n = parseInt(k, 10);
    if (staffList[n]?.id) return staffList[n].id;
    if (n > 0 && staffList[n - 1]?.id) return staffList[n - 1].id;
  }

  const lower = k.toLowerCase();
  return staffList.find((s) => String(s?.name ?? '').toLowerCase() === lower)?.id ?? null;
}

function normaliseAssignments(
  raw: any,
  staffById: Record<string, string>,
  staffList: SnapshotStaff[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};

  if (isPlainObject(raw)) {
    let sawArray = false;
    let sawScalar = false;
    for (const v of Object.values(raw)) {
      if (Array.isArray(v)) sawArray = true;
      else if (v != null) sawScalar = true;
    }

    // Shape A: staffId -> participantIds[]
    if (sawArray) {
      for (const [key, pids] of Object.entries(raw)) {
        const sid = resolveStaffIdFromKey(String(key), staffById, staffList);
        if (!sid) continue;
        const arr = toStringArray(pids);
        if (arr.length) out[sid] = (out[sid] ?? []).concat(arr);
      }
      return out;
    }

    // Shape B: participantId -> staffId, which is the current Edit Hub save shape.
    if (sawScalar) {
      for (const [participantIdRaw, staffKeyRaw] of Object.entries(raw)) {
        const participantId = String(participantIdRaw ?? '').trim();
        if (!participantId || !staffKeyRaw) continue;
        const sid = resolveStaffIdFromKey(String(staffKeyRaw), staffById, staffList);
        if (!sid) continue;
        out[sid] = out[sid] ?? [];
        out[sid].push(participantId);
      }
    }

    return out;
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item) continue;

      if (Array.isArray(item) && item.length >= 2) {
        const sid = resolveStaffIdFromKey(String(item[0]), staffById, staffList);
        if (!sid) continue;
        const arr = toStringArray(item[1]);
        if (arr.length) out[sid] = (out[sid] ?? []).concat(arr);
        continue;
      }

      if (isPlainObject(item)) {
        const sid = resolveStaffIdFromKey(
          String(item.staffId ?? item.staff_id ?? item.staffKey ?? item.staff_key ?? item.staff ?? item.name ?? ''),
          staffById,
          staffList,
        );
        if (!sid) continue;
        const arr = toStringArray(item.participantIds ?? item.participant_ids ?? item.participants ?? item.value);
        if (arr.length) out[sid] = (out[sid] ?? []).concat(arr);
      }
    }
  }

  return out;
}

async function fetchLatestSchedulesForWeek(weekStart: Date): Promise<Array<{ row: ScheduleRow; snapshot: Snapshot; dateKey: string; label: WeekDayLabel }>> {
  const startKey = toDateKey(weekStart);
  const endKey = toDateKey(addDays(weekStart, 7));

  // Primary query: schedule_date is the business date. It is stable across AEST/AEDT.
  // We also fetch a fallback recent window for older records with schedule_date = null.
  const { data, error } = await supabase
    .from('schedules')
    .select('id, house, snapshot, created_at, updated_at, seq_id, schedule_date')
    .eq('house', HOUSE_ID)
    .order('seq_id', { ascending: false })
    .limit(1000);

  if (error) throw error;

  const latestByDate: Record<string, { row: ScheduleRow; snapshot: Snapshot; dateKey: string; label: WeekDayLabel }> = {};

  for (const row of (data ?? []) as ScheduleRow[]) {
    const snapshot = normaliseSnapshot(row.snapshot);
    const dateKey = getRowDateKey(row, snapshot);
    if (!dateKey || dateKey < startKey || dateKey >= endKey) continue;

    const label = labelForDateKey(dateKey);
    if (!label) continue;

    const existing = latestByDate[dateKey];
    if (!existing || compareLatest(existing.row, row) < 0) {
      latestByDate[dateKey] = { row, snapshot, dateKey, label };
    }
  }

  return Object.values(latestByDate).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function getAdminMessage(isCleaning: boolean, isTracker: boolean): string {
  if (isCleaning) {
    return isTracker ? 'Could not load weekly cleaning tracker data.' : 'Could not load weekly cleaning data.';
  }
  return isTracker ? 'Could not load weekly assignment tracker data.' : 'Could not load weekly assignment data.';
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    padding: 16,
  },
  screen: {
    flex: 1,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 1040,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
  },
  navButtonText: {
    fontSize: 13,
    color: '#1F2933',
  },
  printButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F54FA5',
    backgroundColor: '#FDF2FB',
    marginLeft: 8,
  },
  printButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F54FA5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#332244',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.8,
    color: '#5a486b',
  },
  helper: {
    marginTop: 8,
    fontSize: 14,
    color: '#444',
  },
  actionsRow: {
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  table: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  headerRowTable: {
    backgroundColor: '#EFF3FF',
  },
  cell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#EEE',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
  },
  cellText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#111827',
  },
  headerText: {
    fontWeight: '700',
  },
  staffCellHeader: {
    width: 150,
  },
  dayHeaderCell: {
    width: 168,
  },
  staffCell: {
    width: 150,
    backgroundColor: '#F8F8F8',
  },
  staffName: {
    fontWeight: '600',
  },
  dataCell: {
    width: 168,
    backgroundColor: '#FFFFFF',
  },
});

export default function DailyCleaningTrackerScreen() {
  const { chores = [] } = useSchedule() as any;
  const choreLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    (chores || []).forEach((chore: any) => {
      if (chore?.id && chore?.name) map[String(chore.id)] = String(chore.name);
    });
    return map;
  }, [chores]);
  const isAdmin = useIsAdmin();
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);

  const weekStart = useMemo(() => getWeekStartForOffset(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStart), [weekStart]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setRows([]);

      try {
        const days = await fetchLatestSchedulesForWeek(weekStart);
        const summary: Record<string, StaffRow> = {};

        for (const { snapshot, label } of days) {
          const staffById: Record<string, string> = {};
          (snapshot.staff ?? []).forEach((s) => {
            if (s?.id && s?.name) staffById[String(s.id)] = String(s.name);
          });

          
          const cleaningAssignments = safeObject(snapshot.cleaningAssignments);

          Object.entries(cleaningAssignments).forEach(([choreId, staffIdRaw]) => {
            if (!staffIdRaw) return;
            const staffId = String(staffIdRaw);
            const staffName = staffById[staffId];
            if (!staffName) return;

            const choreLabel = choreLabelById[String(choreId)] ?? `Chore ${choreId}`;

            if (!summary[staffId]) {
              summary[staffId] = {
                staffId,
                name: staffName,
                byDay: makeEmptyDays(),
              };
            }

            summary[staffId].byDay[label].push(choreLabel);
          });

        }

        const result = Object.values(summary).sort((a, b) =>
          a.name.localeCompare(b.name, 'en-AU'),
        );

        if (!cancelled) setRows(result);
      } catch (err) {
        console.error('Cleaning Assignments Tracker load error:', err);
        if (!cancelled) setError(getAdminMessage(true, true));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, weekStart]);

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).print) {
      (window as any).print();
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Cleaning Assignments Tracker</Text>
          <Text style={styles.subtitle}>Admin Mode is required. Enable Admin Mode on the Share screen.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>TITLE</Text>
            <Text style={styles.subtitle}>Live Mon–Fri view based on the saved Sydney schedule date.</Text>
            <Text style={[styles.subtitle, { marginTop: 4 }]}>{weekLabel}</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekOffset((prev) => prev - 1)}>
              <Text style={styles.navButtonText}>{'‹ Prev'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekOffset(0)}>
              <Text style={styles.navButtonText}>Current</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekOffset((prev) => prev + 1)}>
              <Text style={styles.navButtonText}>{'Next ›'}</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && rows.length > 0 && (
              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Text style={styles.printButtonText}>Print</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        

        {loading && <Text style={styles.helper}>Loading weekly data…</Text>}
        {error && <Text style={[styles.helper, { color: '#B91C1C' }]}>{error}</Text>}
        {!loading && !error && rows.length === 0 && (
          <Text style={styles.helper}>No cleaning assignment data found for this week.</Text>
        )}

        {rows.length > 0 && (
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRowTable]}>
              <View style={[styles.cell, styles.staffCellHeader]}>
                <Text style={[styles.cellText, styles.headerText]}>Staff</Text>
              </View>
              {WEEK_DAYS.map((day) => (
                <View key={day} style={[styles.cell, styles.dayHeaderCell]}>
                  <Text style={[styles.cellText, styles.headerText]}>{day}</Text>
                </View>
              ))}
            </View>

            {rows.map((row) => (
              <View key={row.staffId} style={styles.row}>
                <View style={[styles.cell, styles.staffCell]}>
                  <Text style={[styles.cellText, styles.staffName]}>{row.name}</Text>
                </View>
                {WEEK_DAYS.map((day) => (
                  <View key={day} style={[styles.cell, styles.dataCell]}>
                    <Text style={styles.cellText}>{(row.byDay[day] ?? []).join('\n\n')}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
