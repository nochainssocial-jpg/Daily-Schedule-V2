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
  DEFAULT_CHORES,
  type Staff,
  type Chore,
} from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import SaveExit from '@/components/SaveExit';

const PINK = '#F54FA5';

export default function CleaningEditScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const {
    staff,
    workingStaff,
    cleaningAssignments = {},
    outingGroup = null,
    updateSchedule,
  } = useSchedule() as any;

  const { push } = useNotifications();

  // 🔁 Stable, alphabetical chores list
  const chores: Chore[] = useMemo(
    () =>
      [...(DEFAULT_CHORES || [])].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'en-AU'),
      ),
    [],
  );

  const [activeChoreId, setActiveChoreId] = useState<string | null>(null);

  const activeChore = useMemo(
    () => chores.find((c) => String(c.id) === String(activeChoreId)) || null,
    [chores, activeChoreId],
  );

  // 🔁 Working staff for cleaning = Dream Team minus outing staff
  const workingStaffList: Staff[] = useMemo(() => {
    const base = (staff || []).filter((s: Staff) =>
      (workingStaff || []).includes(s.id),
    );

    if (!outingGroup) {
      return base.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'en-AU'),
      );
    }

    const excluded = new Set<string>((outingGroup.staffIds ?? []) as string[]);
    const onsite = base.filter((s) => !excluded.has(s.id));

    return onsite.sort((a, b) =>
      String(a.name).localeCompare(String(b.name), 'en-AU'),
    );
  }, [staff, workingStaff, outingGroup]);

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

  // 🔀 Re-shuffle all chores fairly across onsite staff (round-robin)
  const reshuffleCleaning = () => {
    if (!workingStaffList.length) {
      push('No onsite staff available to assign cleaning duties.', 'cleaning');
      return;
    }

    const staffIds = workingStaffList.map((s) => String(s.id));
    const next: Record<string, string | undefined> = {};
    let idx = 0;

    chores.forEach((chore) => {
      const choreId = String(chore.id);
      const staffId = staffIds[idx % staffIds.length];
      next[choreId] = staffId;
      idx += 1;
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
        <View style={styles.card}>    {/* NEW white container */}
        <Text style={styles.heading}>Cleaning Duties</Text>
        <Text style={styles.subheading}>
          Tap a staff pill to update who is responsible for each task. Only staff
          currently working onsite can be assigned.
        </Text>
      
        {/* Re-shuffle button */}
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

        {/* Main chores list */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={true}
        >
          {chores.map((chore) => {
            const choreId = String(chore.id);
            const assignedStaffId = (cleaningAssignments as any)[choreId];

            // Look up staff from full list, but off-site staff are auto-cleared
            const st =
              (staff || []).find((s: Staff) => String(s.id) === String(assignedStaffId)) ||
              null;

            const label = st ? st.name : 'Not assigned';
            const isAssigned = !!st;

            return (
              <View key={choreId} style={styles.row}>
                <View style={styles.taskCol}>
                  <Text style={styles.taskLabel}>{chore.name}</Text>
                </View>

                <View style={styles.staffCol}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setActiveChoreId(choreId)}
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

      {/* Staff picker modal */}
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

            {/* Scrollable staff list inside modal */}
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
  list: {
    flex: 1,
    marginTop: 16,
  },

  heading: {
    fontSize: 22,
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
    fontSize: 14,
    color: '#433F4C',
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

  // modal
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
card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  paddingVertical: 20,
  paddingHorizontal: 20,
  marginTop: 16,
  marginBottom: 32,
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
},
