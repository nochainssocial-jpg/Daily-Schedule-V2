// app/admin/daily-assignments-tracker.tsx
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
  date: string | null;
  staff: SnapshotStaff[];
  participants: SnapshotParticipant[];
  assignments: SnapshotAssignments;
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

// ------------------ Utilities -------------------------

function safeDateLabel(dateStr: string): WeekDayLabel | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const js = d.getDay(); // 0=Sun..6=Sat
  const idx = (js + 6) % 7;
  if (idx < 0 || idx > 4) return null;
  return WEEK_DAYS[idx];
}

function safeArray<T>(val: any): T[] {
  return Array.isArray(val) ? val.filter(Boolean) : [];
}

function safeObject(val: any): Record<string, any> {
  return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
}

// ------------------ Normalise Snapshot -------------------------

function normaliseSnapshot(raw: any): Snapshot {
  try {
    const snap = typeof raw === 'string' ? JSON.parse(raw) : raw || {};

    return {
      date: snap.date ?? null,
      staff: safeArray<SnapshotStaff>(snap.staff),
      participants: safeArray<SnapshotParticipant>(snap.participants),
      assignments: safeObject(snap.assignments),
    };
  } catch {
    return {
      date: null,
      staff: [],
      participants: [],
      assignments: {},
    };
  }
}

// ------------------ Component -------------------------

export default function DailyAssignmentsTrackerScreen() {
  const isAdmin = useIsAdmin();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);

  const weekStart = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = (base.getDay() + 6) % 7;
    base.setDate(base.getDate() - diff);
    return base;
  }, []);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 4);
    const opts: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    return `Week: ${weekStart.toLocaleDateString(
      'en-AU',
      opts,
    )} – ${end.toLocaleDateString('en-AU', opts)}`;
  }, [weekStart]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

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

        if (supaError) throw supaError;

        const latestByDay: Record<
          string,
          { snapshot: Snapshot; created_at: string; seq: number }
        > = {};

        for (const row of (data ?? []) as ScheduleRow[]) {
          const snap = normaliseSnapshot(row.snapshot);
          if (!snap) continue;

          const dayKey =
            typeof snap.date === 'string' && snap.date
              ? snap.date.slice(0, 10)
              : row.created_at.slice(0, 10);

          const seq = row.seq_id ?? 0;
          if (!latestByDay[dayKey] || seq > latestByDay[dayKey].seq) {
            latestByDay[dayKey] = {
              snapshot: snap,
              created_at: row.created_at,
              seq,
            };
          }
        }

        const makeDays = () =>
          ({
            Mon: [],
            Tue: [],
            Wed: [],
            Thu: [],
            Fri: [],
          } as Record<WeekDayLabel, string[]>);

        const summary: Record<string, StaffRow> = {};

        for (const [dayKey, { snapshot }] of Object.entries(latestByDay)) {
          const label = safeDateLabel(dayKey);
          if (!label) continue;

          const staffById: Record<string, string> = {};
          snapshot.staff.forEach((s) => {
            if (s?.id && s?.name) staffById[s.id] = s.name;
          });

          const participantsById: Record<string, string> = {};
          snapshot.participants.forEach((p) => {
            if (p?.id && p?.name) participantsById[p.id] = p.name;
          });

          const assignments = safeObject(snapshot.assignments);

          Object.entries(assignments).forEach(([staffId, participantIds]) => {
            if (!Array.isArray(participantIds)) return;

            if (!summary[staffId]) {
              summary[staffId] = {
                staffId,
                name: staffById[staffId] ?? staffId,
                byDay: makeDays(),
              };
            }

            participantIds.forEach((pid) => {
              const name = participantsById[pid];
              if (name) summary[staffId].byDay[label].push(name);
            });
          });
        }

        const arr = Object.values(summary).sort((a, b) =>
          a.name.localeCompare(b.name, 'en-AU'),
        );

        if (!cancelled) setRows(arr);
      } catch (err) {
        console.error('Assignment tracker error:', err);
        if (!cancelled) setError('Could not load weekly tracker.');
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
    if (Platform.OS === 'web') {
      (window as any).print();
    } else {
      console.log('Print is only available on web.');
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Team Daily Assignment – Weekly Tracker</Text>
          <Text style={styles.subtitle}>
            Admin Mode is required. Enable Admin Mode on the Share screen.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.title}>Team Daily Assignment – Weekly Tracker</Text>
        <Text style={styles.subtitle}>
          Live Mon–Fri view. As you save each day’s schedule, this tracker fills
          automatically.
        </Text>
        <Text style={[styles.subtitle, { marginTop: 4 }]}>{weekLabel}</Text>

        {/* Print button */}
        {rows.length > 0 && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
              <Text style={styles.printButtonText}>Print</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && <Text style={styles.helper}>Loading…</Text>}
        {error && <Text style={[styles.helper, { color: 'red' }]}>{error}</Text>}
        {!loading && !error && rows.length === 0 && (
          <Text style={styles.helper}>
            No tracked assignment data yet for this week.
          </Text>
        )}

        {rows.length > 0 && (
          <View style={styles.table}>
            {/* Header */}
            <View style={[styles.row, styles.headerRow]}>
              <View style={[styles.cell, styles.staffCellHeader]}>
                <Text style={[styles.cellText, styles.headerText]}>Staff</Text>
              </View>
              {WEEK_DAYS.map((d) => (
                <View key={d} style={[styles.cell, styles.dayHeaderCell]}>
                  <Text style={[styles.cellText, styles.headerText]}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Rows */}
            {rows.map((row) => (
              <View key={row.staffId} style={styles.row}>
                <View style={[styles.cell, styles.staffCell]}>
                  <Text style={[styles.cellText, styles.staffName]}>
                    {row.name}
                  </Text>
                </View>

                {WEEK_DAYS.map((d) => {
                  const content = (row.byDay[d] ?? []).join('\n');
                  return (
                    <View key={d} style={[styles.cell, styles.dataCell]}>
                      <Text style={styles.cellText}>{content}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ------------------ Styles -------------------------

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
  },
  card: {
    width: '100%',
    maxWidth: 1040,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
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
  printButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F54FA5',
    backgroundColor: '#FDF2FB',
  },
  printButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F54FA5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  headerRow: {
    backgroundColor: '#EFF3FF',
  },
  cell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#EEE',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  cellText: {
    fontSize: 14,
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
  },
});
