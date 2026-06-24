import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useIsAdmin } from '@/hooks/access-control';
import {
  WEEK_DAYS,
  type WeekDayLabel,
  type WeeklyReportResult,
  loadTeamAssignmentsReport,
} from '@/lib/admin-report-engine';

const DEFAULT_WEEK_OFFSET = -1;
const PAGE_TITLE = 'Team Daily Assignment – Weekly Report';
const PAGE_SUBTITLE = 'Previous-week report showing which participants were assigned to each real staff member.';
const HEADER_TITLE = 'Team Daily Assignment – Weekly Report';

function summariseTotals(totals: Record<string, number>): string {
  const entries = Object.entries(totals)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en-AU'))
    .slice(0, 4);
  if (!entries.length) return 'No assigned items recorded.';
  return entries.map(([name, count]) => count > 1 ? `${name} (${count})` : name).join(', ');
}

function cellText(values: string[]): string {
  return (values || []).join('\n');
}

export default function AdminWeeklyReportScreen() {
  const isAdmin = useIsAdmin();
  const [weekOffset, setWeekOffset] = useState(DEFAULT_WEEK_OFFSET);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WeeklyReportResult | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const next = await loadTeamAssignmentsReport(weekOffset);
        if (!cancelled) setResult(next);
      } catch (err) {
        console.error('[admin-report] failed to load', err);
        if (!cancelled) {
          setResult(null);
          setError('Could not load weekly data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, weekOffset]);

  const weekLabel = result?.weekLabel ?? 'Week loading…';
  const rows = result?.rows ?? [];
  const missingDays = result?.missingDays ?? [];

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.screenCentered}>
        <View style={styles.card}>
          <Text style={styles.title}>{PAGE_TITLE}</Text>
          <Text style={styles.subtitle}>Admin Mode is required to view this report.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.heroBar}>
        <Text style={styles.heroTitle}>{HEADER_TITLE}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{PAGE_TITLE}</Text>
              <Text style={styles.subtitle}>{weekLabel}</Text>
              <Text style={styles.description}>{PAGE_SUBTITLE}</Text>
            </View>

            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setWeekOffset((prev) => prev - 1)}
              >
                <Text style={styles.navButtonText}>‹ Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, weekOffset === 0 && styles.navButtonActive]}
                onPress={() => setWeekOffset(0)}
              >
                <Text style={styles.navButtonText}>Current</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setWeekOffset((prev) => prev + 1)}
              >
                <Text style={styles.navButtonText}>Next ›</Text>
              </TouchableOpacity>
              {Platform.OS === 'web' && rows.length > 0 && (
                <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                  <Text style={styles.printButtonText}>Print</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading && <Text style={styles.helper}>Loading weekly data…</Text>}
          {error && <Text style={[styles.helper, styles.error]}>{error}</Text>}

          {!loading && !error && result && missingDays.length > 0 && (
            <Text style={styles.warning}>
              No saved schedule found for: {missingDays.join(', ')}.
            </Text>
          )}

          {!loading && !error && rows.length === 0 && (
            <Text style={styles.helper}>No reportable data found for this week.</Text>
          )}

          {rows.length > 0 && (
            <>
              <View style={styles.summaryGrid}>
                {rows.map((row) => (
                  <View key={row.staffId} style={styles.summaryCard}>
                    <Text style={styles.summaryName}>{row.name}</Text>
                    <Text style={styles.summaryText}>{summariseTotals(row.totals)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.table}>
                <View style={[styles.row, styles.headerRowTable]}>
                  <View style={[styles.cell, styles.staffHeaderCell]}>
                    <Text style={[styles.cellText, styles.headerCellText]}>Staff</Text>
                  </View>
                  {WEEK_DAYS.map((day: WeekDayLabel) => (
                    <View key={day} style={[styles.cell, styles.dayHeaderCell]}>
                      <Text style={[styles.cellText, styles.headerCellText]}>{day}</Text>
                    </View>
                  ))}
                </View>

                {rows.map((row) => (
                  <View key={row.staffId} style={styles.row}>
                    <View style={[styles.cell, styles.staffCell]}>
                      <Text style={[styles.cellText, styles.staffText]}>{row.name}</Text>
                    </View>
                    {WEEK_DAYS.map((day: WeekDayLabel) => (
                      <View key={day} style={[styles.cell, styles.dataCell]}>
                        <Text style={styles.cellText}>{cellText(row.byDay[day])}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E0E7FF',
  },
  screenCentered: {
    flex: 1,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  heroBar: {
    backgroundColor: '#F54FA5',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 1180,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
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
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#332244',
  },
  subtitle: {
    fontSize: 14,
    color: '#7a688c',
    fontWeight: '600',
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  navButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    backgroundColor: '#FFFFFF',
  },
  navButtonActive: {
    borderColor: '#9DB2FF',
    backgroundColor: '#F8FAFF',
  },
  navButtonText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  printButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F54FA5',
    backgroundColor: '#FDF2FB',
  },
  printButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F54FA5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helper: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  error: {
    color: '#B91C1C',
  },
  warning: {
    marginTop: 8,
    fontSize: 13,
    color: '#92400E',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  summaryCard: {
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  summaryText: {
    marginTop: 2,
    fontSize: 12,
    color: '#4B5563',
  },
  table: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  headerRowTable: {
    backgroundColor: '#EFF3FF',
  },
  cell: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexShrink: 0,
    flexGrow: 0,
  },
  cellText: {
    fontSize: 14,
    lineHeight: 19,
    color: '#111827',
  },
  headerCellText: {
    fontWeight: '800',
  },
  staffHeaderCell: {
    width: 160,
  },
  staffCell: {
    width: 160,
    backgroundColor: '#F9FAFB',
  },
  staffText: {
    fontWeight: '800',
  },
  dayHeaderCell: {
    width: 190,
  },
  dataCell: {
    width: 190,
    minHeight: 44,
    backgroundColor: '#FFFFFF',
  },
});
