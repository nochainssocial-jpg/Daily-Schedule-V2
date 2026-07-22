import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsAdmin } from '@/hooks/access-control';
import {
  WEEK_DAYS,
  type WeekDayLabel,
} from '@/lib/admin-report-engine';
import {
  loadFloatingAssignmentsTracker,
  type FloatingFairnessStatus,
  type FloatingTrackerDayCell,
  type FloatingTrackerResult,
} from '@/lib/floating-tracker-engine';

const STATUS_LABELS: Record<FloatingFairnessStatus, string> = {
  balanced: 'Within fair range',
  'slightly-low': 'Slightly below share',
  low: 'Below expected share',
  'slightly-high': 'Slightly above share',
  high: 'Above expected share',
  limited: 'Limited data',
  'not-available': 'Not available',
};

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('en-AU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatDifference(value: number): string {
  if (Math.abs(value) < 0.05) return '0.0';
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

function statusPalette(status: FloatingFairnessStatus) {
  switch (status) {
    case 'balanced':
      return { backgroundColor: '#DCFCE7', borderColor: '#86EFAC', color: '#166534' };
    case 'slightly-low':
      return { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', color: '#92400E' };
    case 'low':
      return { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' };
    case 'slightly-high':
      return { backgroundColor: '#E0E7FF', borderColor: '#A5B4FC', color: '#3730A3' };
    case 'high':
      return { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD', color: '#5B21B6' };
    case 'not-available':
      return { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', color: '#4B5563' };
    default:
      return { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', color: '#475569' };
  }
}

function DailyCell({ cell }: { cell: FloatingTrackerDayCell | null }) {
  if (!cell) return <Text style={styles.emptyCell}>Not on Dream Team</Text>;
  if (cell.training) {
    return (
      <View>
        <Text style={styles.dailyPrimary}>Training day</Text>
        <Text style={styles.dailySecondary}>Excluded from fair-share calculation</Text>
      </View>
    );
  }
  if (cell.availableSlots === 0 && cell.offsiteSlots === 0) {
    return <Text style={styles.emptyCell}>No active floating coverage</Text>;
  }

  return (
    <View>
      <Text style={styles.dailyPrimary}>
        {cell.assigned} assigned · {formatNumber(cell.expected)} expected
      </Text>
      <Text style={styles.dailySecondary}>{cell.availableSlots} available slots</Text>
      {cell.offsiteSlots > 0 && (
        <Text style={styles.dailyOffsite}>{cell.offsiteSlots} offsite slots</Text>
      )}
      <Text style={styles.dailyRooms}>
        Front {cell.frontRoom} · Scotty {cell.scotty} · Twins {cell.twins}
        {cell.fso > 0 ? ` · FSO ${cell.fso}` : ''}
      </Text>
    </View>
  );
}

export default function FloatingAssignmentsTrackerScreen() {
  const isAdmin = useIsAdmin();
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FloatingTrackerResult | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await loadFloatingAssignmentsTracker(weekOffset);
        if (!cancelled) setResult(next);
      } catch (loadError) {
        console.error('[floating-tracker] failed to load', loadError);
        if (!cancelled) {
          setResult(null);
          setError('Could not load floating assignment data.');
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

  const coveragePercent = useMemo(() => {
    if (!result?.totals.requiredAssignments) return 0;
    return Math.round(
      (result.totals.validAssignments / result.totals.requiredAssignments) * 100,
    );
  }, [result]);

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.print();
  };

  if (!isAdmin) {
    return (
      <View style={styles.screenCentered}>
        <View style={styles.card}>
          <Text style={styles.title}>Floating Assignments Tracker</Text>
          <Text style={styles.subtitle}>Admin Mode is required to view this tracker.</Text>
        </View>
      </View>
    );
  }

  const rows = result?.rows ?? [];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.subtitle}>{result?.weekLabel || 'Week loading…'}</Text>
              <Text style={styles.description}>
                Compares allocated floating duties with each Dream Team member’s genuine onsite availability. Offsite outings, participant room coverage, training days, FSO and staff restrictions are excluded from expected share.
              </Text>
            </View>

            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.navButton} onPress={() => setWeekOffset((value) => value - 1)}>
                <Text style={styles.navButtonText}>‹ Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, weekOffset === 0 && styles.navButtonActive]}
                onPress={() => setWeekOffset(0)}
              >
                <Text style={styles.navButtonText}>Current</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={() => setWeekOffset((value) => value + 1)}>
                <Text style={styles.navButtonText}>Next ›</Text>
              </TouchableOpacity>
              {Platform.OS === 'web' && rows.length > 0 && (
                <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                  <Text style={styles.printButtonText}>Print</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading && <Text style={styles.helper}>Loading floating allocation data…</Text>}
          {error && <Text style={[styles.helper, styles.error]}>{error}</Text>}

          {!loading && !error && result && result.missingDays.length > 0 && (
            <Text style={styles.warning}>
              No saved schedule found for: {result.missingDays.join(', ')}.
            </Text>
          )}

          {!loading && !error && result && result.missingOutingHistoryDays.length > 0 && (
            <Text style={styles.warning}>
              Offsite history is unavailable for {result.missingOutingHistoryDays.join(', ')} because those outings were cleared before historical archiving was enabled. Those days are assessed using Dream Team availability only.
            </Text>
          )}

          {!loading && !error && result && (result.totals.coverageGaps > 0 || result.totals.invalidAssignments > 0) && (
            <Text style={styles.warning}>
              Review needed: {result.totals.coverageGaps} required room slot{result.totals.coverageGaps === 1 ? '' : 's'} unfilled and {result.totals.invalidAssignments} assignment{result.totals.invalidAssignments === 1 ? '' : 's'} conflicted with availability or room rules.
            </Text>
          )}

          {!loading && !error && result && (
            <>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{coveragePercent}%</Text>
                  <Text style={styles.metricLabel}>Required coverage filled</Text>
                  <Text style={styles.metricDetail}>
                    {result.totals.validAssignments} of {result.totals.requiredAssignments} room slots
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {result.totals.balancedStaff}/{result.totals.assessedStaff || 0}
                  </Text>
                  <Text style={styles.metricLabel}>Staff within fair range</Text>
                  <Text style={styles.metricDetail}>Limited-data staff excluded</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{result.totals.offsiteStaffSlots}</Text>
                  <Text style={styles.metricLabel}>Offsite staff slots</Text>
                  <Text style={styles.metricDetail}>Removed from available time</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{result.totals.offsiteParticipantSlots}</Text>
                  <Text style={styles.metricLabel}>Offsite participant slots</Text>
                  <Text style={styles.metricDetail}>Used to determine room coverage</Text>
                </View>
              </View>

              <View style={styles.methodCard}>
                <Text style={styles.methodTitle}>How the fair share is calculated</Text>
                <Text style={styles.methodText}>
                  Each active 30-minute room requirement creates an allocation opportunity. A staff member receives availability credit only when they are on the Dream Team, onsite, not training and eligible for that room. The weekly expected share is then distributed according to those genuine opportunities—not simply divided equally by headcount.
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Weekly fairness overview</Text>
              {rows.length === 0 ? (
                <Text style={styles.helper}>No floating assignment data found for this week.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={styles.summaryTable}>
                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                      <View style={[styles.tableCell, styles.staffColumn]}><Text style={styles.headerText}>Staff</Text></View>
                      <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.headerText}>Dream Team days</Text></View>
                      <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.headerText}>Available slots</Text></View>
                      <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.headerText}>Offsite slots</Text></View>
                      <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.headerText}>Assigned</Text></View>
                      <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.headerText}>Expected</Text></View>
                      <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.headerText}>Difference</Text></View>
                      <View style={[styles.tableCell, styles.roomColumn]}><Text style={styles.headerText}>Front</Text></View>
                      <View style={[styles.tableCell, styles.roomColumn]}><Text style={styles.headerText}>Scotty</Text></View>
                      <View style={[styles.tableCell, styles.roomColumn]}><Text style={styles.headerText}>Twins</Text></View>
                      <View style={[styles.tableCell, styles.roomColumn]}><Text style={styles.headerText}>FSO</Text></View>
                      <View style={[styles.tableCell, styles.statusColumn]}><Text style={styles.headerText}>Assessment</Text></View>
                    </View>

                    {rows.map((row) => {
                      const palette = statusPalette(row.status);
                      return (
                        <View key={row.staffId} style={styles.tableRow}>
                          <View style={[styles.tableCell, styles.staffColumn, styles.staffCell]}><Text style={styles.staffText}>{row.name}</Text></View>
                          <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.cellText}>{row.dreamTeamDays}</Text></View>
                          <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.cellText}>{row.availableSlots}</Text></View>
                          <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.cellText}>{row.offsiteSlots}</Text></View>
                          <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.cellText}>{row.assigned}</Text></View>
                          <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.cellText}>{formatNumber(row.expected)}</Text></View>
                          <View style={[styles.tableCell, styles.smallColumn]}><Text style={styles.cellText}>{formatDifference(row.difference)}</Text></View>
                          <View style={[styles.tableCell, styles.roomColumn]}><Text style={styles.cellText}>{row.frontRoom}</Text></View>
                          <View style={[styles.tableCell, styles.roomColumn]}><Text style={styles.cellText}>{row.scotty}</Text></View>
                          <View style={[styles.tableCell, styles.roomColumn]}><Text style={styles.cellText}>{row.twins}</Text></View>
                          <View style={[styles.tableCell, styles.roomColumn]}><Text style={styles.cellText}>{row.fso}</Text></View>
                          <View style={[styles.tableCell, styles.statusColumn]}>
                            <View style={[styles.statusPill, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }]}>
                              <Text style={[styles.statusText, { color: palette.color }]}>{STATUS_LABELS[row.status]}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              <Text style={styles.sectionTitle}>Daily allocation detail</Text>
              {rows.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={styles.dailyTable}>
                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                      <View style={[styles.tableCell, styles.staffColumn]}><Text style={styles.headerText}>Staff</Text></View>
                      {WEEK_DAYS.map((day: WeekDayLabel) => (
                        <View key={day} style={[styles.tableCell, styles.dayColumn]}>
                          <Text style={styles.headerText}>{day}</Text>
                        </View>
                      ))}
                    </View>
                    {rows.map((row) => (
                      <View key={row.staffId} style={styles.tableRow}>
                        <View style={[styles.tableCell, styles.staffColumn, styles.staffCell]}>
                          <Text style={styles.staffText}>{row.name}</Text>
                        </View>
                        {WEEK_DAYS.map((day: WeekDayLabel) => (
                          <View key={day} style={[styles.tableCell, styles.dayColumn]}>
                            <DailyCell cell={row.byDay[day]} />
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              <Text style={styles.sectionTitle}>Daily coverage context</Text>
              <View style={styles.daySummaryGrid}>
                {result.daySummaries.map((day) => (
                  <View key={day.dateKey} style={styles.daySummaryCard}>
                    <Text style={styles.daySummaryTitle}>{day.day}</Text>
                    <Text style={styles.daySummaryDate}>{day.dateKey.split('-').reverse().join('-')}</Text>
                    <Text style={styles.daySummaryLine}>Coverage: {day.validAssignments}/{day.requiredAssignments}</Text>
                    <Text style={styles.daySummaryLine}>Offsite staff slots: {day.offsiteStaffSlots}</Text>
                    <Text style={styles.daySummaryLine}>Offsite participant slots: {day.offsiteParticipantSlots}</Text>
                    {(day.coverageGaps > 0 || day.invalidAssignments > 0) && (
                      <Text style={styles.daySummaryAlert}>
                        {day.coverageGaps} gaps · {day.invalidAssignments} conflicts
                      </Text>
                    )}
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
  screen: { flex: 1, backgroundColor: '#E0E7FF' },
  screenCentered: {
    flex: 1,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  scroll: { flexGrow: 1, alignItems: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 1240,
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
  title: { fontSize: 20, fontWeight: '800', color: '#332244' },
  subtitle: { fontSize: 14, color: '#7A688C', fontWeight: '700' },
  description: { marginTop: 5, fontSize: 12, lineHeight: 18, color: '#6B7280', maxWidth: 760 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  headerCopy: { flex: 1, minWidth: 280 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  navButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5F5', backgroundColor: '#FFFFFF' },
  navButtonActive: { borderColor: '#9DB2FF', backgroundColor: '#F8FAFF' },
  navButtonText: { fontSize: 13, color: '#1F2937', fontWeight: '600' },
  printButton: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#F54FA5', backgroundColor: '#FDF2FB' },
  printButtonText: { fontSize: 13, fontWeight: '800', color: '#F54FA5', textTransform: 'uppercase', letterSpacing: 0.5 },
  helper: { marginTop: 8, fontSize: 14, color: '#4B5563' },
  error: { color: '#B91C1C' },
  warning: { marginTop: 8, fontSize: 13, lineHeight: 18, color: '#92400E', backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  metricCard: { flexGrow: 1, flexBasis: 210, minWidth: 190, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC', paddingHorizontal: 14, paddingVertical: 12 },
  metricValue: { fontSize: 23, lineHeight: 28, fontWeight: '900', color: '#312E81' },
  metricLabel: { marginTop: 2, fontSize: 13, fontWeight: '800', color: '#111827' },
  metricDetail: { marginTop: 2, fontSize: 11, color: '#6B7280' },
  methodCard: { marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#C7D2FE', backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 11 },
  methodTitle: { fontSize: 13, fontWeight: '900', color: '#3730A3' },
  methodText: { marginTop: 3, fontSize: 12, lineHeight: 18, color: '#4338CA' },
  sectionTitle: { marginTop: 22, marginBottom: 9, fontSize: 16, fontWeight: '900', color: '#111827' },
  summaryTable: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  dailyTable: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  tableHeaderRow: { backgroundColor: '#EFF3FF' },
  tableCell: { paddingHorizontal: 9, paddingVertical: 8, borderRightWidth: 1, borderRightColor: '#E5E7EB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', justifyContent: 'center' },
  staffColumn: { width: 160 },
  smallColumn: { width: 84, alignItems: 'center' },
  roomColumn: { width: 64, alignItems: 'center' },
  statusColumn: { width: 150, alignItems: 'center' },
  dayColumn: { width: 190, minHeight: 70 },
  staffCell: { backgroundColor: '#F9FAFB' },
  staffText: { fontSize: 13, fontWeight: '900', color: '#111827' },
  headerText: { fontSize: 12, fontWeight: '900', textAlign: 'center', color: '#1F2937' },
  cellText: { fontSize: 13, color: '#111827', textAlign: 'center' },
  statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  emptyCell: { fontSize: 12, lineHeight: 17, color: '#9CA3AF' },
  dailyPrimary: { fontSize: 12, fontWeight: '800', color: '#111827' },
  dailySecondary: { marginTop: 2, fontSize: 11, color: '#4B5563' },
  dailyOffsite: { marginTop: 2, fontSize: 11, fontWeight: '700', color: '#B45309' },
  dailyRooms: { marginTop: 3, fontSize: 10, lineHeight: 14, color: '#6B7280' },
  daySummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  daySummaryCard: { width: 205, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 10 },
  daySummaryTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  daySummaryDate: { marginTop: 1, marginBottom: 5, fontSize: 11, color: '#6B7280' },
  daySummaryLine: { marginTop: 2, fontSize: 11, color: '#374151' },
  daySummaryAlert: { marginTop: 5, fontSize: 11, fontWeight: '800', color: '#B45309' },
});
