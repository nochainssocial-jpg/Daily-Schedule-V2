// app/admin/daily-cleaning-tracker.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { useIsAdmin } from '@/hooks/access-control';
import { supabase } from '@/lib/supabase';

const HOUSE_ID = 'B2';
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
type WeekDayLabel = (typeof WEEK_DAYS)[number];

type SnapshotStaff = { id: string; name: string };
type SnapshotCleaningAssignments = Record<string, string | null | undefined>;

type Snapshot = {
  date?: string | null;
  staff?: SnapshotStaff[];
  cleaningAssignments?: SnapshotCleaningAssignments;
};

type CleaningRow = {
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

function parseLocalDateKey(value?: string | null): Date | null {
  if (!value) return null;
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function getWeekStart(weekOffset: number): Date {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffToMonday = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - diffToMonday + weekOffset * 7);
  return base;
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 4);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `Week: ${weekStart.toLocaleDateString('en-AU', opts)} – ${end.toLocaleDateString('en-AU', opts)}`;
}

function getLabelFromDateKey(dateKey: string): WeekDayLabel | null {
  const d = parseLocalDateKey(dateKey);
  if (!d) return null;
  const idx = (d.getDay() + 6) % 7;
  return idx >= 0 && idx < 5 ? WEEK_DAYS[idx] : null;
}

function isDateKeyInWeek(dateKey: string, weekStart: Date): boolean {
  const d = parseLocalDateKey(dateKey);
  if (!d) return false;
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

function normaliseSnapshot(raw: any): Snapshot | null {
  if (!raw) return null;
  try {
    const snap = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      date: snap.date ?? null,
      staff: safeArray<SnapshotStaff>(snap.staff),
      cleaningAssignments: safeObject(snap.cleaningAssignments),
    };
  } catch {
    return null;
  }
}

function isNewerCandidate(
  current: { created_at: string; seq: number } | undefined,
  candidate: { created_at: string; seq: number },
): boolean {
  if (!current) return true;
  if (candidate.seq !== current.seq) return candidate.seq > current.seq;
  return String(candidate.created_at || '') > String(current.created_at || '');
}

export default function DailyCleaningTrackerScreen() {
  const { chores = [] } = useSchedule() as any;
  const isAdmin = useIsAdmin();

  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CleaningRow[]>([]);

  const choreLabelById = useMemo(() => {
    const out: Record<string, string> = {};
    safeArray<any>(chores).forEach((chore) => {
      if (chore?.id && chore?.name) out[String(chore.id)] = String(chore.name);
    });
    return out;
  }, [chores]);

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStart), [weekStart]);

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
          .limit(500);

        if (supaError) throw supaError;

        const latestByDay: Record<string, { snapshot: Snapshot; created_at: string; seq: number }> = {};

        for (const row of (data ?? []) as ScheduleRow[]) {
          const snap = normaliseSnapshot(row.snapshot);
          if (!snap) continue;

          const dayKey =
            typeof snap.date === 'string' && snap.date
              ? snap.date.slice(0, 10)
              : toLocalDateKey(new Date(row.created_at));

          if (!dayKey || !isDateKeyInWeek(dayKey, weekStart)) continue;

          const candidate = {
            snapshot: snap,
            created_at: row.created_at,
            seq: typeof row.seq_id === 'number' ? row.seq_id : 0,
          };

          if (isNewerCandidate(latestByDay[dayKey], candidate)) {
            latestByDay[dayKey] = candidate;
          }
        }

        const makeEmptyDays = (): Record<WeekDayLabel, string[]> => ({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] });
        const staffSummary: Record<string, CleaningRow> = {};

        for (const [dayKey, { snapshot }] of Object.entries(latestByDay)) {
          const label = getLabelFromDateKey(dayKey);
          if (!label) continue;

          const staffById: Record<string, string> = {};
          safeArray<SnapshotStaff>(snapshot.staff).forEach((s) => {
            if (s?.id && s?.name) staffById[String(s.id)] = s.name;
          });

          const cleaningAssignments = safeObject(snapshot.cleaningAssignments);

          Object.entries(cleaningAssignments).forEach(([choreId, staffIdRaw]) => {
            const staffId = String(staffIdRaw ?? '').trim();
            if (!staffId) return;

            const staffName = staffById[staffId];
            if (!staffName) return;

            const choreLabel = choreLabelById[String(choreId)] ?? `Chore ${choreId}`;

            if (!staffSummary[staffId]) {
              staffSummary[staffId] = { staffId, name: staffName, byDay: makeEmptyDays() };
            }

            staffSummary[staffId].byDay[label].push(choreLabel);
          });
        }

        const summaryArr = Object.values(staffSummary).sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));
        if (!cancelled) setRows(summaryArr);
      } catch (err) {
        console.error('Cleaning tracker error', err);
        if (!cancelled) setError('Could not load cleaning tracker.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, weekStart, choreLabelById]);

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) window.print();
  };

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Cleaning Assignments Tracker</Text>
          <Text style={styles.subtitle}>Admin Mode is required to view this report. Enable Admin Mode on the Share screen.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Cleaning Assignments Tracker</Text>
            <Text style={styles.subtitle}>{weekLabel}</Text>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekOffset((prev) => prev - 1)}>
              <Text style={styles.navButtonText}>{'‹'} Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekOffset(0)}>
              <Text style={styles.navButtonText}>Current</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => setWeekOffset((prev) => prev + 1)}>
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
          {!loading && !error && rows.length === 0 && <Text style={styles.helper}>No tracked cleaning data yet for this week.</Text>}

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
