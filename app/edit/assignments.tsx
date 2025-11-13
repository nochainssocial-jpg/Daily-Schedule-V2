// app/edit/assignments.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { STAFF as STATIC_STAFF, PARTICIPANTS as STATIC_PARTS } from '@/constants/data';
import Chip from '@/components/Chip';

type ID = string;

export default function EditAssignmentsScreen() {
  const {
    staff: scheduleStaff,
    participants: scheduleParts,
    assignments,
    workingStaff,
    attendingParticipants,
    updateSchedule,
  } = useSchedule();

  // Prefer staff/participants from the store (after create) or fall back to constants
  const staff = (scheduleStaff && scheduleStaff.length ? scheduleStaff : STATIC_STAFF) as typeof STATIC_STAFF;
  const participants = (scheduleParts && scheduleParts.length ? scheduleParts : STATIC_PARTS) as typeof STATIC_PARTS;

  // Use working staff (Dream Team) if available, otherwise all staff
  const staffToShow = useMemo(
    () => (workingStaff && workingStaff.length ? staff.filter(s => workingStaff.includes(s.id)) : staff),
    [staff, workingStaff],
  );

  const [activeStaffId, setActiveStaffId] = useState<ID | null>(staffToShow[0]?.id ?? null);

  // Keep active staff valid when staffToShow changes
  useEffect(() => {
    if (!staffToShow.length) {
      setActiveStaffId(null);
      return;
    }
    if (!activeStaffId || !staffToShow.some(s => s.id === activeStaffId)) {
      setActiveStaffId(staffToShow[0].id);
    }
  }, [staffToShow, activeStaffId]);

  const activeStaff = staffToShow.find(s => s.id === activeStaffId) || null;

  // Only show participants attending today (if set), else show all
  const participantsToShow = useMemo(() => {
    if (attendingParticipants && attendingParticipants.length) {
      return participants.filter(p => attendingParticipants.includes(p.id));
    }
    return participants;
  }, [participants, attendingParticipants]);

  // Build lists for "assigned" vs "not assigned" for the active staff
  const assignedIdsForActive = new Set(
    (activeStaffId && assignments && assignments[activeStaffId]) ? assignments[activeStaffId] : [],
  );

  const assignedList = participantsToShow.filter(p => assignedIdsForActive.has(p.id));
  const unassignedList = participantsToShow.filter(p => !assignedIdsForActive.has(p.id));

  const handleToggleAssignment = (participantId: ID) => {
    if (!activeStaffId) return;

    const current = assignments || {};
    const newAssignments: Record<ID, ID[]> = {};

    // First, remove this participant from all staff to ensure a single owner
    Object.entries(current).forEach(([sid, pids]) => {
      if (!Array.isArray(pids)) return;
      const filtered = pids.filter(id => id !== participantId);
      newAssignments[sid as ID] = filtered;
    });

    // Then toggle for the active staff
    const alreadyAssignedToActive = (current[activeStaffId] || []).includes(participantId);
    if (!alreadyAssignedToActive) {
      const existing = newAssignments[activeStaffId] || [];
      newAssignments[activeStaffId] = [...existing, participantId];
    } else {
      // If they were assigned to active staff, we just leave them removed
      newAssignments[activeStaffId] = newAssignments[activeStaffId] || [];
    }

    updateSchedule({ assignments: newAssignments });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Team Daily Assignments</Text>
          <Text style={styles.subtitle}>
            Choose a staff member, then tap participants to assign or unassign them. Each participant
            is assigned to only one staff member at a time.
          </Text>

          {/* Staff selector row */}
          <View style={styles.staffRow}>
            {staffToShow.length === 0 ? (
              <Text style={styles.helperText}>
                No staff available. Create a schedule and select your Dream Team first.
              </Text>
            ) : (
              staffToShow.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={activeStaffId === s.id}
                  onPress={() => setActiveStaffId(s.id)}
                  style={styles.staffChip}
                />
              ))
            )}
          </View>

          {/* Assignment lists */}
          {!activeStaff ? (
            <Text style={styles.helperText}>
              Select a staff member above to manage their participants.
            </Text>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                Assigned to {activeStaff.name}
              </Text>
              {assignedList.length === 0 ? (
                <Text style={styles.empty}>No participants assigned yet.</Text>
              ) : (
                assignedList.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.rowAssigned}
                    onPress={() => handleToggleAssignment(p.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rowText}>{p.name}</Text>
                    <Text style={styles.tagUnassign}>Tap to unassign</Text>
                  </TouchableOpacity>
                ))
              )}

              <Text style={styles.sectionTitle}>
                Not assigned to {activeStaff.name}
              </Text>
              {unassignedList.length === 0 ? (
                <Text style={styles.empty}>All attending participants are currently assigned.</Text>
              ) : (
                unassignedList.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.rowUnassigned}
                    onPress={() => handleToggleAssignment(p.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rowText}>{p.name}</Text>
                    <Text style={styles.tagAssign}>Tap to assign</Text>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
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
  staffRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  staffChip: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#3c234c',
  },
  rowAssigned: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fbe4f0',
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowUnassigned: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4d7f0',
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowText: {
    fontSize: 14,
    color: '#4c3b5c',
  },
  tagAssign: {
    fontSize: 11,
    color: '#e91e63',
  },
  tagUnassign: {
    fontSize: 11,
    color: '#7a4860',
  },
  empty: {
    fontSize: 13,
    opacity: 0.75,
    color: '#7a688c',
  },
  helperText: {
    fontSize: 13,
    opacity: 0.8,
    color: '#7a688c',
    marginBottom: 8,
  },
});
