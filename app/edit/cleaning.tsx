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
import { type Staff, type Chore } from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';
import { resolveOutingTiming } from '@/lib/outingSlots';

const PINK = '#F54FA5';

// George and Charbel are always available for end-of-shift cleaning,
// regardless of whether they have been selected as drop-off helpers.
const ALWAYS_AVAILABLE_CLEANING_NAMES = new Set(['charbel', 'george']);

const normaliseStaffName = (name?: string | null) =>
  String(name || '').trim().toLowerCase();

export default function CleaningEditScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' &&
      /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const {
    chores: rawChores = [],
    staff,
    workingStaff,
    cleaningAssignments = {},
    outingGroups = [],
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
      [...(rawChores || [])].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'en-AU'),
      ),
    [rawChores],
  );


  const [activeChoreId, setActiveChoreId] = useState<string | null>(null);
  const activeChore = useMemo(
    () => chores.find((c) => String(c.id) === String(activeChoreId)) || null,
    [chores, activeChoreId],
  );

  // 🔁 Cleaning staff = working staff plus George and Charbel, who are always
  // available in Cleaning. Staff assigned to any outing remain visible but
  // cannot be selected for cleaning duties.
  const workingSet = useMemo(
    () => new Set<string>((workingStaff || []).map((id: any) => String(id))),
    [workingStaff],
  );

  const alwaysAvailableCleaningSet = useMemo(
    () =>
      new Set<string>(
        (staff || [])
          .filter((member: Staff) =>
            ALWAYS_AVAILABLE_CLEANING_NAMES.has(
              normaliseStaffName(member.name),
            ),
          )
          .map((member: Staff) => String(member.id)),
      ),
    [staff],
  );

  const outingGroupsForLogic = useMemo(() => {
    const groups = Array.isArray(outingGroups)
      ? outingGroups
      : outingGroup
        ? [outingGroup]
        : [];

    return groups
      .map((group: any) => resolveOutingTiming(group, groups))
      .filter((group: any) => {
        const staffCount = group?.staffIds?.length ?? 0;
        const participantCount = group?.participantIds?.length ?? 0;
        return staffCount > 0 || participantCount > 0;
      });
  }, [outingGroups, outingGroup]);

  type OutingTone = 'primary' | 'second' | 'safety';

  const outingStaffToneMap = useMemo(() => {
    const map = new Map<string, OutingTone>();

    outingGroupsForLogic.forEach((group: any, index: number) => {
      const groupId = String(group?.id || '').toLowerCase();
      const tone: OutingTone =
        groupId === 'outing-3' || index === 2
          ? 'safety'
          : groupId === 'outing-2' || index === 1
            ? 'second'
            : 'primary';

      ((group.staffIds ?? []) as (string | number)[]).forEach((id) => {
        const staffId = String(id);
        if (!map.has(staffId)) {
          map.set(staffId, tone);
        }
      });
    });

    return map;
  }, [outingGroupsForLogic]);

  const outingStaffIds = useMemo(
    () => new Set<string>(outingStaffToneMap.keys()),
    [outingStaffToneMap],
  );

  // Everyone MD can potentially use for Cleaning remains visible in the picker.
  const workingStaffList: Staff[] = useMemo(
    () =>
      (staff || [])
        .filter((member: Staff) => {
          const staffId = String(member.id);
          return (
            workingSet.has(staffId) ||
            alwaysAvailableCleaningSet.has(staffId)
          );
        })
        .sort((a: Staff, b: Staff) =>
          String(a.name).localeCompare(String(b.name), 'en-AU'),
        ),
    [staff, workingSet, alwaysAvailableCleaningSet],
  );

  // Only staff who are not assigned to an outing may hold a cleaning duty.
  const selectableCleaningStaffList = useMemo(
    () =>
      workingStaffList.filter(
        (member) => !outingStaffIds.has(String(member.id)),
      ),
    [workingStaffList, outingStaffIds],
  );

  const allowedStaffIds = useMemo(
    () =>
      new Set<string>(
        selectableCleaningStaffList.map((member) => String(member.id)),
      ),
    [selectableCleaningStaffList],
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

    if (staffId && outingStaffIds.has(String(staffId))) {
      push(
        'Staff assigned to an outing cannot be assigned cleaning duties.',
        'cleaning',
      );
      return;
    }

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
    if (!selectableCleaningStaffList.length) {
      push('No onsite staff available to assign cleaning duties.', 'cleaning');
      return;
    }

    const staffIds = selectableCleaningStaffList.map((s) => String(s.id));
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
            Tap a staff pill to update who is responsible for each task. George
            and Charbel are always available. Staff assigned to an outing are
            shown but cannot be selected.
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
                    const staffId = String(st.id);
                    const selected =
                      (cleaningAssignments as any)[
                        String(activeChoreId ?? '')
                      ] === st.id;
                    const outingTone = outingStaffToneMap.get(staffId);
                    const isOnOuting = !!outingTone;

                    return (
                      <TouchableOpacity
                        key={st.id}
                        onPress={() => handleSelectStaff(staffId)}
                        activeOpacity={isOnOuting ? 1 : 0.85}
                        disabled={isOnOuting}
                        style={[
                          styles.chip,
                          selected && !isOnOuting && styles.chipSel,
                          isOnOuting && styles.chipOnOuting,
                          outingTone === 'primary' &&
                            styles.chipOnOutingPrimary,
                          outingTone === 'second' &&
                            styles.chipOnOutingSecond,
                          outingTone === 'safety' &&
                            styles.chipOnOutingSafety,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            selected && !isOnOuting && styles.chipLabelSel,
                            isOnOuting && styles.chipLabelOnOuting,
                            outingTone === 'primary' &&
                              styles.chipLabelOnOutingPrimary,
                            outingTone === 'second' &&
                              styles.chipLabelOnOutingSecond,
                            outingTone === 'safety' &&
                              styles.chipLabelOnOutingSafety,
                          ]}
                          numberOfLines={1}
                        >
                          {st.name}
                          {isOnOuting ? ' · ON OUTING' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noWorkingText}>
                  No eligible staff set for this schedule.
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
  chipOnOuting: {
    opacity: 0.45,
  },
  chipOnOutingPrimary: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FB923C',
  },
  chipOnOutingSecond: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  chipOnOutingSafety: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  chipLabel: {
    fontSize: 15,
    color: '#222',
  },
  chipLabelSel: {
    fontWeight: '600',
    color: '#111',
  },
  chipLabelOnOuting: {
    fontWeight: '600',
  },
  chipLabelOnOutingPrimary: {
    color: '#C2410C',
  },
  chipLabelOnOutingSecond: {
    color: '#6D28D9',
  },
  chipLabelOnOutingSafety: {
    color: '#B91C1C',
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
