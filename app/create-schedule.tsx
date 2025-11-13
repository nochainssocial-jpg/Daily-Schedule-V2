// app/create-schedule.tsx
// @ts-nocheck

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { STAFF, PARTICIPANTS } from '@/constants/data';
import { ROUTES } from '@/constants/ROUTES';
import SectionHeader from '@/components/SectionHeader';
import Chip from '@/components/Chip';
import { useSchedule } from '@/hooks/schedule-store';
import { persistFinish } from '@/hooks/persist-finish';

type ID = string;

const MAX_STEP = 5;

export default function CreateScheduleScreen() {
  const { createSchedule } = useSchedule();

  const [step, setStep] = useState(1);
  const [workingStaff, setWorkingStaff] = useState<ID[]>([]);
  const [attendingParticipants, setAttendingParticipants] = useState<ID[]>([]);
  const [finalChecklistStaff, setFinalChecklistStaff] = useState<ID | undefined>();
  const [assignments, setAssignments] = useState<Record<ID, ID[]>>({});

  // NEW: Step 4 state
  const [pickupParticipants, setPickupParticipants] = useState<ID[]>([]);
  const [helperStaff, setHelperStaff] = useState<ID[]>([]);
  const [dropoffAssignments, setDropoffAssignments] = useState<Record<ID, ID[]>>({});

  // ---------- STEP 3: Team Daily Assignments helpers ----------

  const participantsToAssign = useMemo(
    () =>
      PARTICIPANTS.filter((p) => attendingParticipants.includes(p.id)),
    [attendingParticipants],
  );

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

      // Remove this participant from all staff first (single owner)
      Object.entries(current).forEach(([sid, pids]) => {
        next[sid as ID] = (pids || []).filter((id) => id !== participantId);
      });

      const existingForActive = next[activeStaffId] || [];
      const alreadyAssigned = existingForActive.includes(participantId);

      if (!alreadyAssigned) {
        next[activeStaffId] = [...existingForActive, participantId];
      } else {
        next[activeStaffId] = existingForActive.filter((id) => id !== participantId);
      }

      return next;
    });
  };

  // ---------- STEP 4: Pickups & Dropoffs helpers ----------

  const staffById = new Map(STAFF.map((s) => [s.id, s]));
  const participantsById = new Map(PARTICIPANTS.map((p) => [p.id, p]));

  const helperCandidates = useMemo(
    () => STAFF.filter((s) => !workingStaff.includes(s.id)),
    [workingStaff],
  );

  const dropoffCandidates = useMemo(
    () =>
      attendingParticipants.filter(
        (pid) => !pickupParticipants.includes(pid),
      ),
    [attendingParticipants, pickupParticipants],
  );

  const dropoffStaffIds = useMemo(
    () => Array.from(new Set([...workingStaff, ...helperStaff])),
    [workingStaff, helperStaff],
  );

  const dropoffStaff = dropoffStaffIds
    .map((id) => staffById.get(id))
    .filter(Boolean) as typeof STAFF;

  const unassignedDropoff = useMemo(() => {
    const assigned = new Set<ID>();
    Object.values(dropoffAssignments || {}).forEach((pids) =>
      (pids || []).forEach((id) => assigned.add(id)),
    );
    return dropoffCandidates.filter((pid) => !assigned.has(pid));
  }, [dropoffCandidates, dropoffAssignments]);

  const [showHelpers, setShowHelpers] = useState(false);

  const togglePickup = (pid: ID) => {
    if (pickupParticipants.includes(pid)) {
      setPickupParticipants(pickupParticipants.filter((id) => id !== pid));
    } else {
      setPickupParticipants([...pickupParticipants, pid]);

      // also remove from dropoff assignments if it was assigned
      setDropoffAssignments((current) => {
        const next: Record<ID, ID[]> = {};
        Object.entries(current).forEach(([sid, pids]) => {
          next[sid as ID] = (pids || []).filter((id) => id !== pid);
        });
        return next;
      });
    }
  };

  const toggleHelper = (sid: ID) => {
    if (helperStaff.includes(sid)) {
      setHelperStaff(helperStaff.filter((id) => id !== sid));
      setDropoffAssignments((current) => {
        const next = { ...current };
        delete next[sid];
        return next;
      });
    } else {
      setHelperStaff([...helperStaff, sid]);
    }
  };

  const assignDropoff = (pid: ID, sid: ID) => {
    setDropoffAssignments((current) => {
      const next: Record<ID, ID[]> = {};
      // Remove from all staff first
      Object.entries(current).forEach(([staffId, pids]) => {
        next[staffId as ID] = (pids || []).filter((id) => id !== pid);
      });
      // Add to selected
      next[sid] = [...(next[sid] || []), pid];
      return next;
    });
  };

  // ---------- Navigation ----------

  const handleNext = () => setStep((s) => Math.min(MAX_STEP, s + 1));
  const handleBack = () => {
    if (step === 1) {
      router.replace(ROUTES.HOME);
    } else {
      setStep((s) => Math.max(1, s - 1));
    }
  };

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
      // pickups & helpers & dropoffs will be fully wired in persistFinish next
      pickupParticipants,
      helperStaff,
      dropoffAssignments,
    } as any);

    router.replace(ROUTES.EDIT);
  };

  // ---------- Render Steps ----------

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
              title="Pickups & Dropoffs"
              subtitle="Mark pickups, optional helpers, and assign dropoffs as needed."
            />

            {/* Pickups */}
            <Text style={styles.stepTitle}>Pickups</Text>
            <Text style={styles.helperText}>
              Select participants being picked up by external transport.
            </Text>
            <View style={styles.chipGrid}>
              {attendingParticipants.map((pid) => {
                const p = participantsById.get(pid);
                if (!p) return null;
                return (
                  <Chip
                    key={pid}
                    label={p.name}
                    selected={pickupParticipants.includes(pid)}
                    onPress={() => togglePickup(pid)}
                  />
                );
              })}
            </View>

            {/* Helpers (collapsible) */}
            <View style={{ marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setShowHelpers(!showHelpers)}
                activeOpacity={0.8}
              >
                <Text style={styles.helperToggle}>
                  {showHelpers ? '▼ Hide Helpers' : '➕ Add Helpers (optional)'}
                </Text>
              </TouchableOpacity>

              {showHelpers && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.helperText}>
                    Select staff (not working at B2) to assist with dropoffs.
                  </Text>
                  <View style={styles.chipGrid}>
                    {helperCandidates.map((s) => (
                      <Chip
                        key={s.id}
                        label={s.name}
                        selected={helperStaff.includes(s.id)}
                        onPress={() => toggleHelper(s.id)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {helperStaff.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionSubTitle}>Helpers added:</Text>
                  {helperStaff.map((sid) => {
                    const s = staffById.get(sid);
                    return (
                      <View key={sid} style={styles.helperRow}>
                        <Text style={styles.rowText}>{s?.name}</Text>
                        <TouchableOpacity onPress={() => toggleHelper(sid)}>
                          <Text style={styles.removeHelper}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Dropoffs */}
            <Text style={[styles.stepTitle, { marginTop: 24 }]}>Dropoffs</Text>

            {dropoffStaff.length === 0 ? (
              <Text style={styles.empty}>
                No dropoff staff available. Add helpers or select working staff.
              </Text>
            ) : (
              <>
                <Text style={styles.helperText}>
                  Tap a participant to assign staff for dropoff.
                </Text>

                {/* Assigned section */}
                <Text style={styles.sectionSubTitle}>Assigned</Text>
                {Object.entries(dropoffAssignments).map(([sid, pids]) => {
                  const staff = staffById.get(sid);
                  return (
                    <View key={sid} style={{ marginBottom: 10 }}>
                      <Text style={styles.staffName}>{staff?.name}</Text>
                      {pids.length === 0 ? (
                        <Text style={styles.emptySmall}>
                          No dropoff assignments yet.
                        </Text>
                      ) : (
                        pids.map((pid) => {
                          const p = participantsById.get(pid);
                          return (
                            <TouchableOpacity
                              key={pid}
                              style={styles.rowAssigned}
                              onPress={() => assignDropoff(pid, sid as ID)}
                            >
                              <Text style={styles.rowText}>{p?.name}</Text>
                              <Text style={styles.rowHint}>Tap to reassign</Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  );
                })}

                {/* Unassigned section */}
                <Text style={styles.sectionSubTitle}>Unassigned</Text>
                {unassignedDropoff.length === 0 ? (
                  <Text style={styles.empty}>All participants are assigned.</Text>
                ) : (
                  unassignedDropoff.map((pid) => {
                    const p = participantsById.get(pid);
                    return (
                      <View key={pid} style={styles.unassignedBlock}>
                        <Text style={styles.rowText}>{p?.name}</Text>
                        <View style={styles.staffPickerRow}>
                          {dropoffStaff.map((s) => (
                            <TouchableOpacity
                              key={s.id}
                              style={styles.staffChip}
                              onPress={() => assignDropoff(pid, s.id)}
                            >
                              <Text style={styles.staffChipText}>{s.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </View>
        );

      case 5:
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

  // ---------- Render Shell ----------

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
          <TouchableOpacity style={styles.stepButton} onPress={handleBack}>
            <Text style={styles.stepButtonLabel}>‹ Back</Text>
          </TouchableOpacity>

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
    gap: 8,
  },
  staffRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  helperText: {
    fontSize: 13,
    opacity: 0.75,
    color: '#5a486b',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
    color: '#3c234c',
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
  emptySmall: {
    fontSize: 12,
    opacity: 0.75,
    color: '#7a688c',
  },
  helperToggle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a488c',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  removeHelper: {
    fontSize: 12,
    color: '#e91e63',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3c234c',
    marginBottom: 4,
  },
  rowHint: {
    fontSize: 11,
    color: '#a8446f',
  },
  unassignedBlock: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0d0ef',
    marginBottom: 8,
  },
  staffPickerRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  staffChip: {
    backgroundColor: '#ece1f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  staffChipText: {
    fontSize: 12,
    color: '#3a2464',
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
