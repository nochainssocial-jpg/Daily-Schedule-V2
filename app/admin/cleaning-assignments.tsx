// app/admin/cleaning-assignments.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useIsAdmin } from '@/hooks/access-control';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

type CleaningRow = {
  task: string;
  byDay: { [day: string]: string | null }; // staff name
};

type CleaningSummary = {
  name: string;
  toiletJobs: number;
  totalJobs: number;
};

function getWeekLabel(weekOffset: number): string {
  if (weekOffset === -1) return 'Previous week';
  if (weekOffset === 0) return 'This week';
  if (weekOffset < -1) return `${Math.abs(weekOffset)} weeks ago`;
  if (weekOffset === 1) return 'Next week';
  return `In ${weekOffset} weeks`;
}

// Placeholder – later: wire this to cleaning assignments for the week.
function useWeeklyCleaningReport(weekOffset: number): {
  rows: CleaningRow[];
  summary: CleaningSummary[];
  loading: boolean;
  error: string | null;
} {
  return {
    rows: [],
    summary: [],
    loading: false,
    error: null,
  };
}

export default function CleaningAssignmentsReportScreen() {
  const isAdmin = useIsAdmin();
  const [weekOffset, setWeekOffset] = useState(-1);
  const { rows, summary, loading, error } = useWeeklyCleaningReport(weekOffset);

  const weekLabel = useMemo(
    () => getWeekLabel(weekOffset),
    [weekOffset],
  );

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Cleaning – Weekly Report</Text>
          <Text style={styles.subtitle}>
            Admin Mode is required to view this report.
          </Text>
        </View>
      </View>
    );
  }

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
    }
  };

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
          {error && <Text style={[styles.helper, { color: '#B91C1C' }]}>{error}</Text>}

          {!loading && rows.length === 0 && !error && (
            <Text style={styles.helper}>
              Weekly cleaning data wiring not connected yet. The layout is ready for
              Supabase snapshots when you&apos;re ready to plug it in.
            </Text>
          )}

          {rows.length > 0 && (
            <View style={styles.table}>
              {/* Header row */}
              <View style={[styles.row, styles.headerRowTable]}>
                <View style={[styles.cell, styles.taskHeaderCell]}>
                  <Text style={[styles.cellText, styles.headerCellText]}>Task</Text>
                </View>
                {WEEK_DAYS.map((day) => (
                  <View key={day} style={[styles.cell, styles.dayHeaderCell]}>
                    <Text style={[styles.cellText, styles.headerCellText]}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Data rows */}
              {rows.map((row) => (
                <View key={row.task} style={styles.row}>
                  <View style={[styles.cell, styles.taskCell]}>
                    <Text style={[styles.cellText, styles.taskText]}>{row.task}</Text>
                  </View>
                  {WEEK_DAYS.map((day) => {
                    const value = row.byDay[day] ?? '';
                    return (
                      <View key={day} style={[styles.cell, styles.dataCell]}>
                        <Text style={styles.cellText}>{value}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {summary.length > 0 && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Summary by staff</Text>
              <View style={styles.table}>
                <View style={[styles.row, styles.headerRowTable]}>
                  <View style={[styles.cell, styles.taskHeaderCell]}>
                    <Text style={[styles.cellText, styles.headerCellText]}>Staff</Text>
                  </View>
                  <View style={[styles.cell, styles.dayHeaderCell]}>
                    <Text style={[styles.cellText, styles.headerCellText]}>Toilet-heavy</Text>
                  </View>
                  <View style={[styles.cell, styles.dayHeaderCell]}>
                    <Text style={[styles.cellText, styles.headerCellText]}>Total jobs</Text>
                  </View>
                </View>

                {summary.map((row) => (
                  <View key={row.name} style={styles.row}>
                    <View style={[styles.cell, styles.taskCell]}>
                      <Text style={[styles.cellText, styles.taskText]}>{row.name}</Text>
                    </View>
                    <View style={[styles.cell, styles.dataCell]}>
                      <Text style={styles.cellText}>{row.toiletJobs}</Text>
                    </View>
                    <View style={[styles.cell, styles.dataCell]}>
                      <Text style={styles.cellText}>{row.totalJobs}</Text>
                    </View>
                  </View>
                ))}
              </View>
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
  taskHeaderCell: {
    minWidth: 140,
  },
  dayHeaderCell: {
    alignItems: 'center',
  },
  taskCell: {
    backgroundColor: '#F9FAFB',
  },
  taskText: {
    fontWeight: '600',
  },
  dataCell: {
    backgroundColor: '#FFFFFF',
  },
  summaryContainer: {
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#332244',
  },
});
