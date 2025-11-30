// app/admin/daily-cleaning-tracker.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useIsAdmin } from '@/hooks/access-control';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
type WeekDayLabel = (typeof WEEK_DAYS)[number];

type SnapshotStaff = { id: string; name: string };
type CleaningMap = Record<string, string[]>;

type Snapshot = {
  date: string | null;
  staff: SnapshotStaff[];
  cleaningAssignments: CleaningMap;
};

type CleaningRow = {
  staffId: string;
  name: string;
  byDay: Record<WeekDayLabel, string[]>;
};

// --------------------------- SAFE HELPERS ---------------------------

function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

function safeObject<T extends object>(v: any): T {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as T)
    : ({} as T);
}

function safeDateLabel(dateStr: string): WeekDayLabel | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const js = d.getDay(); // 0=Sun..6=Sat
  const idx = (js + 6) % 7;
  return idx >= 0 && idx < 5 ? WEEK_DAYS[idx] : null;
}

// --------------------------- NORMALISE SNAPSHOT ---------------------------

function normaliseSnapshot(raw: any): Snapshot {
  try {
    const snap = typeof raw === 'string' ? JSON.parse(raw) : raw || {};

    return {
      date: snap.date ?? null,
      staff: safeArray<SnapshotStaff>(snap.staff),
      cleaningAssignments: safeObject<CleaningMap>(snap.cleaningAssignments),
    };
  } catch {
    return { date: null, staff: [], cleaningAssignments: {} };
  }
}

// --------------------------- COMPONENT ---------------------------

export default function DailyCleaningTrackerScreen() {
  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<CleaningRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute start of week (Mon)
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
    return `Week: ${weekStart.toLocaleDateString('en-AU', opts)} – ${end.toLocaleDateString(
      'en-AU',
      opts,
    )}`;
  }, [weekStart]);

  useEffect(() => {
    if (!isAdmin) return;

    let stop = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const rangeStart = new Date(weekStart);
        const rangeEnd = new Date(weekStart);
        rangeEnd.setDate(rangeEnd.getDate() + 7);

        const { data, error: e } = await supabase
          .from('schedules')
          .select('id, snapshot, created_at, seq_id')
          .eq('house', 'B2')
          .gte('created_at', rangeStart.toISOString())
          .lt('created_at', rangeEnd.toISOString())
          .order('created_at', { ascending: true });

        if (e) throw e;

        // newest per day
        const byDay: Record<
          string,
          { snapshot: Snapshot; created_at: string; seq: number }
        > = {};

        for (const row of data ?? []) {
          const snap = normaliseSnapshot(row.snapshot);
          const dayKey = row.created_at?.slice(0, 10);
          if (!dayKey) continue;

          const seq = row.seq_id ?? 0;

          if (!byDay[dayKey] || seq > byDay[dayKey].seq) {
            byDay[dayKey] = { snapshot: snap, created_at: row.created_at, seq };
          }
        }

        const makeEmpty = () =>
          ({
            Mon: [],
            Tue: [],
            Wed: [],
            Thu: [],
            Fri: [],
          } as Record<WeekDayLabel, string[]>);

        const summary: Record<string, CleaningRow> = {};

        for (const [dayKey, { snapshot }] of Object.entries(byDay)) {
          const label = safeDateLabel(dayKey);
          if (!label) continue;

          const staffById: Record<string, string> = {};
          snapshot.staff.forEach((s) => {
            if (s?.id && s?.name) staffById[s.id] = s.name;
          });

          const clean = safeObject<CleaningMap>(snapshot.cleaningAssignments);

          for (const [staffId, tasks] of Object.entries(clean)) {
            const safeTasks = safeArray<string>(tasks);

            if (!summary[staffId]) {
              summary[staffId] = {
                staffId,
                name: staffById[staffId] ?? staffId,
                byDay: makeEmpty(),
              };
            }

            safeTasks.forEach((t) => summary[staffId].byDay[label].push(t));
          }
        }

        const result = Object.values(summary).sort((a, b) =>
          a.name.localeCompare(b.name, 'en-AU'),
        );

        if (!stop) setRows(result);
      } catch (err) {
        console.error('Cleaning tracker error:', err);
        if (!stop) setError('Could not load cleaning tracker.');
      } finally {
        if (!stop) setLoading(false);
      }
    }

    load();
    return () => {
      stop = true;
    };
  }, [isAdmin, weekStart]);

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Cleaning Assignments Tracker</Text>
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
        <Text style={styles.title}>Cleaning Assignments Tracker</Text>
        <Text style={styles.subtitle}>
          Live Mon–Fri view of cleaning duties for the current week.
        </Text>
        <Text style={[styles.subtitle, { marginTop: 4 }]}>{weekLabel}</Text>

        {loading && <Text style={styles.helper}>Loading…</Text>}
        {error && <Text style={[styles.helper, { color: 'red' }]}>{error}</Text>}
        {!loading && !error && rows.length === 0 && (
          <Text style={styles.helper}>
            No tracked cleaning data yet for this week.
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
            {rows.map((r) => (
              <View key={r.staffId} style={styles.row}>
                <View style={[styles.cell, styles.staffCell]}>
                  <Text style={[styles.cellText, styles.staffName]}>
                    {r.name}
                  </Text>
                </View>

                {WEEK_DAYS.map((d) => {
                  const val = r.byDay[d]?.join('\n') ?? '';
                  return (
                    <View key={d} style={[styles.cell, styles.dataCell]}>
                      <Text style={styles.cellText}>{val}</Text>
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

// --------------------------- STYLES ---------------------------

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
  table: {
    marginTop: 20,
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
