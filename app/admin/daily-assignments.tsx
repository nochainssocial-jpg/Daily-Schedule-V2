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
type SnapshotAssignments = Record<string, string[]>; // staffId -> participantIds[]

type Snapshot = {
  date?: string;
  staff?: SnapshotStaff[];
  participants?: SnapshotParticipant[];
  assignments?: SnapshotAssignments;
};

type StaffRow = {
  staffId: string;
  name: string;
  byDay: Record<WeekDayLabel, string[]>; // participant names
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

  const day = base.getDay(); // 0–6 (Sun–Sat)
  const diffToMonday = (day + 6) % 7; // 0 if Monday
  base.setDate(base.getDate() - diffToMonday + weekOffset * 7);
  return base;
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

function getLabelFromDateString(dateStr: string): WeekDayLabel | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const jsDay = d.getDay(); // 0=Sun..6=Sat
  const idx = (jsDay + 6) % 7; // 0=Mon..6=Sun
  if (idx < 0 || idx > 4) return null; // only Mon–Fri
  return WEEK_DAYS[idx];
}

function normaliseSnapshot(raw: any): Snapshot | null {
  if (!raw) return null;
  try {
    const snap: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
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

  // 0 = current week; on a Saturday this is the week that just finished
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);

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
        const rangeStart = new Date(weekStart);
        const rangeEnd = new Date(weekStart);
        rangeEnd.setDate(rangeEnd.getDate() + 7); // [Mon, next Mon)

        const { data, error: supaError } = await supabase
          .from('schedules')
          .select('id, house, snapshot, created_at, seq_id')
          .eq('house', 'B2')
          .gte('created_at', rangeStart.toISOString())
          .lt('created_at', rangeEnd.toISOString())
          .order('created_at', { ascending: true });

        if (supaError) throw supaError;

        const rowsRaw = (data ?? []) as ScheduleRow[];

        // Latest snapshot per calendar day
        const latestByDay: Record<
          string,
          { snapshot: Snapshot; created_at: string; seq: number }
        > = {};

        for (const row of rowsRaw) {
          const snap = normaliseSnapshot(row.snapshot);
          if (!snap) continue;

          const createdKey = row.created_at.slice(0, 10); // YYYY-MM-DD
          const seq = row.seq_id ?? 0;
          const existing = latestByDay[createdKey];

          if (!existing || seq > existing.seq) {
            latestByDay[createdKey] = {
              snapshot: snap,
              created_at: row.created_at,
              seq,
            };
          }
        }

        const makeEmptyDays = (): Record<WeekDayLabel, string[]> => ({
          Mon: [],
          Tue: [],
          Wed: [],
          Thu: [],
          Fri: [],
        });

        const summaryByStaff: Record<string, StaffRow> = {};

        for (const [dayKey, { snapshot }] of Object.entries(latestByDay)) {
          const label = getLabelFromDateString(dayKey);
          if (!label) continue; // weekend

          const staffById: Record<string, string> = {};
          (snapshot.staff ?? []).forEach((s) => {
            if (s?.id && s?.name) staffById[s.id] = s.name;
          });

          const participantsById: Record<string, string> = {};
          (snapshot.participants ?? []).forEach((p) => {
            if (p?.id && p?.name) participantsById[p.id] = p.name;
          });

          const assignments = snapshot.assignments ?? {};

          // assignments: staffId -> participantIds[]
          Object.entries(assignments).forEach(([staffId, participantIds]) => {
            if (!staffId || !Array.isArray(participantIds)) return;

            if (!summaryByStaff[staffId]) {
              summaryByStaff[staffId] = {
                staffId,
                name: staffById[staffId] ?? staffId,
                byDay: makeEmptyDays(),
              };
            }

            const row = summaryByStaff[staffId];

            participantIds.forEach((pid) => {
              const participantName = participantsById[pid];
              if (!participantName) return;
              row.byDay[label].push(participantName);
            });
          });
        }

        const summaryArr = Object.values(summaryByStaff).sort((a, b) =>
          a.name.localeCompare(b.name, 'en-AU'),
        );

        if (!cancelled) {
          setRows(summaryArr);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading weekly assignment report', err);
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
  }, [isAdmin, weekStart]);

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
            Admin Mode is required to view this report. Enable Admin Mode on the
            Share screen.
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
                    const content = names.join('\n'); // one name per line
                    return (
                      <View key={day} style={[styles.cell, styles.dataCell]}>
                        <Text style={styles.cellText}>{content}</Text>
                      </View>
                    );
                  })}
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
    maxWidth: 1040,
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
  },
  cellText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#111827',
    textAlign: 'left',
    flexWrap: 'wrap',
  },
  headerCellText: {
    fontWeight: '600',
    color: '#111827',
  },
  staffHeaderCell: {
    width: 150,
  },
  dayHeaderCell: {
    width: 168,
  },
  staffCell: {
    backgroundColor: '#F9FAFB',
    width: 150,
  },
  staffText: {
    fontWeight: '600',
  },
  dataCell: {
    backgroundColor: '#FFFFFF',
    width: 168,
  },
});
