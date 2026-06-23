// app/admin/daily-assignments.tsx
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

const HOUSE_ID = 'B2';
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
type WeekDayLabel = (typeof WEEK_DAYS)[number];

type SnapshotStaff = { id: string; name: string };
type SnapshotParticipant = { id: string; name: string };

type Snapshot = {
  date?: string | null;
  staff?: SnapshotStaff[];
  participants?: SnapshotParticipant[];
  assignments?: any;
};

type StaffRow = {
  staffId: string;
  name: string;
  byDay: Record<WeekDayLabel, string[]>;
};

type ScheduleRow = {
  id: string;
  house: string;
  snapshot: any;
  created_at: string;
  seq_id: number | null;
};

type WeekBucket = {
  startKey: string;
  start: Date;
};

type DayCandidate = {
  snapshot: Snapshot;
  created_at: string;
  seq: number;
  hasData: boolean;
};

function safeArray<T>(value: any): T[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function safeObject(value: any): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseDateKey(value?: string | null): Date | null {
  if (!value) return null;
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function getDateKeyFromRow(row: ScheduleRow, snap: Snapshot): string | null {
  if (typeof snap.date === 'string' && snap.date.trim()) {
    const key = snap.date.slice(0, 10);
    return parseDateKey(key) ? key : null;
  }

  if (typeof row.created_at === 'string' && row.created_at) {
    const created = new Date(row.created_at);
    if (!Number.isNaN(created.getTime())) return toLocalDateKey(created);
  }

  return null;
}

function getWeekStartForDateKey(dateKey: string): Date | null {
  const d = parseDateKey(dateKey);
  if (!d) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffToMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);
  return start;
}

function getWeekStartKeyForDateKey(dateKey: string): string | null {
  const start = getWeekStartForDateKey(dateKey);
  return start ? toLocalDateKey(start) : null;
}

function getLabelFromDateKey(dateKey: string): WeekDayLabel | null {
  const d = parseDateKey(dateKey);
  if (!d) return null;
  const idx = (d.getDay() + 6) % 7;
  return idx >= 0 && idx < 5 ? WEEK_DAYS[idx] : null;
}

function formatWeekLabel(weekStart: Date | null): string {
  if (!weekStart) return 'Week: No saved working week found';
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 4);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `Week: ${weekStart.toLocaleDateString('en-AU', opts)} – ${end.toLocaleDateString('en-AU', opts)}`;
}

function normaliseSnapshot(raw: any): Snapshot | null {
  if (!raw) return null;
  try {
    const snap = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      date: snap.date ?? null,
      staff: safeArray<SnapshotStaff>(snap.staff),
      participants: safeArray<SnapshotParticipant>(snap.participants),
      assignments: safeObject(snap.assignments),
    };
  } catch {
    return null;
  }
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

    // staffId -> participantIds[]
    if (sawArray) {
      for (const [key, pids] of Object.entries(raw)) {
        const sid = resolveStaffIdFromKey(String(key), staffById, staffList);
        if (!sid) continue;
        const arr = toStringArray(pids);
        if (arr.length) out[sid] = (out[sid] ?? []).concat(arr);
      }
      return out;
    }

    // participantId -> staffId, which is the current Edit Hub save shape.
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
        const arr = toStringArray(item.participantIds ?? item.participant_ids ?? item.participants ?? item.value);
        if (sid && arr.length) out[sid] = (out[sid] ?? []).concat(arr);
      }
    }
  }

  return out;
}

function snapshotHasAssignmentData(snapshot: Snapshot): boolean {
  const staffById: Record<string, string> = {};
  safeArray<SnapshotStaff>(snapshot.staff).forEach((s) => {
    if (s?.id && s?.name) staffById[String(s.id)] = s.name;
  });
  const assignments = normaliseAssignments(snapshot.assignments, staffById, safeArray<SnapshotStaff>(snapshot.staff));
  return Object.values(assignments).some((ids) => Array.isArray(ids) && ids.length > 0);
}

function isNewerCandidate(current: DayCandidate | undefined, candidate: DayCandidate): boolean {
  if (!current) return true;

  // Prefer a saved schedule that actually contains relevant report data.
  // This prevents a later partial/blank save for the same day from wiping the report.
  if (candidate.hasData !== current.hasData) return candidate.hasData;

  if (candidate.seq !== current.seq) return candidate.seq > current.seq;
  return String(candidate.created_at || '') > String(current.created_at || '');
}

function makeEmptyDays(): Record<WeekDayLabel, string[]> {
  return { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
}

export default function DailyAssignmentsReportScreen() {
  const isAdmin = useIsAdmin();
  const [weekIndex, setWeekIndex] = useState(0); // 0 = latest saved working week, 1 = previous saved working week
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [weeks, setWeeks] = useState<WeekBucket[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekBucket | null>(null);

  const weekLabel = useMemo(() => formatWeekLabel(selectedWeek?.start ?? null), [selectedWeek]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setRows([]);

      try {
        const { data, error: supaError } = await supabase
          .from('schedules')
          .select('id, house, snapshot, created_at, seq_id')
          .eq('house', HOUSE_ID)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (supaError) throw supaError;

        const rowsRaw = (data ?? []) as ScheduleRow[];
        const parsed: Array<{ row: ScheduleRow; snapshot: Snapshot; dateKey: string; weekKey: string; weekStart: Date }> = [];
        const weekMap: Record<string, WeekBucket> = {};

        for (const row of rowsRaw) {
          const snapshot = normaliseSnapshot(row.snapshot);
          if (!snapshot) continue;
          const dateKey = getDateKeyFromRow(row, snapshot);
          if (!dateKey) continue;
          if (!getLabelFromDateKey(dateKey)) continue; // only Mon-Fri working schedules
          const weekStart = getWeekStartForDateKey(dateKey);
          const weekKey = getWeekStartKeyForDateKey(dateKey);
          if (!weekStart || !weekKey) continue;

          parsed.push({ row, snapshot, dateKey, weekKey, weekStart });
          if (!weekMap[weekKey]) weekMap[weekKey] = { startKey: weekKey, start: weekStart };
        }

        const sortedWeeks = Object.values(weekMap).sort((a, b) => b.startKey.localeCompare(a.startKey));
        const safeWeekIndex = Math.min(Math.max(weekIndex, 0), Math.max(sortedWeeks.length - 1, 0));
        const week = sortedWeeks[safeWeekIndex] ?? null;

        const latestByDay: Record<string, DayCandidate> = {};
        if (week) {
          for (const item of parsed) {
            if (item.weekKey !== week.startKey) continue;

            const candidate: DayCandidate = {
              snapshot: item.snapshot,
              created_at: item.row.created_at,
              seq: typeof item.row.seq_id === 'number' ? item.row.seq_id : 0,
              hasData: snapshotHasAssignmentData(item.snapshot),
            };

            if (isNewerCandidate(latestByDay[item.dateKey], candidate)) {
              latestByDay[item.dateKey] = candidate;
            }
          }
        }

        const summaryByStaff: Record<string, StaffRow> = {};

        for (const [dateKey, { snapshot }] of Object.entries(latestByDay)) {
          const label = getLabelFromDateKey(dateKey);
          if (!label) continue;

          const staffById: Record<string, string> = {};
          safeArray<SnapshotStaff>(snapshot.staff).forEach((s) => {
            if (s?.id && s?.name) staffById[String(s.id)] = s.name;
          });

          const participantsById: Record<string, string> = {};
          safeArray<SnapshotParticipant>(snapshot.participants).forEach((p) => {
            if (p?.id && p?.name) participantsById[String(p.id)] = p.name;
          });

          const assignments = normaliseAssignments(snapshot.assignments, staffById, safeArray<SnapshotStaff>(snapshot.staff));

          Object.entries(assignments).forEach(([staffId, participantIds]) => {
            if (!staffId || !Array.isArray(participantIds)) return;
            if (!summaryByStaff[staffId]) {
              summaryByStaff[staffId] = {
                staffId,
                name: staffById[staffId] ?? staffId,
                byDay: makeEmptyDays(),
              };
            }

            participantIds.forEach((pid) => {
              const participantName = participantsById[String(pid)];
              if (participantName) summaryByStaff[staffId].byDay[label].push(participantName);
            });
          });
        }

        const summaryArr = Object.values(summaryByStaff).sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));

        if (!cancelled) {
          setWeeks(sortedWeeks);
          setSelectedWeek(week);
          setRows(summaryArr);
        }
      } catch (err) {
        console.error('Error loading weekly assignment report', err);
        if (!cancelled) setError('Could not load weekly assignment data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, weekIndex]);

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) window.print();
  };

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Team Daily Assignment – Weekly Report</Text>
          <Text style={styles.subtitle}>Admin Mode is required to view this report. Enable Admin Mode on the Share screen.</Text>
        </View>
      </View>
    );
  }

  const canGoNewer = weekIndex > 0;
  const canGoOlder = weekIndex < weeks.length - 1;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Team Daily Assignment – Weekly Report</Text>
            <Text style={styles.subtitle}>{weekLabel}</Text>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity style={[styles.navButton, !canGoOlder && styles.navButtonDisabled]} disabled={!canGoOlder} onPress={() => setWeekIndex((prev) => prev + 1)}>
              <Text style={styles.navButtonText}>{'‹'} Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekIndex(0)}>
              <Text style={styles.navButtonText}>Current</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navButton, !canGoNewer && styles.navButtonDisabled]} disabled={!canGoNewer} onPress={() => setWeekIndex((prev) => Math.max(0, prev - 1))}>
              <Text style={styles.navButtonText}>Next {'›'}</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && rows.length > 0 && (
              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Text style={styles.printButtonText}>Print</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tableWrapper} id="print-area">
          {loading && <Text style={styles.helper}>Loading weekly data…</Text>}
          {error && <Text style={[styles.helper, { color: '#B91C1C' }]}>{error}</Text>}
          {!loading && !error && rows.length === 0 && <Text style={styles.helper}>No assignment data found for this saved working week.</Text>}

          {rows.length > 0 && (
            <View style={styles.table}>
              <View style={[styles.row, styles.headerRowTable]}>
                <View style={[styles.cell, styles.staffHeaderCell]}><Text style={[styles.cellText, styles.headerCellText]}>Staff</Text></View>
                {WEEK_DAYS.map((day) => <View key={day} style={[styles.cell, styles.dayHeaderCell]}><Text style={[styles.cellText, styles.headerCellText]}>{day}</Text></View>)}
              </View>
              {rows.map((row) => (
                <View key={row.staffId} style={styles.row}>
                  <View style={[styles.cell, styles.staffCell]}><Text style={[styles.cellText, styles.staffText]}>{row.name}</Text></View>
                  {WEEK_DAYS.map((day) => <View key={day} style={[styles.cell, styles.dataCell]}><Text style={styles.cellText}>{(row.byDay[day] ?? []).join('\n')}</Text></View>)}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#E0E7FF', alignItems: 'center', padding: 16 },
  screen: { flex: 1, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 1040, backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  navButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5F5', marginLeft: 8, marginBottom: 6, backgroundColor: '#FFFFFF' },
  navButtonDisabled: { opacity: 0.45 },
  navButtonText: { fontSize: 13, color: '#1F2933' },
  printButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#F54FA5', backgroundColor: '#FDF2FB', marginLeft: 8, marginBottom: 6 },
  printButtonText: { fontSize: 13, fontWeight: '600', color: '#F54FA5', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 18, fontWeight: '700', color: '#332244' },
  subtitle: { fontSize: 13, opacity: 0.8, color: '#5a486b' },
  tableWrapper: { marginTop: 8 },
  helper: { fontSize: 13, color: '#4B5563' },
  table: { marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  headerRowTable: { backgroundColor: '#EFF3FF' },
  cell: { paddingHorizontal: 8, paddingVertical: 6, borderRightWidth: 1, borderRightColor: '#E5E7EB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', justifyContent: 'flex-start', alignItems: 'flex-start', flexShrink: 0, flexGrow: 0, overflow: 'hidden' },
  cellText: { fontSize: 15, lineHeight: 20, color: '#111827', textAlign: 'left', flexWrap: 'wrap' },
  headerCellText: { fontWeight: '600', color: '#111827' },
  staffHeaderCell: { width: 150 },
  dayHeaderCell: { width: 168 },
  staffCell: { backgroundColor: '#F9FAFB', width: 150 },
  staffText: { fontWeight: '600' },
  dataCell: { backgroundColor: '#FFFFFF', width: 168 },
});
