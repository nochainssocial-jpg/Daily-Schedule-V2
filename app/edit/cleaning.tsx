// app/edit/cleaning.tsx
import React, { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { DEFAULT_CHORES, STAFF as STATIC_STAFF } from '@/constants/data';

type ID = string;

export default function EditCleaningScreen() {
  const {
    staff: scheduleStaff,
    workingStaff,
    cleaningAssignments,
    updateSchedule,
  } = useSchedule();

  // Prefer staff from the schedule (after create), fallback to static constants
  const staff = (scheduleStaff && scheduleStaff.length ? scheduleStaff : STATIC_STAFF) as typeof STATIC_STAFF;

  // Use the Dream Team as the pool if set, otherwise all staff
  const staffPool = useMemo(
    () => (workingStaff && workingStaff.length ? staff.filter(s => workingStaff.includes(s.id)) : staff),
    [staff, workingStaff],
  );

  const staffById = new Map(staff.map((s) => [s.id, s]));

  const cycleChoreAssignment = (choreId: ID | number) => {
    if (!staffPool.length) return; // Nothing to cycle through

    const key = String(choreId);
    const current = cleaningAssignments || {};
    const currentStaffId = current[key];

    // Clone current assignments so we can safely mutate
    const next: Record<string, ID> = { ...current };

    if (!currentStaffId) {
      // No one assigned yet -> assign first in pool
      next[key] = staffPool[0].id;
    } else {
      const idx = staffPool.findIndex((s) => s.id === currentStaffId);
      if (idx === -1) {
        // Current id not in pool (e.g. pool changed), reset to first
        next[key] = staffPool[0].id;
      } else if (idx === staffPool.length - 1) {
        // Last staff in pool -> next tap clears assignment (back to "Not yet assigned")
        delete next[key];
      } else {
        // Move to next staff member in pool
        next[key] = staffPool[idx + 1].id;
      }
    }

    updateSchedule({ cleaningAssignments: next });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>End of Shift Cleaning Assignments</Text>
          <Text style={styles.subtitle}>
            Tap a row to cycle who is responsible for each task. The pool is your Dream Team (if selected),
            or all staff if no Dream Team has been chosen yet.
          </Text>

          {!staffPool.length && (
            <Text style={styles.helperText}>
              No staff available. Create a schedule and select working staff to assign cleaning duties.
            </Text>
          )}

          {DEFAULT_CHORES.map((chore) => {
            const key = String(chore.id);
            const sid = cleaningAssignments?.[key];
            const st = sid ? staffById.get(sid) : null;

            return (
              <TouchableOpacity
                key={key}
                style={styles.row}
                onPress={() => cycleChoreAssignment(chore.id)}
                activeOpacity={0.85}
              >
                <View style={styles.choreCol}>
                  <Text style={styles.choreLabel}>{chore.label}</Text>
                </View>
                <View style={styles.staffCol}>
                  <Text style={st ? styles.staffName : styles.staffEmpty}>
                    {st ? st.name : 'Not yet assigned'}
                  </Text>
                  <Text style={styles.tapHint}>Tap to change</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const MAX_WIDTH = 880;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
  },
  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: '#332244',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 16,
    color: '#5a486b',
  },
  helperText: {
    fontSize: 13,
    opacity: 0.8,
    color: '#7a688c',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#e5d9f2',
  },
  choreCol: {
    flex: 2,
    paddingRight: 12,
  },
  staffCol: {
    flex: 1.4,
    alignItems: 'flex-end',
  },
  choreLabel: {
    fontSize: 14,
    color: '#4c3b5c',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3c234c',
  },
  staffEmpty: {
    fontSize: 14,
    color: '#9a86aa',
    fontStyle: 'italic',
  },
  tapHint: {
    fontSize: 11,
    color: '#a68ab8',
    marginTop: 2,
  },
});
