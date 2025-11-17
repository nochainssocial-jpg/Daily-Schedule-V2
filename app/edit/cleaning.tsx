// app/edit/cleaning.tsx
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { Check } from 'lucide-react-native';

import { useSchedule } from '@/hooks/schedule-store';
import {
  DEFAULT_CHORES,
  type Staff,
  type Chore,
} from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';

export default function CleaningEditScreen() {
  const {
    staff,
    workingStaff,
    cleaningAssignments = {},
    updateSchedule,
  } = useSchedule();

  const { push } = useNotifications();

  const chores: Chore[] = DEFAULT_CHORES || [];

  const [activeChoreId, setActiveChoreId] = useState<string | null>(null);

  const activeChore = useMemo(
    () => chores.find(c => String(c.id) === String(activeChoreId)) || null,
    [chores, activeChoreId]
  );

  const workingStaffList: Staff[] = useMemo(
    () => staff.filter(s => workingStaff.includes(s.id)),
    [staff, workingStaff]
  );

  const helperStaffList: Staff[] = useMemo(
    () => staff.filter(s => !workingStaff.includes(s.id)),
    [staff, workingStaff]
  );

  const handleSelectStaff = (staffId: string | null) => {
    if (!activeChoreId) return;

    const chore = chores.find(c => String(c.id) === String(activeChoreId));

    const nextAssignments = {
      ...(cleaningAssignments || {}),
      [String(activeChoreId)]: staffId || undefined,
    };

    updateSchedule?.({ cleaningAssignments: nextAssignments });

    // 🔔 fire a notification
    if (staffId && chore) {
      push(
        `Cleaning updated — ${chore.name}`,
        'cleaning'
      );
    } else if (chore) {
      push(
        `Cleaning cleared — ${chore.name}`,
        'cleaning'
      );
    }

    setActiveChoreId(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Cleaning Duties</Text>
      <Text style={styles.subheading}>
        Tap a staff pill to update who is responsible for each task.
      </Text>

      <ScrollView
        style={{ marginTop: 16 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {chores.map(chore => {
          const choreId = String(chore.id);
          const assignedStaffId = cleaningAssignments[choreId];
          const st = staff.find(s => s.id === assignedStaffId) || null;

          const label = st ? st.name : 'Not assigned';
          const isAssigned = !!st;

          return (
            <View key={choreId} style={styles.row}>
              {/* Left: task / chore name */}
              <View style={styles.taskCol}>
                <Text style={styles.taskLabel}>{chore.name}</Text>
              </View>

              {/* Right: inline pill */}
              <View style={styles.staffCol}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveChoreId(choreId)}
                  style={[
                    styles.pill,
                    isAssigned && styles.pillAssigned,
                  ]}
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

      {/* Staff picker modal */}
      <Modal
        visible={!!activeChore}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveChoreId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose staff for</Text>
            {activeChore && (
              <Text style={styles.modalTaskLabel}>
                {activeChore.name}
              </Text>
            )}

            <ScrollView
              style={{ marginTop: 16 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Working staff */}
              <Text style={styles.modalSectionTitle}>Working staff</Text>
              <View style={{ marginTop: 8, gap: 6 }}>
                {workingStaffList.map(st => {
                  const selected =
                    cleaningAssignments[String(activeChoreId ?? '')] === st.id;

                  return (
                    <TouchableOpacity
                      key={st.id}
                      onPress={() => handleSelectStaff(st.id)}
                      style={[
                        styles.modalRow,
                        selected && styles.modalRowSel,
                      ]}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.modalRect,
                          { backgroundColor: st.color || '#E5ECF5' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.modalRowTxt,
                          selected && styles.modalRowTxtSel,
                        ]}
                      >
                        {st.name}
                      </Text>
                      {selected && <Check size={18} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Helpers / other staff */}
              {!!helperStaffList.length && (
                <>
                  <Text
                    style={[styles.modalSectionTitle, { marginTop: 18 }]}
                  >
                    Other staff
                  </Text>
                  <View style={{ marginTop: 8, gap: 6 }}>
                    {helperStaffList.map(st => {
                      const selected =
                        cleaningAssignments[String(activeChoreId ?? '')] ===
                        st.id;

                      return (
                        <TouchableOpacity
                          key={st.id}
                          onPress={() => handleSelectStaff(st.id)}
                          style={[
                            styles.modalRow,
                            selected && styles.modalRowSel,
                          ]}
                          activeOpacity={0.85}
                        >
                          <View
                            style={[
                              styles.modalRect,
                              { backgroundColor: st.color || '#E5ECF5' },
                            ]}
                          />
                          <Text
                            style={[
                              styles.modalRowTxt,
                              selected && styles.modalRowTxtSel,
                            ]}
                          >
                            {st.name}
                          </Text>
                          {selected && <Check size={18} color="#fff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Clear assignment */}
              <TouchableOpacity
                onPress={() => handleSelectStaff(null)}
                style={[styles.modalRow, { marginTop: 18 }]}
              >
                <Text style={styles.modalRowTxt}>
                  Clear assignment
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveChoreId(null)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PINK = '#F54FA5';

const styles = StyleSheet.create({
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: '#FFF',
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#433F4C',
  },
  modalTaskLabel: {
    marginTop: 2,
    fontSize: 14,
    color: '#7A7485',
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#433F4C',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F7F6FB',
    gap: 8,
  },
  modalRowSel: {
    backgroundColor: PINK,
  },
  modalRect: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#E5ECF5',
  },
  modalRowTxt: {
    flex: 1,
    fontSize: 14,
    color: '#433F4C',
  },
  modalRowTxtSel: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalClose: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalCloseTxt: {
    fontSize: 14,
    color: '#7A7485',
  },
});
