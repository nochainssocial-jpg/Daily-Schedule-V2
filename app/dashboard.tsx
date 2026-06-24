import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { initScheduleForToday, useSchedule } from '@/hooks/schedule-store';

type ID = string;
type DashboardPage = 'floating' | 'outings' | 'cleaning' | 'checklist';
type RoomKey = 'frontRoom' | 'scotty' | 'twins';

const HOUSE_ID = 'B2';
const ROTATE_MS = 15_000;
const MAX_WIDTH = 1180;
const ROOM_KEYS: RoomKey[] = ['frontRoom', 'scotty', 'twins'];

const ROOM_LABELS: Record<RoomKey, string> = {
  frontRoom: 'Front Room',
  scotty: 'Scotty',
  twins: 'Twins / FSO',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateKey(date?: string | null): string {
  if (!date) return '';
  const parts = String(date).slice(0, 10).split('-');
  if (parts.length !== 3) return String(date);
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  let raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes('-')) raw = raw.split('-')[0].trim();
  raw = raw.replace(/\s+/g, '').replace(/\./g, ':');

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3];

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  if (suffix === 'am') {
    if (hour === 12) hour = 0;
  } else if (suffix === 'pm') {
    if (hour !== 12) hour += 12;
  } else if (hour <= 6) {
    // Match existing app behaviour for bare afternoon times such as 2:00.
    hour += 12;
  }

  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

function slotWindow(slot: any): { start: number | null; end: number | null } {
  if (!slot) return { start: null, end: null };

  const display = String(slot.displayTime || slot.display_time || '').trim();
  const displayParts = display.includes('-') ? display.split('-') : [];

  const start =
    parseTimeToMinutes(slot.startTime) ??
    parseTimeToMinutes(slot.start_time) ??
    parseTimeToMinutes(displayParts[0]);

  const end =
    parseTimeToMinutes(slot.endTime) ??
    parseTimeToMinutes(slot.end_time) ??
    parseTimeToMinutes(displayParts[1]);

  return { start, end };
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function isCurrentSlot(slot: any, tick: number): boolean {
  void tick;
  const { start, end } = slotWindow(slot);
  if (start == null || end == null || end <= start) return false;
  const now = nowMinutes();
  return now >= start && now < end;
}

function slotLabel(slot: any): string {
  const display = slot?.displayTime || slot?.display_time;
  if (display) return String(display);
  const start = slot?.startTime || slot?.start_time || '';
  const end = slot?.endTime || slot?.end_time || '';
  return `${start} - ${end}`.trim();
}

function hasOutingContent(outing: any): boolean {
  return Boolean(
    String(outing?.name || '').trim() ||
      String(outing?.startTime || '').trim() ||
      String(outing?.endTime || '').trim() ||
      String(outing?.notes || '').trim() ||
      (outing?.staffIds?.length ?? 0) > 0 ||
      (outing?.participantIds?.length ?? 0) > 0,
  );
}

function namesFromIds(ids: any[] | undefined, peopleById: Map<string, any>): string[] {
  return (ids || [])
    .map((id) => peopleById.get(String(id))?.name || String(id))
    .filter(Boolean);
}

function shortNames(names: string[]): string {
  return names.length ? names.join(', ') : '—';
}

function timeNowLabel(tick: number): string {
  void tick;
  return new Date().toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DashboardScreen() {
  const [pageIndex, setPageIndex] = useState(0);
  const [tick, setTick] = useState(0);

  const {
    date,
    staff = [],
    participants = [],
    timeSlots = [],
    chores = [],
    checklistItems = [],
    floatingAssignments = {},
    cleaningAssignments = {},
    finalChecklist = {},
    finalChecklistStaff = null,
    outingGroups = [],
    outingGroup = null,
  } = useSchedule() as any;

  useEffect(() => {
    void initScheduleForToday(HOUSE_ID).catch((error) => {
      console.error('[dashboard] failed to initialise schedule', error);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const staffById = useMemo(
    () => new Map((staff || []).map((person: any) => [String(person.id), person])),
    [staff],
  );

  const participantsById = useMemo(
    () => new Map((participants || []).map((person: any) => [String(person.id), person])),
    [participants],
  );

  const activeOutings = useMemo(() => {
    const groups = Array.isArray(outingGroups)
      ? outingGroups
      : outingGroup
        ? [outingGroup]
        : [];
    return groups.slice(0, 2).filter(hasOutingContent);
  }, [outingGroups, outingGroup]);

  const pages = useMemo<DashboardPage[]>(() => {
    const list: DashboardPage[] = ['floating'];
    if (activeOutings.length > 0) list.push('outings');
    list.push('cleaning', 'checklist');
    return list;
  }, [activeOutings.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPageIndex((value) => (value + 1) % Math.max(1, pages.length));
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [pages.length]);

  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(0);
  }, [pageIndex, pages.length]);

  const currentPage = pages[pageIndex] || 'floating';

  const cleaningRows = useMemo(() => {
    return (chores || [])
      .slice()
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'en-AU'))
      .map((chore: any) => {
        const staffId = cleaningAssignments?.[String(chore.id)];
        const assigned = staffId ? staffById.get(String(staffId))?.name || 'Assigned' : 'Not assigned';
        return {
          id: String(chore.id),
          chore: chore.name || chore.label || String(chore.id),
          assigned,
          complete: Boolean(staffId),
        };
      });
  }, [chores, cleaningAssignments, staffById]);

  const checklistRows = useMemo(() => {
    return (checklistItems || []).map((item: any) => {
      const id = String(item.id);
      return {
        id,
        label: item.name || item.label || id,
        checked: Boolean(finalChecklist?.[id]),
      };
    });
  }, [checklistItems, finalChecklist]);

  const completedChecklist = checklistRows.filter((item) => item.checked).length;
  const selectedFinalStaff = finalChecklistStaff
    ? staffById.get(String(finalChecklistStaff))?.name || 'Selected'
    : 'Not selected';

  const renderPage = () => {
    if (currentPage === 'floating') {
      return (
        <View style={styles.panel}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.panelEyebrow}>Current operational view</Text>
              <Text style={styles.panelTitle}>Floating Assignments</Text>
            </View>
            <View style={styles.badge}> 
              <MaterialCommunityIcons name="account-clock" size={18} color="#6D28D9" />
              <Text style={styles.badgeText}>Current slot highlighted</Text>
            </View>
          </View>

          <View style={styles.floatingTable}>
            <View style={[styles.floatRow, styles.floatHeaderRow]}>
              <Text style={[styles.floatCell, styles.floatTimeCell, styles.floatHeaderText]}>Time</Text>
              {ROOM_KEYS.map((room) => (
                <Text key={room} style={[styles.floatCell, styles.floatHeaderText]}>
                  {ROOM_LABELS[room]}
                </Text>
              ))}
            </View>

            {(timeSlots || []).map((slot: any, index: number) => {
              const slotId = String(slot.id ?? index);
              const row = floatingAssignments?.[slotId] || {};
              const current = isCurrentSlot(slot, tick);

              return (
                <View
                  key={slotId}
                  style={[
                    styles.floatRow,
                    index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                    current && styles.currentFloatRow,
                  ]}
                >
                  <View style={[styles.floatCellBox, styles.floatTimeCellBox]}>
                    <Text style={[styles.floatTimeText, current && styles.currentText]}>
                      {slotLabel(slot)}
                    </Text>
                    {current && <Text style={styles.nowLabel}>NOW</Text>}
                  </View>

                  {ROOM_KEYS.map((room) => {
                    const staffId = row?.[room];
                    const name = staffId ? staffById.get(String(staffId))?.name || '—' : '—';
                    return (
                      <View key={room} style={styles.floatCellBox}>
                        <Text style={[styles.floatNameText, current && styles.currentText]} numberOfLines={1}>
                          {name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    if (currentPage === 'outings') {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>Scheduled off-site activity</Text>
          <Text style={styles.panelTitle}>Drive / Outings</Text>

          {activeOutings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={42} color="#9CA3AF" />
              <Text style={styles.emptyText}>No outings scheduled today.</Text>
            </View>
          ) : (
            <View style={styles.outingGrid}>
              {activeOutings.map((outing: any, index: number) => {
                const isSecond = index === 1;
                const staffNames = namesFromIds(outing.staffIds, staffById);
                const participantNames = namesFromIds(outing.participantIds, participantsById);
                return (
                  <View
                    key={outing.id || `outing-${index}`}
                    style={[styles.outingCard, isSecond ? styles.outingCardPurple : styles.outingCardOrange]}
                  >
                    <View style={styles.outingTitleRow}>
                      <View style={[styles.outingIcon, isSecond ? styles.outingIconPurple : styles.outingIconOrange]}>
                        <Ionicons name="car-outline" size={26} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.outingLabel, isSecond ? styles.purpleText : styles.orangeText]}>
                          {isSecond ? 'Outing 2' : 'Outing 1'}
                        </Text>
                        <Text style={styles.outingName}>{outing.name || 'Unnamed outing'}</Text>
                        <Text style={styles.outingTime}>
                          {(outing.startTime || '?') + ' – ' + (outing.endTime || '?')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.outingSection}>
                      <Text style={styles.outingSectionTitle}>Staff</Text>
                      <Text style={styles.outingSectionText}>{shortNames(staffNames)}</Text>
                    </View>
                    <View style={styles.outingSection}>
                      <Text style={styles.outingSectionTitle}>Participants</Text>
                      <Text style={styles.outingSectionText}>{shortNames(participantNames)}</Text>
                    </View>
                    <View style={styles.outingSection}>
                      <Text style={styles.outingSectionTitle}>Notes</Text>
                      <Text style={styles.outingSectionText}>{String(outing.notes || '').trim() || 'No notes entered.'}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    if (currentPage === 'cleaning') {
      const assignedCount = cleaningRows.filter((row) => row.complete).length;
      return (
        <View style={styles.panel}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.panelEyebrow}>End of shift</Text>
              <Text style={styles.panelTitle}>Cleaning Assignments</Text>
            </View>
            <Text style={styles.progressText}>{assignedCount} / {cleaningRows.length} assigned</Text>
          </View>

          <ScrollView style={styles.innerScroll} contentContainerStyle={styles.cleaningGrid}>
            {cleaningRows.map((row) => (
              <View key={row.id} style={styles.cleaningCard}>
                <Text style={styles.cleaningTask}>{row.chore}</Text>
                <Text style={row.complete ? styles.cleaningAssigned : styles.cleaningUnassigned}>
                  {row.assigned}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <View>
            <Text style={styles.panelEyebrow}>Close of day</Text>
            <Text style={styles.panelTitle}>End of Shift Checklist</Text>
          </View>
          <View style={styles.progressBlock}>
            <Text style={styles.progressText}>{completedChecklist} / {checklistRows.length} complete</Text>
            <Text style={styles.finalStaffText}>Last to leave: {selectedFinalStaff}</Text>
          </View>
        </View>

        <View style={styles.checklistProgressOuter}>
          <View
            style={[
              styles.checklistProgressInner,
              {
                width: checklistRows.length
                  ? `${Math.round((completedChecklist / checklistRows.length) * 100)}%`
                  : '0%',
              },
            ]}
          />
        </View>

        <ScrollView style={styles.innerScroll} contentContainerStyle={styles.checklistList}>
          {checklistRows.map((item) => (
            <View key={item.id} style={[styles.checklistRow, item.checked && styles.checklistRowDone]}>
              <Ionicons
                name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={28}
                color={item.checked ? '#10B981' : '#9CA3AF'}
              />
              <Text style={[styles.checklistText, item.checked && styles.checklistTextDone]}>
                {item.label}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.appFrame}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.locationText}>No Chains Daily Dashboard</Text>
            <Text style={styles.dateText}>{formatDateKey(date)} · {HOUSE_ID} Day Program</Text>
          </View>
          <View style={styles.clockBlock}>
            <Text style={styles.clockText}>{timeNowLabel(tick)}</Text>
            <Text style={styles.rotateText}>Auto-rotates every {Math.round(ROTATE_MS / 1000)}s</Text>
          </View>
        </View>

        <View style={styles.pageTabs}>
          {pages.map((page, index) => (
            <TouchableOpacity
              key={page}
              onPress={() => setPageIndex(index)}
              activeOpacity={0.85}
              style={[styles.pageTab, currentPage === page && styles.pageTabActive]}
            >
              <Text style={[styles.pageTabText, currentPage === page && styles.pageTabTextActive]}>
                {page === 'floating'
                  ? 'Floating'
                  : page === 'outings'
                    ? 'Outings'
                    : page === 'cleaning'
                      ? 'Cleaning'
                      : 'Checklist'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contentArea}>{renderPage()}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appFrame: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    height: Platform.OS === 'web' ? 780 : '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: Platform.OS === 'web' ? 22 : 0,
    overflow: 'hidden',
  },
  topBar: {
    height: 92,
    paddingHorizontal: 28,
    paddingVertical: 18,
    backgroundColor: '#F54FA5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },
  dateText: {
    marginTop: 4,
    color: '#FFE4F4',
    fontSize: 14,
    fontWeight: '600',
  },
  clockBlock: {
    alignItems: 'flex-end',
  },
  clockText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  rotateText: {
    color: '#FFE4F4',
    fontSize: 12,
    fontWeight: '700',
  },
  pageTabs: {
    height: 56,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 10,
  },
  pageTab: {
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  pageTabActive: {
    backgroundColor: '#111827',
  },
  pageTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
  },
  pageTabTextActive: {
    color: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    padding: 20,
  },
  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 14,
  },
  panelEyebrow: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  panelTitle: {
    marginTop: 2,
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#6D28D9',
    fontWeight: '800',
    fontSize: 12,
  },
  floatingTable: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  floatRow: {
    flexDirection: 'row',
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  floatHeaderRow: {
    minHeight: 38,
    backgroundColor: '#EEF2FF',
  },
  rowEven: {
    backgroundColor: '#FFFFFF',
  },
  rowOdd: {
    backgroundColor: '#F9FAFB',
  },
  currentFloatRow: {
    backgroundColor: '#DCFCE7',
    borderLeftWidth: 8,
    borderLeftColor: '#10B981',
  },
  floatCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  floatHeaderText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '900',
  },
  floatTimeCell: {
    flex: 1.05,
  },
  floatCellBox: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  floatTimeCellBox: {
    flex: 1.05,
  },
  floatTimeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  floatNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  currentText: {
    color: '#065F46',
  },
  nowLabel: {
    marginTop: 2,
    fontSize: 10,
    color: '#059669',
    fontWeight: '900',
  },
  outingGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  outingCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 2,
    padding: 20,
  },
  outingCardOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FB923C',
  },
  outingCardPurple: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  outingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  outingIcon: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outingIconOrange: {
    backgroundColor: '#F97316',
  },
  outingIconPurple: {
    backgroundColor: '#7C3AED',
  },
  outingLabel: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  orangeText: {
    color: '#C2410C',
  },
  purpleText: {
    color: '#6D28D9',
  },
  outingName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  outingTime: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '800',
  },
  outingSection: {
    marginTop: 14,
  },
  outingSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  outingSectionText: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 18,
    fontWeight: '700',
  },
  innerScroll: {
    flex: 1,
  },
  cleaningGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  cleaningCard: {
    width: '31.8%',
    minHeight: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  cleaningTask: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  cleaningAssigned: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
    color: '#F54FA5',
  },
  cleaningUnassigned: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  progressBlock: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  finalStaffText: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },
  checklistProgressOuter: {
    height: 16,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  checklistProgressInner: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  checklistList: {
    gap: 9,
    paddingBottom: 8,
  },
  checklistRow: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checklistRowDone: {
    backgroundColor: '#ECFDF3',
    borderColor: '#A7F3D0',
  },
  checklistText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  checklistTextDone: {
    color: '#065F46',
  },
});
