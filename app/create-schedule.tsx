// app/create-schedule.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ROUTES } from '@/constants/ROUTES';
import { STAFF, PARTICIPANTS } from '@/constants/data';
import SectionHeader from '@/components/SectionHeader';
import Chip from '@/components/Chip';
import { useSchedule } from '@/hooks/schedule-store';
import { persistFinish } from '@/hooks/persist-finish';

type ID = string;

const MAX_STEP = 4;

export default function CreateScheduleScreen() {
  const { createSchedule } = useSchedule();

  const [step, setStep] = useState(1);
  const [workingStaff, setWorkingStaff] = useState<ID[]>([]);
  const [attendingParticipants, setAttendingParticipants] = useState<ID[]>([]);
  const [finalChecklistStaff, setFinalChecklistStaff] = useState<ID | undefined>();
  const [assignments, setAssignments] = useState<Record<ID, ID[]>>({});

  // --- Step 3: Team Daily Assignments helpers ---

  // Only allow assigning attending participants
  const participantsToAssign = useMemo(
    () =>
      PARTICIPANTS.filter((p) => attendingParticipants.includes(p.id)),
    [attendingParticipants],
  );

  // Staff shown for assignments = Dream Team if picked, else all staff
  const staffForAssignments = useMemo(
    () =>
      workingStaff.length
        ? STAFF.filter((s) => workingStaff.includes(s.id))
        : STAFF,
    [workingStaff],
  );

  const [activeStaffId, setActiveStaffId] = useState<ID | null>(
    staffForAssignments[0]?.id ?? null,
  );

  useEffect(() => {
    if (!staffForAssignments.length) {
      setActiveStaffId(null);
      return;
    }
    if (!activeStaffId || !staffForAssignments.some((s) => s.id === activeStaffId)) {
      setActiveStaffId(staffForAssignments[0].id);
    }
  }, [staffForAssignments, activeStaffId]);

  const activeStaff = staffForAssignments.find((s) => s.id === activeStaffId) || null;

  const assignedIdsForActive = new Set(
    activeStaffId && assignments[activeStaffId]
      ? assignments[activeStaffId]
      : [],
  );

  const assignedList = participantsToAssign.filter((p) =>
    assignedIdsForActive.has(p.id),
  );
  const unassignedList = participantsToAssign.filter(
    (p) => !assignedIdsForActive.has(p.id),
  );

  const toggleAssignmentForActive = (participantId: ID) => {
    if (!activeStaffId) return;

    setAssignments((current) => {
      const next: Record<ID, ID[]> = {};

      // First, remove this participant from all staff to enforce single owner
      Object.entries(current).forEach(([sid, pids]) => {
        next[sid as ID] = (pids || []).filter((id) => id !== participantId);
      });

      const existingForActive = next[activeStaffId] || [];
      const alreadyAssigned = existingForActive.includes(participantId);

      if (!alreadyAssigned) {
        next[activeStaffId] = [...existingForActive, participantId];
      } else {
        // If was assigned to active, we just leave it removed
        next[activeStaffId] = existingForActive.filter((id) => id !== participantId);
      }

      return next;
    });
  };

  // --- Step navigation & finish ---

  const handleNext = () => setStep((s) => Math.min(MAX_STEP, s + 1));
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = async () => {
    if (!finalChecklistStaff) {
      alert('Please select who will complete the End of Shift Checklist.');
      return;
    }

    await persistFinish({
      createSchedule,
      staff: STAFF,
      participants: PARTICIPANTS,
      workingStaff,
      attendingParticipants,
      assignments,
      finalChecklistStaff,
    });

    router.replace(ROUTES.EDIT);
  };

  // --- Step content renderers ---

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.section}>
            <SectionHeader
              title="The Dream Team (Working at B2)"
              subtitle="Tap staff to mark who is working at B2 today."
            />
            <View style={styles.chipGrid}>
              {STAFF.map((st) => (
                <Chip
                  key={st.id}
                  label={st.name}
                  selected={workingStaff.includes(st.id)}
                  onPress={() =>
                    setWorkingStaff((prev) =>
                      prev.includes(st.id)
                        ? prev.filter((x) => x !== st.id)
                        : [...prev, st.id],
                    )
                  }
                />
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.section}>
            <SectionHeader
              title="Attending Participants"
              subtitle="Tap participants attending Day Program today."
            />
            <View style={styles.chipGrid}>
              {PARTICIPANTS.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  selected={attendingParticipants.includes(p.id)}
                  onPress={() =>
                    setAttendingParticipants((prev) =>
                      prev.includes(p.id)
                        ? prev.filter((x) => x !== p.id)
                        : [...prev, p.id],
                    )
                  }
                />
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.section}>
            <SectionHeader
              title="Team Daily Assignments"
              subtitle="Choose a staff member, then tap participants to assign or unassign them. Each participant is assigned to only one staff member."
            />

            {/* Staff selector */}
            <View style={styles.staffRow}>
              {staffForAssignments.length === 0 ? (
                <Text style={styles.helperText}>
                  No staff available. Please select your Dream Team in Step 1.
                </Text>
              ) : (
                staffForAssignments.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    selected={activeStaffId === s.id}
                    onPress={() => setActiveStaffId(s.id)}
                    // small spacing:
                    // @ts-ignore - Chip may not declare style prop
                    style={{ marginBottom: 8 }}
                  />
                ))
              )}
            </View>

            {/* Participant lists */}
            {!activeStaff ? (
              <Text style={styles.helperText}>
                Select a staff member above to manage their participants.
              </Text>
            ) : (
              <>
                <Text style={styles.sectionSubTitle}>
                  Assigned to {activeStaff.name}
                </Text>
                {assignedList.length === 0 ? (
                  <Text style={styles.empty}>No participants assigned yet.</Text>
                ) : (
                  assignedList.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.rowAssigned}
                      onPress={() => toggleAssignmentForActive(p.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rowText}>{p.name}</Text>
                      <Text style={styles.tagUnassign}>Tap to unassign</Text>
                    </TouchableOpacity>
                  ))
                )}

                <Text style={[styles.sectionSubTitle, { marginTop: 12 }]}>
                  Not assigned to {activeStaff.name}
                </Text>
                {unassignedList.length === 0 ? (
                  <Text style={styles.empty}>
                    All attending participants are currently assigned to someone.
                  </Text>
                ) : (
                  unassignedList.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.rowUnassigned}
                      onPress={() => toggleAssignmentForActive(p.id)}
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
        );

      case 4:
        return (
          <View style={styles.section}>
            <SectionHeader
              title="End of Shift Checklist"
              subtitle="Who is last to leave and responsible for the checklist?"
            />

            <View style={styles.chipGrid}>
              {workingStaff.length === 0 ? (
                <Text style={styles.helperText}>
                  Please select at least one Dream Team member in Step 1.
                </Text>
              ) : (
                STAFF.filter((s) => workingStaff.includes(s.id)).map((st) => (
                  <Chip
                    key={st.id}
                    label={st.name}
                    selected={finalChecklistStaff === st.id}
                    onPress={() => setFinalChecklistStaff(st.id)}
                  />
                ))
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // --- Render ---

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Create today&apos;s schedule</Text>
          <Text style={styles.stepLabel}>
            Step {step} of {MAX_STEP}
          </Text>

          {renderStep()}
        </View>
      </ScrollView>

      <View style={styles.stepControls}>
        <View style={styles.stepInner}>
          {step > 1 ? (
            <TouchableOpacity style={styles.stepButton} onPress={handleBack}>
              <Text style={styles.stepButtonLabel}>‹ Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {step < MAX_STEP ? (
            <TouchableOpacity style={styles.stepButtonPrimary} onPress={handleNext}>
              <Text style={styles.stepButtonPrimaryLabel}>Next ›</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stepButtonPrimary} onPress={handleFinish}>
              <Text style={styles.stepButtonPrimaryLabel}>
                Finish &amp; Go to Edit Hub
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
    paddingTop: 24,
    paddingBottom: 80,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    color: '#332244',
  },
  stepLabel: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 16,
    color: '#5a486b',
  },
  section: {
    marginBottom: 24,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  staffRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    opacity: 0.75,
    color: '#5a486b',
  },
  sectionSubTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
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
  stepControls: {
    borderTopWidth: 1,
    borderColor: '#e4d7f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  stepInner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonLabel: {
    fontSize: 14,
    color: '#4c3b5c',
  },
  stepButtonPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#e91e63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPrimaryLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
