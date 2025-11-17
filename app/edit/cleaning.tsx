// app/edit/cleaning.tsx (or wherever your Cleaning edit screen lives)
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import * as Data from '@/constants/data'; // CLEANING_TASKS etc.
import { Check } from 'lucide-react-native';

type Staff = {
  id: string;
  name: string;
  color?: string;
};

type CleaningTask = {
  id: string;
  label: string;
};

export default function CleaningEditScreen() {
  const { schedule, updateSchedule } = useSchedule();

  const staff: Staff[] = schedule.staff || [];
  const workingStaffIds: string[] = schedule.workingStaff || [];

  const tasks: CleaningTask[] = Data.CLEANING_TASKS || [];

  const assignments: Record<string, string | undefined> =
    schedule.cleaningAssignments || {};

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const activeTask = useMemo(
    () => tasks.find(t => t.id === activeTaskId) || null,
    [tasks, activeTaskId]
  );

  const workingStaff = useMemo(
    () => staff.filter(s => workingStaffIds.includes(s.id)),
    [staff, workingStaffIds]
  );

  const helpers = useMemo(
    () => staff.filter(s => !workingStaffIds.includes(s.id)),
    [staff, workingStaffIds]
  );

  const handleSelectStaff = (staffId: string | null) => {
    if (!activeTaskId) return;

    const nextAssignments = {
      ...(assignments || {}),
      [activeTaskId]: staffId || undefined,
    };

    updateSchedule?.({ cleaningAssignments: nextAssignments });

    // 🔔 trigger notification (hook added later)
    // pushNotification(`Cleaning updated — ${activeTask?.label ?? 'Task'}`);

    setActiveTaskId(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>End of Shift Cleaning Assignments</Text>
      <Text style={styles.subheading}>
        Tap a staff pill to update who is responsible for each task.
      </Text>

      <ScrollView
        style={{ marginTop: 16 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {tasks.map(task => {
          const staffId = assignments[task.id];
          const st = staff.find(s => s.id === staffId) || null;
          const label = st ? st.name : 'Not assigned';

          const isAssigned = !!st;

          return (
            <View key={task.id} style={styles.row}>
              <View style={styles.taskCol}>
                <Text style={styles.taskLabel}>{task.label}</Text>
              </View>

              <View style={styles.staffCol}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveTaskId(task.id)}
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
        visible={!!activeTask}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveTaskId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Choose staff for
            </Text>
            {activeTask && (
              <Text style={styles.modalTaskLabel}>{activeTask.label}</Text>
            )}

            <ScrollView
              style={{ marginTop: 16 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Text style={styles.modalSectionTitle}>Working staff</Text>
              <View style={{ marginTop: 8, gap: 6 }}>
                {workingStaff.map(st => {
                  const selected = assignments[activeTaskId ?? ''] === st.id;
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

              {!!helpers.length && (
                <>
                  <Text style={[styles.modalSectionTitle, { marginTop: 18 }]}>
                    Other staff
                  </Text>
                  <View style={{ marginTop: 8, gap: 6 }}>
                    {helpers.map(st => {
                      const selected =
                        assignments[activeTaskId ?? ''] === st.id;
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

              <TouchableOpacity
                onPress={() => handleSelectStaff(null)}
                style={[styles.modalRow, { marginTop: 18 }]}
              >
                <Text style={styles.modalRowTxt}>Clear assignment</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveTaskId(null)}
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
    color: '#333',
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
    borderColor: '#F54FA5', // footer pink
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
    backgroundColor: '#F54FA5',
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
