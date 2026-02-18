import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSchedule } from '@/hooks/schedule-store';
import {
  chores,
  type Staff,
  type Chore,
} from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';

const PINK = '#F54FA5';

// ⏱ Helpers to detect full-day vs timed outing
function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  let t = String(time).trim().toLowerCase();

  // accept "9:00am-10:00am" by splitting
  if (t.includes('-')) {
    t = t.split('-')[0].trim();
  }

  const m = t.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const suffix = m[3];

  if (suffix === 'am') {
    if (hour === 12) hour = 0;
  } else if (suffix === 'pm') {
    if (hour !== 12) hour += 12;
  } else {
    // bare 9:00 or 14:00 – assume afternoon if early hour
    if (hour <= 6) hour += 12;
  }

  return hour * 60 + minute;
}

function getOutingWindowMinutes(outingGroup: any): {
  start: number | null;
  end: number | null;
} {
  if (!outingGroup) return { start: null, end: null };
  const start = parseTimeToMinutes(outingGroup.startTime);
  const end = parseTimeToMinutes(outingGroup.endTime);
  if (start == null || end == null) {
    return { start: null, end: null };
  }
  if (end <= start) {
    return { start: null, end: null };
  }
  return { start, end };
}

export default function CleaningEditScreen() {
  const { staff: masterStaff, participants: masterParticipants, chores, checklistItems, timeSlots } = useSchedule() as any;

  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' &&
      /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const {
    staff,
    workingStaff,
    cleaningAssignments = {},
    outingGroup = null,
    cleaningBinsVariant = 0,
    updateSchedule,
  } = useSchedule() as any;

  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const blockReadOnly = () => {
    push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
  };

  // 🔁 Stable, alphabetical chores list
  const chores: Chore[] = useMemo(
    () =>
      [...(chores || [])].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'en-AU'),
      ),
    [],
  );

  const [activeChoreId, setActiveChoreId] = useState<string | null>(null);
  const activeChore = useMemo(
    () => chores.find((c) => String(c.id) === String(activeChoreId)) || null,
    [chores, activeChoreId],
  );

  // 🔁 Working staff for cleaning = Dream Team, optionally minus outing staff
  const workingSet = useMemo(
    () => new Set<string>((workingStaff || []).map((id: any) => String(id))),
    [workingStaff],
  );

  const workingStaffList: Staff[] = useMemo(() => {
    const base = (staff || []).filter((s: Staff) =>
      workingSet.has(String(s.id)),
    );

    if (!outingGroup) {
      // No outing at all – everyone working is available for cleaning
      return base.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'en-AU'),
      );
    }

    const outingWindow = getOutingWindowMinutes(outingGroup);
    const hasTimedOuting =
      outingWindow.start !== null && outingWindow.end !== null;

    // Option B:
    // - If outing has a valid time window → treat as partial-day;
    //   keep all staff eligible for cleaning.
    // - If no valid times → full-day outing; exclude those staff.
    if (hasTimedOuting) {
      return base.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'en-AU'),
      );
    }

    const excluded = new Set<string>(
      ((outingGroup.staffIds ?? []) as (string | number)[]).map((id) =>
        String(id),
      ),
    );
    const onsite = base.filter((s) => !excluded.has(String(s.id)));

    return onsite.sort((a, b) =>
      String(a.name).localeCompare(String(b.name), 'en-AU'),
    );
  }, [staff, workingSet, outingGroup]);

  // ✅ Set of staff allowed to hold cleaning duties (onsite only)
  const allowedStaffIds = useMemo(
    () => new Set<string>(workingStaffList.map((s) => String(s.id))),
    [workingStaffList],
  );

  // ✅ Normalise assignments: drop any chores assigned to off-site staff
  useEffect(() => {
    if (!cleaningAssignments) return;

    let changed = false;
    const next: Record<string, string | undefined> = { ...cleaningAssignments };

    Object.entries(cleaningAssignments).forEach(([choreId, staffId]) => {
      if (staffId && !allowedStaffIds.has(String(staffId))) {
        next[choreId] = undefined;
        changed = true;
      }
    });

    if (changed) {
      updateSchedule?.({ cleaningAssignments: next });
    }
  }, [allowedStaffIds, cleaningAssignments, updateSchedule]);

  const handleSelectStaff = (staffId: string | null) => {
    if (readOnly) {
      blockReadOnly();
      return;
    }
    if (!activeChoreId) return;

    const chore = chores.find((c) => String(c.id) === String(activeChoreId));

    const nextAssignments = {
      ...(cleaningAssignments || {}),
      [String(activeChoreId)]: staffId || undefined,
    };

    updateSchedule?.({ cleaningAssignments: nextAssignments });

    if (chore) {
      if (staffId) {
        push(`Cleaning updated — ${chore.name}`, 'cleaning');
      } else {
        push(`Cleaning cleared — ${chore.name}`, 'cleaning');
      }
    }

    setActiveChoreId(null);
  };

  // 🌙 Special long-press behaviour for "Take the bins out"
  // 0 = default (from data.ts), 1 = red + yellow, 2 = red + green, 3 = bring in & clean
  const [binsVariant, setBinsVariant] = useState<0 | 1 | 2 | 3>(
    (cleaningBinsVariant ?? 0) as 0 | 1 | 2 | 3,
  );

  // keep local state in sync with store when loading / switching schedules
  useEffect(() => {
    setBinsVariant((cleaningBinsVariant ?? 0) as 0 | 1 | 2 | 3);
  }, [cleaningBinsVariant]);

  const cycleBinsVariant = () => {
    if (readOnly) {
      blockReadOnly();
      return;
    }
    setBinsVariant((prev) => {
      const next = ((prev + 1) % 4) as 0 | 1 | 2 | 3;
      updateSchedule?.({ cleaningBinsVariant: next });
      return next;
    });
  };

  const isBinsChore = (chore: Chore) => {
    const name = String(chore.name).toLowerCase();
    // match by id (10) or phrase, to be safe
    return String(chore.id) === '10' || name.includes('take bins out');
  };

  const getBinsLabel = (base: string) => {
    if (binsVariant === 1) {
      return 'Take Red Domestic and Yellow Recycling bins out.';
    }
    if (binsVariant === 2) {
      return 'Take Red Domestic and Green Waste bins out.';
    }
    if (binsVariant === 3) {
      return 'Bring the bins in and clean them.';
    }
    // 0 = whatever default text you set in data.ts
    return base;
  };

  // ⬇️ Rich label with coloured dots for the bins chore
  const renderBinsLabel = (base: string) => {
    if (binsVariant === 1) {
      // Red Domestic + Yellow Recycling
      return (
        <Text style={styles.taskLabel}>
          Take{' '}
          <Text style={[styles.binDot, styles.binDotRed]}>●</Text>
          {' '}Red Domestic and{' '}
          <Text style={[styles.binDot, styles.binDotYellow]}>●</Text>
          {' '}Yellow Recycling bins out front of property.
        </Text>
      );
    }
    if (binsVariant === 2) {
      // Red Domestic + Green Waste
      return (
        <Text style={styles.taskLabel}>
          Take{' '}
          <Text style={[styles.binDot, styles.binDotRed]}>●</Text>
          {' '}Red Domestic and{' '}
          <Text style={[styles.binDot, styles.binDotGreen]}>●</Text>
          {' '}Green Waste bins out front of property.
        </Text>
      );
    }
    if (binsVariant === 3) {
      // Bring all bins in & clean – show all three dots
      return (
        <Text style={styles.taskLabel}>
          Bring the{' '}
          <Text style={[styles.binDot, styles.binDotRed]}>●</Text>
          {' '}
          <Text style={[styles.binDot, styles.binDotYellow]}>●</Text>
          {' '}
          <Text style={[styles.binDot, styles.binDotGreen]}>●</Text>
          {' '}bins in and clean them.
        </Text>
      );
    }

    // Variant 0 – fall back to standard text (no dots)
    return <Text style={styles.taskLabel}>{getBinsLabel(base)}</Text>;
  };

  // 🔀 Re-shuffle all chores fairly across onsite staff (round-robin)
  const reshuffleCleaning = () => {
    if (readOnly) {
      blockReadOnly();
      return;
    }
    if (!workingStaffList.length) {
      push('No onsite staff available to assign cleaning duties.', 'cleaning');
      return;
    }

    const staffIds = workingStaffList.map((s) => String(s.id));
    const next: Record<string, string | undefined> = {};

    chores.forEach((chore, index) => {
      const staffId = staffIds[index % staffIds.length];
      next[String(chore.id)] = staffId;
    });

    updateSchedule?.({ cleaningAssignments: next });
    push('Cleaning duties reshuffled across onsite staff.', 'cleaning');
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="cleaning" />
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="sparkles-outline"
          size={220}
          color="#62F194"
          style={styles.heroIcon}
        />
      )}

      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.heading}>Cleaning Duties</Text>
          <Text style={styles.subheading}>
            Tap a staff pill to update who is responsible for each task. Only staff
            currently working onsite can be assigned.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.shuffleBtn}
              activeOpacity={0.9}
              onPress={reshuffleCleaning}
            >
              <Ionicons name="shuffle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.shuffleText}>Re-shuffle duties</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 30 }}
            showsVerticalScrollIndicator={true}
          >
            {chores.map((chore) => {
              const choreId = String(chore.id);
              const assignedStaffId = (cleaningAssignments as any)[choreId];

              const st =
                (staff || []).find(
                  (s: Staff) => String(s.id) === String(assignedStaffId),
                ) || null;

              const label = st ? st.name : 'Not assigned';
              const isAssigned = !!st;

              const isBins = isBinsChore(chore);

              return (
                <View key={choreId} style={styles.row}>
                  <TouchableOpacity
                    style={styles.taskCol}
                    activeOpacity={0.9}
                    onLongPress={isBins ? cycleBinsVariant : undefined}
                    delayLongPress={300}
                  >
                    {isBins ? (
                      renderBinsLabel(String(chore.name))
                    ) : (
                      <Text style={styles.taskLabel}>{chore.name}</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.staffCol}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (readOnly) {
                          blockReadOnly();
                          return;
                        }
                        setActiveChoreId(choreId);
                      }}
                      style={[styles.pill, isAssigned && styles.pillAssigned]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isAssigned && styles.pillTextAssigned,
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[
                          styles.pillChevron,
                          isAssigned && styles.pillTextAssigned,
                        ]}
                      >
                        ▾
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={!!activeChore}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveChoreId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Staff</Text>
            {activeChore && (
              <Text style={styles.modalTaskLabel}>{activeChore.name}</Text>
            )}

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={true}
            >
              {workingStaffList.length ? (
                <View style={styles.chipGrid}>
                  {workingStaffList.map((st) => {
                    const selected =
                      (cleaningAssignments as any)[
                        String(activeChoreId ?? '')
                      ] === st.id;

                    return (
                      <TouchableOpacity
                        key={st.id}
                        onPress={() => handleSelectStaff(st.id)}
                        activeOpacity={0.85}
                        style={[styles.chip, selected && styles.chipSel]}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            selected && styles.chipLabelSel,
                          ]}
                          numberOfLines={1}
                        >
                          {st.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noWorkingText}>
                  No working staff set for this schedule.
                </Text>
              )}

              <TouchableOpacity
                onPress={() => handleSelectStaff(null)}
                style={{ marginTop: 18 }}
              >
                <Text style={styles.clearLink}>Clear this task</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setActiveChoreId(null)}
                style={styles.closeBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#DCFCE7',
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
  },
  wrap: {
    flex: 1,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  list: {
    flex: 1,
    marginTop: 16,
  },

  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#433F4C',
  },
  subheading: {
    marginTop: 4,
    fontSize: 14,
    color: '#7A7485',
  },

  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: PINK,
    gap: 6,
  },
  shuffleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5ECF5',
  },
  taskCol: {
    flex: 3,
    paddingRight: 12,
  },
  staffCol: {
    flex: 2,
    alignItems: 'flex-end',
  },
  taskLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },

  // coloured bin dots
  binDot: {
    fontSize: 14,
  },
  binDotRed: {
    color: '#EF4444',
  },
  binDotYellow: {
    color: '#EAB308',
  },
  binDotGreen: {
    color: '#22C55E',
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5ECF5',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    gap: 6,
    maxWidth: 190,
  },
  pillAssigned: {
    borderColor: PINK,
  },
  pillText: {
    fontSize: 14,
    color: '#7A7485',
    flexShrink: 1,
  },
  pillTextAssigned: {
    color: '#433F4C',
    fontWeight: '600',
  },
  pillChevron: {
    fontSize: 14,
    color: '#7A7485',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '80%',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  modalTaskLabel: {
    marginTop: 4,
    fontSize: 14,
    color: '#555',
  },
  modalScroll: {
    marginTop: 16,
  },
  scroll: {
    paddingVertical: 32,
    paddingBottom: 160,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  chipSel: {
    borderColor: PINK,
    backgroundColor: '#FFE5F4',
  },
  chipLabel: {
    fontSize: 15,
    color: '#222',
  },
  chipLabelSel: {
    fontWeight: '600',
    color: '#111',
  },
  clearLink: {
    fontSize: 14,
    color: '#E23A3A',
    fontWeight: '600',
  },
  noWorkingText: {
    fontSize: 14,
    color: '#7A7485',
  },
  modalFooter: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CCC',
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: '#FFF',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
});
