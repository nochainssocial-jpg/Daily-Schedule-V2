// app/admin/cleaning-assignments.tsx
import React, { useState, useMemo, useEffect } from 'react';
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

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
type WeekDayLabel = (typeof WEEK_DAYS)[number];

type SnapshotStaff = { id: string; name: string };
type SnapshotCleaningAssignments = Record<string, string>; // taskId -> staffId

type Snapshot = {
  date: string;
  staff?: SnapshotStaff[];
  cleaningAssignments?: SnapshotCleaningAssignments;
};

type CleaningSummaryRow = {
  staffId: string;
  name: string;
  byDay: Record<WeekDayLabel, number>;
  totalJobs: number;
};

type ScheduleRow = {
  id: string;
  house: string;
  snapshot: any;
  created_at: string;
  seq_id: number | null;
};

function getWeekStart(weekOffset: number): Date {
  const now = new Date();
  const base = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const day = base.getDay();
  const diffToMonday = (day + 6) % 7;
  base.setDate(base.getDate() - diffToMonday + weekOffset * 7);
  return base;
}

function getWeekDays(weekStart: Date): { label: WeekDayLabel; iso: string }[] {
  const result: { label: WeekDayLabel; iso: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const label = WEEK_DAYS[i];
    result.push({ label, iso });
  }
  return result;
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 4);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const startStr = weekStart.toLocaleDateString('en-AU', opts);
  const endStr = end.toLocaleDateString('en-AU', opts);
  return `Week: ${startStr} – ${endStr}`;
}

function normaliseSnapshot(raw: any): Snapshot | null {
  if (!raw) return null;
  try {
    const snap: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!snap.date) return null;
    return {
      date: snap.date,
      staff: snap.staff ?? [],
      cleaningAssignments: snap.cleaningAssignments ?? {},
    };
  } catch {
    return null;
  }
}

export default function CleaningAssignmentsReportScreen() {
  const isAdmin = useIsAdmin();
  const [weekOffset, setWeekOffset] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CleaningSummaryRow[]>([]);

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStart), [weekStart]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSummary([]);

      try {
        const rangeStart = new Date(weekStart);
        const rangeEnd = new Date(weekStart);
        rangeEnd.setDate(rangeEnd.getDate() + 7);

        const { data, error: supaError } = await supabase
          .from('schedules')
          .select('id, house, snapshot, created_at, seq_id')
          .eq('house', 'B2')
          .gte('created_at', rangeStart.toISOString())
          .lt('created_at', rangeEnd.toISOString())
          .order('created_at', { ascending: true });

        if (supaError) {
          throw supaError;
        }

        const rows = (data ?? []) as ScheduleRow[];

        const byDay: Record<
          string,
          { snapshot: Snapshot; seq: number; created_at: string }
        > = {};

        for (const row of rows) {
          const snap = normaliseSnapshot(row.snapshot);
          if (!snap) continue;
          const dateKey = snap.date.slice(0, 10);
          const seq = row.seq_id ?? 0;
          const existing = byDay[dateKey];

          if (!existing || seq > existing.seq) {
            byDay[dateKey] = {
              snapshot: snap,
              seq,
              created_at: row.created_at,
            };
          }
        }

        const staffById: Record<string, string> = {};
        Object.values(byDay).forEach(({ snapshot }) => {
          (snapshot.staff ?? []).forEach((s) => {
            if (s?.id && s?.name) {
              staffById[s.id] = s.name;
            }
          });
        });

        const summaryByStaff: Record<string, CleaningSummaryRow> = {};
        const makeEmptyDayCounts = (): Record<WeekDayLabel, number> =>
          ({ Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 });

        for (const { label, iso } of weekDays) {
          const dayEntry = byDay[iso];
          if (!dayEntry) continue;

          const snap = dayEntry.snapshot;
          const cleaningAssignments = snap.cleaningAssignments ?? {};

          Object.values(cleaningAssignments).forEach((staffId) => {
            if (!staffId) return;

            if (!summaryByStaff[staffId]) {
              summaryByStaff[staffId] = {
                staffId,
                name: staffById[staffId] ?? staffId,
                byDay: makeEmptyDayCounts(),
                totalJobs: 0,
              };
            }

            summaryByStaff[staffId].byDay[label] =
              (summaryByStaff[staffId].byDay[label] ?? 0) + 1;
            summaryByStaff[staffId].totalJobs += 1;
          });
        }

        const summaryArr = Object.values(summaryByStaff).sort((a, b) => {
          if (b.totalJobs !== a.totalJobs) return b.totalJobs - a.totalJobs;
          return a.name.localeCompare(b.name);
        });

        if (!cancelled) {
          setSummary(summaryArr);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading weekly cleaning report', err);
        if (!cancelled) {
          setError('Could not load weekly cleaning data.');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, weekStart, weekDays]);

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Cleaning – Weekly Report</Text>
          <Text style={styles.subtitle}>
            Admin Mode is required to view this report. Enable Admin Mode with your PIN on the Share screen.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Cleaning – Weekly Report</Text>
            <Text style={styles.subtitle}>{weekLabel}</Text>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setWeekOffset((prev) => prev - 1)}
            >
              <Text style={styles.navButtonText}>{'\u2039'} Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setWeekOffset((prev) => prev + 1)}
            >
              <Text style={styles.navButtonText}>Next {'\u203A'}</Text>
            </TouchableOpacity>

            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Text style={styles.printButtonText}>Print</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tableWrapper} id="print-area">
          {loading && <Text style={styles.helper}>Loading weekly data…</Text>}
          {error && (
            <Text style={[styles.helper, { color: '#B91C1C' }]}>{error}</Text>
          )}

          {!loading && !error && summary.length === 0 && (
            <Text style={styles.helper}>
              No cleaning data found for this week.
            </Text>
          )}

          {summary.length > 0 && (
            <View style={styles.table}>
              {/* Header row */}
              <View style={[styles.row, styles.headerRowTable]}>
                <View style={[styles.cell, styles.staffHeaderCell]}>
                  <Text style={[styles.cellText, styles.headerCellText]}>Staff</Text>
                </View>
                {WEEK_DAYS.map((day) => (
                  <View key={day} style={[styles.cell, styles.dayHeaderCell]}>
                    <Text style={[styles.cellText, styles.headerCellText]}>{day}</Text>
                  </View>
                ))}
                <View style={[styles.cell, styles.dayHeaderCell]}>
                  <Text style={[styles.cellText, styles.headerCellText]}>
                    Total cleaning jobs
                  </Text>
                </View>
              </View>

              {/* Data rows */}
              {summary.map((row) => (
                <View key={row.staffId} style={styles.row}>
                  <View style={[styles.cell, styles.staffCell]}>
                    <Text style={[styles.cellText, styles.staffText]}>
                      {row.name}
                    </Text>
                  </View>
                  {WEEK_DAYS.map((day) => (
                    <View key={day} style={[styles.cell, styles.dataCell]}>
                      <Text style={styles.cellText}>
                        {row.byDay[day] ?? 0}
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.cell, styles.dataCell]}>
                    <Text style={styles.cellText}>{row.totalJobs}</Text>
                  </View>
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
  scroll: {
    flexGrow: 1,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    padding: 16,
  },
  screen: {
    flex: 1,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 880,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#86A2FF',
    marginLeft: 8,
  },
  printButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
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
  tableWrapper: {
    marginTop: 8,
  },
  helper: {
    fontSize: 13,
    color: '#4B5563',
  },
  table: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    minWidth: 70,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 12,
    color: '#111827',
  },
  headerCellText: {
    fontWeight: '600',
    color: '#111827',
  },
  staffHeaderCell: {
    minWidth: 160,
  },
  dayHeaderCell: {
    alignItems: 'center',
  },
  staffCell: {
    backgroundColor: '#F9FAFB',
  },
  staffText: {
    fontWeight: '600',
  },
  dataCell: {
    backgroundColor: '#FFFFFF',
  },
});
