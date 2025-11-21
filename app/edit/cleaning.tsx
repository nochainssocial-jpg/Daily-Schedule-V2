import React, { useMemo, useState } from 'react';
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
    updateSchedule,
  } = useSchedule();

  const { push } = useNotifications();

  // 🔁 Same style as floating — stable, alphabetical chores list
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

  // 🔁 Same style as floating — working staff only, alphabetical
  const workingStaffList: Staff[] = useMemo(() => {
    const base = staff.filter((s) => workingStaff.includes(s.id));
    return base.sort((a, b) =>
      String(a.name).localeCompare(String(b.name), 'en-AU'),
    );
  }, [staff, workingStaff]);

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

  return (
    <View style={styles.screen}>
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="sparkles-outline"
          size={220}
          color="#FFD8A8"
          style={styles.heroIcon}
        />
      )}

      <View style={styles.wrap}>
        <Text style={styles.heading}>Cleaning Duties</Text>
        <Text style={styles.subheading}>
          Tap a staff pill to update who is responsible for each task.
        </Text>

        <ScrollView
          style={{ marginTop: 16 }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {chores.map((chore) => {
            const choreId = String(chore.id);
            const assignedStaffId = cleaningAssignments[choreId];
            const st = staff.find((s) => s.id === assignedStaffId) || null;

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

      {/* Floating-style staff picker modal */}
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

              <ScrollView contentContainerStyle={styles.scroll}>
              {workingStaffList.length ? (
                <View style={styles.chipGrid}>
                  {workingStaffList.map((st) => {
                    const selected =
                      cleaningAssignments[String(activeChoreId ?? '')] === st.id;

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
    backgroundColor: '#FFFAF2', // warm pastel (cleaning tile is amber)
  },
    scroll: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 160,
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
  },
  wrap: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
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
