// app/admin/daily-assignments.tsx
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
type SnapshotParticipant = { id: string; name: string };
type SnapshotAssignments = Record<string, string[]>; // participantId -> staffIds[]

type Snapshot = {
  date: string;
  staff?: SnapshotStaff[];
  participants?: SnapshotParticipant[];
  assignments?: SnapshotAssignments;
};

type StaffSummary = {
  staffId: string;
  name: string;
  byDay: Record<WeekDayLabel, string[]>; // participant names
  total: number; // total participants across week
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

  const day = base.getDay(); // 0=Sun,1=Mon...
  const diffToMonday = (day + 6) % 7; // 0 if Monday
  base.setDate(base.getDate() - diffToMonday + weekOffset * 7);
  return base;
}

function getWeekDays(weekStart: Date): { label: WeekDayLabel; iso: string }[] {
  const result: { label: WeekDayLabel; iso: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const label = WEEK_DAYS[i];
    result.push({ label, iso });
  }
  return result;
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 4); // Mon + 4 = Fri

  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
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
      participants: snap.participants ?? [],
      assignments: snap.assignments ?? {},
    };
  } catch {
    return null;
  }
}

export default function DailyAssignmentsReportScreen() {
  const isAdmin = useIsAdmin();
  const [weekOffset, setWeekOffset] = useState(-1); // previous week
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffSummary[]>([]);

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStart), [weekStart]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setRows([]);

      try {
        const rangeStart = new Date(weekStart);
        const rangeEnd = new Date(weekStart);
        rangeEnd.setDate(rangeEnd.getDate() + 7); // Mon..next Mon (exclusive)

        const { data, error: supaError } = await supabase
          .from('schedules')
          .select('id, house, snapshot, created_at, seq_id')
          .eq('house', 'B2')
          .gte('created_at', rangeStart.toISOString())
          .lt('created_at', rangeEnd.toISOString())
          .order('created_at', { ascending: true });

        if (supaError) throw supaError;

        const rowsRaw = (data ?? []) as ScheduleRow[];

        // Pick latest snapshot per day (by seq_id)
        const byDay: Record<
          string,
          { snapshot: Snapshot; seq: number; created_at: string }
        > = {};

        for (const row of rowsRaw) {
          const snap = normaliseSnapshot(row.snapshot);
          if (!snap) continue;
          const dateKey = snap.date.slice(0, 10);
          const seq = row.seq_id ?? 0;
          const existing = byDay[dateKey];
          if (!existing || seq > existing.seq) {
            byDay[dateKey] = { snapshot: snap, seq, created_at: row.created_at };
          }
        }

        // Build staff and participant lookup
        const staffById: Record<string, string> = {};
        const participantByIdByDay: Record<string, Record<string, string>> = {}; // dateKey -> {pid -> name}

        Object.entries(byDay).forEach(([dateKey, { snapshot }]) => {
          (snapshot.staff ?? []).forEach((s) => {
            if (s?.id && s?.name) staffById[s.id] = s.name;
          });

          const map: Record<string, string> = {};
          (snapshot.participants ?? []).forEach((p) => {
            if (p?.id && p?.name) map[p.id] = p.name;
          });
          participantByIdByDay[dateKey] = map;
        });

        const makeEmptyDays = (): Record<WeekDayLabel, string[]> => ({
          Mon: [],
          Tue: [],
          Wed: [],
          Thu: [],
          Fri: [],
        });

        const summaryByStaff: Record<string, StaffSummary> = {};

        for (const { label, iso } of weekDays) {
          const dayEntry = byDay[iso];
          if (!dayEntry) continue;

          const snap = dayEntry.snapshot;
          const assignments = snap.assignments ?? {};
          const participantNames = participantByIdByDay[iso] ?? {};

          // assignments: participantId -> staffIds[]
          Object.entries(assignments).forEach(([participantId, staffIds]) => {
            const participantName =
              participantNames[participantId] ?? `Participant ${participantId}`;

            (staffIds ?? []).forEach((staffId) => {
              if (!staffId) return;

              if (!summaryByStaff[staffId]) {
                summaryByStaff[staffId] = {
                  staffId,
                  name: staffById[staffId] ?? staffId,
                  byDay: makeEmptyDays(),
                  total: 0,
                };
              }

              summaryByStaff[staffId].byDay[label].push(participantName);
              summaryByStaff[staffId].total += 1;
            });
          });
        }

        const summaryArr = Object.values(summaryByStaff).sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return a.name.localeCompare(b.name);
        });

        if (!cancelled) {
          setRows(summaryArr);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading weekly assignments report', err);
        if (!cancelled) {
          setError('Could not load weekly assignment data.');
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
          <Text style={styles.title}>Team Daily Assignment – Weekly Report</Text>
          <Text style={styles.subtitle}>
            Admin Mode is required to view this report. Enable Admin Mode with
            your PIN on the Share screen.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <View className="header-row" style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Team Daily Assignment – Weekly Report</Text>
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

          {!loading && !error && rows.length === 0 && (
            <Text style={styles.helper}>
              No assignment data found for this week.
            </Text>
          )}

          {rows.length > 0 && (
            <View style={styles.table}>
              {/* Header row */}
              <View style={[styles.row, styles.headerRowTable]}>
                <View style={[styles.cell, styles.staffHeaderCell]}>
                  <Text style={[styles.cellText, styles.headerCellText]}>
                    Staff
                  </Text>
                </View>
                {WEEK_DAYS.map((day) => (
                  <View key={day} style={[styles.cell, styles.dayHeaderCell]}>
                    <Text style={[styles.cellText, styles.headerCellText]}>
                      {day}
                    </Text>
                  </View>
                ))}
                <View style={[styles.cell, styles.dayHeaderCell]}>
                  <Text style={[styles.cellText, styles.headerCellText]}>
                    Total
                  </Text>
                </View>
              </View>

              {/* Data rows */}
              {rows.map((row) => (
                <View key={row.staffId} style={styles.row}>
                  <View style={[styles.cell, styles.staffCell]}>
                    <Text style={[styles.cellText, styles.staffText]}>
                      {row.name}
                    </Text>
                  </View>
                  {WEEK_DAYS.map((day) => {
                    const names = row.byDay[day] ?? [];
                    return (
                      <View key={day} style={[styles.cell, styles.dataCell]}>
                        <Text style={styles.cellText}>
                          {names.length ? names.join('\n') : ''}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={[styles.cell, styles.dataCell]}>
                    <Text style={styles.cellText}>{row.total}</Text>
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
    minWidth: 90,
    justifyContent: 'flex-start',
  },
  cellText: {
    fontSize: 11,
    color: '#111827',
    lineHeight: 14,
  },
  headerCellText: {
    fontWeight: '600',
    color: '#111827',
  },
  staffHeaderCell: {
    minWidth: 150,
  },
  dayHeaderCell: {
    alignItems: 'flex-start',
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
