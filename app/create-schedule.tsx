// app/create-schedule.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';

import { persistFinish } from '@/hooks/persist-finish';
import useSchedule from '@/hooks/schedule-adapter';
import { STAFF, PARTICIPANTS } from '@/constants/data';

type ID = string;

const EDIT_HUB = '/edit';

const nm = (x?: string) => (x || '').trim().toLowerCase();
const isEveryone = (name?: string) => nm(name) === 'everyone';
const isAntoinette = (name?: string) => nm(name) === 'antoinette';

// how many steps in the wizard
const TOTAL_STEPS = 6;

export default function CreateScheduleScreen() {
  // ---- safe hook access ----------------------------------------------------
  let hook: any = {};
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hook = useSchedule() || {};
  } catch (e) {
    console.warn('[create-schedule] useSchedule() failed; using fallbacks:', e);
  }

  const {
    staff = [],
    participants = [],
    createSchedule,
    selectedDate,
    scheduleStep,
    setScheduleStep,
    touch,
  } = hook;

  // ---- step state (web-stable) ----------------------------------------
  const [localStep, setLocalStep] = useState<number>(Number(scheduleStep ?? 1) || 1);
  const step = Math.min(Math.max(Number(scheduleStep ?? localStep), 1), TOTAL_STEPS);
  const setStep = (n: number) => {
    const clamped = Math.min(Math.max(Number(n || 1), 1), TOTAL_STEPS);
    setLocalStep(clamped);
    if (typeof setScheduleStep === 'function') {
      try {
        setScheduleStep(clamped);
      } catch {}
    }
  };

  // ---- sources & defaults --------------------------------------------------
  const staffSource = (Array.isArray(staff) && staff.length ? staff : STAFF) || [];
  const partsSource =
    (Array.isArray(participants) && participants.length ? participants : PARTICIPANTS) || [];
  const everyone = staffSource.find(s => isEveryone(s.name));
  const everyoneId = everyone?.id;

  const [workingStaff, setWorkingStaff] = useState<string[]>(() =>
    everyoneId ? [everyoneId] : [],
  );
  const [attendingParticipants, setAttendingParticipants] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<
    Array<{ staffId: string; participantIds: string[] }>
  >([]);

  const [pickupParticipants, setPickupParticipants] = useState<string[]>([]);
  const [helperStaff, setHelperStaff] = useState<string[]>([]);
  const [dropoffAssignments, setDropoffAssignments] = useState<Record<string, string[]>>({});
  const [finalChecklistStaff, setFinalChecklistStaff] = useState<string>('');

  // ---- date ----------------------------------------------------------------
  const dateLabel = useMemo(() => {
    if (!selectedDate) return 'Today';
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return 'Today';
    }
  }, [selectedDate]);

  // keep working staff always sorted + Everyone at top if present
  useEffect(() => {
    setWorkingStaff(prev => {
      const ids = [...new Set(prev)];
      const staffMap = new Map(staffSource.map(s => [s.id, s]));
      const normalised = ids
        .filter(id => staffMap.has(id))
        .sort((a, b) => {
          const sa = staffMap.get(a)?.name || '';
          const sb = staffMap.get(b)?.name || '';
          return sa.localeCompare(sb);
        });

      // Keep Everyone at the front if present
      if (everyoneId) {
        const rest = normalised.filter(id => id !== everyoneId);
        return [everyoneId, ...rest];
      }
      return normalised;
    });
  }, [staffSource, everyoneId]);

  const toggleWorking = (id: string) =>
    setWorkingStaff(prev => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter(x => x !== id);
      }
      if (everyoneId && id === everyoneId) {
        // when selecting "Everyone", ensure it's at the front
        return [everyoneId, ...prev.filter(x => x !== everyoneId)];
      }
      if (everyoneId && prev.includes(everyoneId)) {
        // keep Everyone at the front
        const without = prev.filter(x => x !== id);
        return [everyoneId, ...without, id];
      }
      return [...prev, id];
    });

  const toggleParticipant = (id: string) =>
    setAttendingParticipants(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );

  // keep assignment rows synced (EXCLUDE Antoinette ONLY)
  useEffect(() => {
    const filteredWorking = (workingStaff || []).filter(sid => {
      const st = staffSource.find(s => s.id === sid);
      return !isAntoinette(st?.name);
    });
    setAssignments(prev => {
      const keep = new Set(filteredWorking);
      const next = prev.filter(r => keep.has(r.staffId));
      const existingIds = new Set(next.map(r => r.staffId));
      for (const sid of filteredWorking) {
        if (!existingIds.has(sid)) {
          next.push({ staffId: sid, participantIds: [] });
        }
      }
      return next;
    });
  }, [workingStaff, staffSource]);

  const assignTo = (staffId: string, participantId: string) => {
    setAssignments(prev => {
      const next = [...prev];
      const row = next.find(r => r.staffId === staffId);
      if (!row) return prev;
      if (row.participantIds.includes(participantId)) {
        row.participantIds = row.participantIds.filter(id => id !== participantId);
      } else {
        row.participantIds = [...row.participantIds, participantId];
      }
      return next;
    });
  };

  // ---- Step 1: Working staff -----------------------------------------------
  const Step1 = () => {
    const validStaff = staffSource.filter(s => !isEveryone(s.name)); // keep Everyone out of bottom list
    const selected = new Set(workingStaff);

    const selectedTop = [
      ...(everyone && selected.has(everyone.id) ? [everyone] : []),
      ...validStaff.filter(s => selected.has(s.id)),
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Dream Team (Working @ B2)</Text>
        <Text style={styles.subTitle}>
          Select who is working @ B2 today. &quot;Everyone&quot; lets you quickly include the whole
          team, but you can still toggle individuals on or off.
        </Text>

        {/* Top: selected staff */}
        <View style={styles.workingWrap}>
          {selectedTop.length ? (
            <View style={styles.chipGrid}>
              {selectedTop.map(st => (
                <TouchableOpacity
                  key={st.id}
                  onPress={() => toggleWorking(st.id)}
                  style={[
                    styles.chipTile,
                    selected.has(st.id) && styles.chipTileSel,
                  ]}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.rect,
                      { backgroundColor: st.color || '#E6ECF5' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.chipLabel,
                      selected.has(st.id) && styles.chipLabelSel,
                    ]}
                    numberOfLines={1}
                  >
                    {st.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              Select at least one staff member working @ B2 today.
            </Text>
          )}
        </View>

        {/* Bottom: full pool as tiles */}
        <View style={styles.chipGrid}>
          {validStaff.map(st => {
            const sel = selected.has(st.id);
            return (
              <TouchableOpacity
                key={st.id}
                onPress={() => toggleWorking(st.id)}
                style={[styles.chipTile, sel && styles.chipTileSel]}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.rect,
                    { backgroundColor: st.color || '#E6ECF5' },
                  ]}
                />
                <Text
                  style={[styles.chipLabel, sel && styles.chipLabelSel]}
                  numberOfLines={1}
                >
                  {st.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ---- Step 2: Attending participants --------------------------------------
  const Step2 = () => {
    const selected = new Set(attendingParticipants);

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Attending Participants</Text>
        <Text style={styles.subTitle}>
          Choose which participants are attending today. Only these will appear in the assignment
          steps.
        </Text>

        {/* Top: selected participants */}
        <View style={styles.workingWrap}>
          {attendingParticipants.length ? (
            <View style={styles.chipGrid}>
              {partsSource
                .filter(p => selected.has(p.id))
                .map(p => (
                  <View key={p.id} style={styles.selectedRow}>
                    <Text style={styles.selectedName}>{p.name}</Text>
                    <Text style={styles.assignedSummary}>Attending today</Text>
                  </View>
                ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              Select at least one participant attending today.
            </Text>
          )}
        </View>

        {/* Bottom: full pool as tiles */}
        <View style={styles.chipGrid}>
          {partsSource.map(p => {
            const sel = selected.has(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => toggleParticipant(p.id)}
                style={[styles.chipTile, sel && styles.chipTileSel]}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.rect,
                    { backgroundColor: sel ? '#175CD3' : '#E6ECF5' },
                  ]}
                />
                <Text
                  style={[styles.chipLabel, sel && styles.chipLabelSel]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ---- Step 3: Team Daily Assignments --------------------------------------
  const Step3 = () => {
    // Exclude Antoinette from assignment rows
    const rows = (assignments || []).filter(a => {
      const st = staffSource.find(s => s.id === a.staffId);
      return !isAntoinette(st?.name);
    });

    // Map: participantId -> staffId (who they are assigned to)
    const assignedByParticipant: Record<string, string> = {};
    for (const row of rows) {
      (row.participantIds || []).forEach(pid => {
        assignedByParticipant[pid] = row.staffId;
      });
    }

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Team Daily Assignments</Text>
        <Text style={styles.subTitle}>
          Assign each attending participant to a working staff member. You can always adjust these
          in the Edit Hub.
        </Text>

        {rows.length === 0 ? (
          <Text style={styles.emptyHint}>
            Select at least one working staff member (excluding Antoinette) in Step 1.
          </Text>
        ) : !attendingParticipants.length ? (
          <Text style={styles.emptyHint}>
            Participants will appear here after you select at least one attending participant.
          </Text>
        ) : (
          <View style={styles.assignmentsWrap}>
            {rows.map(row => {
              const st = staffSource.find(s => s.id === row.staffId);
              if (!st) return null;

              const assigned = new Set(row.participantIds || []);

              return (
                <View key={row.staffId} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeader}>
                    <View
                      style={[
                        styles.rect,
                        { backgroundColor: st.color || '#E6ECF5' },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assignmentName}>{st.name}</Text>
                      <Text style={styles.assignedSummary}>
                        {assigned.size
                          ? `${assigned.size} participant${assigned.size > 1 ? 's' : ''} assigned`
                          : 'No participants assigned yet'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.chipRow}>
                    {attendingParticipants.map(pid => {
                      const p = partsSource.find(x => x.id === pid);
                      if (!p) return null;
                      const isAssigned = assigned.has(pid);
                      const assignedElsewhere =
                        !isAssigned && assignedByParticipant[pid] && assignedByParticipant[pid] !== row.staffId;

                      return (
                        <TouchableOpacity
                          key={pid}
                          onPress={() => assignTo(row.staffId, pid)}
                          style={[
                            styles.chip,
                            isAssigned && styles.chipSel,
                            assignedElsewhere && { opacity: 0.4 },
                          ]}
                          activeOpacity={0.85}
                          disabled={assignedElsewhere}
                        >
                          <Text
                            style={[
                              styles.chipTxt,
                              isAssigned && styles.chipTxtSel,
                            ]}
                          >
                            {p.name}
                          </Text>
                          {isAssigned && <Check size={14} color="#fff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ---- Step 4: Pickups, Helpers & Dropoffs ---------------------------------
  const Step4 = () => {
    const pickupSet = new Set(pickupParticipants || []);
    const helperSet = new Set(helperStaff || []);

    const staffById = new Map(staffSource.map(s => [s.id, s]));
    const participantsById = new Map(partsSource.map(p => [p.id, p]));

    // Section 1: participants eligible for pickups = attending only
    const attendingParts = attendingParticipants
      .map(pid => participantsById.get(pid))
      .filter(Boolean) as { id: ID; name: string }[];

    // Section 2: helpers = staff pool excluding all working staff
    const helperCandidates = staffSource.filter(s => !workingStaff.includes(s.id));

    // Section 3: dropoffs
    const dropoffStaffIds: ID[] = [...workingStaff, ...helperStaff];
    const dropoffStaff = dropoffStaffIds
      .map(id => staffById.get(id))
      .filter(Boolean) as { id: ID; name: string; color?: string }[];

    // participants that can be dropped off = attending but not pickups
    const dropoffCandidateIds = attendingParticipants.filter(pid => !pickupSet.has(pid));

    // Map: participantId -> staffId for dropoffs
    const assignedByParticipant: Record<string, ID> = {};
    Object.entries(dropoffAssignments || {}).forEach(([sid, pids]) => {
      (pids || []).forEach(pid => {
        assignedByParticipant[pid] = sid as ID;
      });
    });

    const togglePickupLocal = (pid: ID) => {
      setPickupParticipants(prev =>
        prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid],
      );

      // when adding to pickups, ensure removed from all dropoff assignments
      setDropoffAssignments(prev => {
        const next: Record<string, string[]> = {};
        Object.entries(prev || {}).forEach(([sid, pids]) => {
          next[sid] = (pids || []).filter(id => id !== pid);
        });
        return next;
      });
    };

    const toggleHelperLocal = (sid: ID) => {
      setHelperStaff(prev => {
        const exists = prev.includes(sid);
        if (exists) {
          // remove helper + clear their dropoff assignments
          setDropoffAssignments(prevAssign => {
            const next = { ...(prevAssign || {}) };
            delete next[sid];
            return next;
          });
          return prev.filter(id => id !== sid);
        } else {
          return [...prev, sid];
        }
      });
    };

    const toggleDropoff = (staffId: ID, pid: ID) => {
      // Only from dropoff candidates
      if (!dropoffCandidateIds.includes(pid)) return;

      setDropoffAssignments(prev => {
        const current = prev || {};
        const next: Record<string, string[]> = {};

        // remove this participant from all staff first (single-owner rule)
        Object.entries(current).forEach(([sid, pids]) => {
          next[sid] = (pids || []).filter(id => id !== pid);
        });

        const existingForStaff = current[staffId] || [];
        const alreadyForStaff = existingForStaff.includes(pid);

        if (!alreadyForStaff) {
          const updated = next[staffId] || [];
          next[staffId] = [...updated, pid];
        } else {
          // was assigned to this staff, so we keep it removed
          next[staffId] = next[staffId] || [];
        }

        return next;
      });
    };

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Pickups & Dropoffs</Text>
        <Text style={styles.subTitle}>
          Choose which participants are picked up by external transport, which staff will help with
          dropoffs, and which staff member is responsible for each dropoff.
        </Text>

        {/* SECTION 1: PICKUPS */}
        <View style={{ marginTop: 12 }}>
          <Text style={styles.sectionTitle}>Pickups</Text>
          <Text style={styles.subTitle}>
            Select participants being picked up by external transport.
          </Text>

          {attendingParts.length ? (
            <View style={styles.chipGrid}>
              {attendingParts.map(p => {
                const sel = pickupSet.has(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => togglePickupLocal(p.id)}
                    style={[styles.chip, sel && styles.chipSel]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipTxt, sel && styles.chipTxtSel]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              Pickups are only available once you have at least one attending participant.
            </Text>
          )}
        </View>

        {/* SECTION 2: HELPERS */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Dropoff Helpers (optional)</Text>
          <Text style={styles.subTitle}>
            Select staff (not working @ B2) who will assist with pickups and dropoffs.
          </Text>

          {helperCandidates.length ? (
            <View style={styles.chipGrid}>
              {helperCandidates.map(st => {
                const sel = helperSet.has(st.id);
                return (
                  <TouchableOpacity
                    key={st.id}
                    onPress={() => toggleHelperLocal(st.id)}
                    style={[styles.chip, sel && styles.chipSel]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipTxt, sel && styles.chipTxtSel]}>
                      {st.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              All staff are currently working @ B2; no extra helpers are available.
            </Text>
          )}
        </View>

        {/* SECTION 3: DROPOFFS (Team Daily-style cards) */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.sectionTitle}>Dropoffs</Text>
          <Text style={styles.subTitle}>
            Assign each dropoff participant to one staff member. Participants in Pickups will not
            appear here.
          </Text>

          {!dropoffStaff.length ? (
            <Text style={styles.emptyHint}>
              To manage dropoffs, select at least one working staff member in Step 1 or add helpers
              above.
            </Text>
          ) : !dropoffCandidateIds.length ? (
            <Text style={styles.emptyHint}>
              All attending participants are currently marked as pickups. Remove some pickups to
              assign dropoffs.
            </Text>
          ) : (
            <View style={styles.assignmentsWrap}>
              {dropoffStaff.map(st => {
                const staffId = st.id as ID;
                const assignedList = new Set(dropoffAssignments[staffId] || []);

                return (
                  <View key={staffId} style={styles.assignmentCard}>
                    <View style={styles.assignmentHeader}>
                      <View
                        style={[
                          styles.rect,
                          { backgroundColor: st.color || '#E6ECF5' },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignmentName}>{st.name}</Text>
                        <Text style={styles.assignedSummary}>
                          {assignedList.size
                            ? `${assignedList.size} dropoff${assignedList.size > 1 ? 's' : ''} assigned`
                            : 'No dropoffs assigned yet'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.chipRow}>
                      {dropoffCandidateIds.map(pid => {
                        const p = participantsById.get(pid);
                        if (!p) return null;

                        const isAssigned = assignedList.has(pid);
                        const assignedElsewhere =
                          !isAssigned &&
                          assignedByParticipant[pid] &&
                          assignedByParticipant[pid] !== staffId;

                        return (
                          <TouchableOpacity
                            key={pid}
                            onPress={() => toggleDropoff(staffId, pid)}
                            style={[
                              styles.chip,
                              isAssigned && styles.chipSel,
                              assignedElsewhere && { opacity: 0.4 },
                            ]}
                            activeOpacity={0.85}
                            disabled={assignedElsewhere}
                          >
                            <Text
                              style={[
                                styles.chipTxt,
                                isAssigned && styles.chipTxtSel,
                              ]}
                            >
                              {p.name}
                            </Text>
                            {isAssigned && <Check size={14} color="#fff" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ---- Step 5: Auto-Assignments message -----------------------------------
  const Step5 = () => (
    <View style={styles.section}>
      <Text style={styles.title}>Automatic Floating & Cleaning Assignments</Text>
      <Text style={styles.subTitle}>
        Daily Schedule App will now generate auto-assignments for all Floating and Cleaning
        responsibilities based on today&apos;s Dream Team and Attending Participants.
        {'\n\n'}
        Press <Text style={{ fontWeight: '700' }}>Finish &amp; go to Edit Hub</Text> to complete
        the schedule and review or adjust these assignments.
      </Text>
    </View>
  );

  // ---- Step 6: Final checklist staff ---------------------------------------
  // STEP 6 – Final Checklist Assignment
  const Step6 = () => {
    // Only real working staff (exclude "Everyone") and de-duplicate
    const workingReal = (workingStaff || []).filter(id => {
      const st = staffSource.find(s => s.id === id);
      if (!st) return false;
      return (st.name || '').trim().toLowerCase() !== 'everyone';
    });

    const uniqueWorkingReal = Array.from(new Set(workingReal));

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Final Checklist Assignment</Text>
        <Text style={styles.subTitle}>
          Choose who is last to leave and responsible for completing the End-of-Shift checklist.
        </Text>

        <View style={styles.workingWrap}>
          {uniqueWorkingReal.length === 0 ? (
            <Text style={styles.emptyHint}>
              Select at least one working staff member in Step 1 before assigning the final checklist.
            </Text>
          ) : (
            uniqueWorkingReal.map(id => {
              const st = staffSource.find(s => s.id === id);
              if (!st) return null;

              const selected = finalChecklistStaff === id;

              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.row, selected && styles.rowSel]}
                  onPress={() => setFinalChecklistStaff(id)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.rect,
                      { backgroundColor: st.color || '#E6ECF5' },
                    ]}
                  />
                  <Text style={[styles.rowTxt, selected && styles.rowTxtSel]}>
                    {st.name}
                  </Text>
                  {selected && <Check size={18} color="#175CD3" />}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <Text style={[styles.subTitle, { marginTop: 12 }]}>
          The selected staff member will be responsible for completing the End-of-Shift checklist.
        </Text>
      </View>
    );
  };

  const TOTAL = TOTAL_STEPS;

  // ---- validation + finish -------------------------------------------------
  const onComplete = async () => {
    if (!workingStaff || workingStaff.length === 0) {
      Alert.alert(
        'Dream Team',
        'Please select at least one staff member working @ B2 today.',
      );
      return;
    }
    if (!attendingParticipants || attendingParticipants.length === 0) {
      Alert.alert(
        'Attending Participants',
        'Please select at least one participant attending today.',
      );
      return;
    }

    const realWorkers = workingStaff.filter(id => {
      const st = staffSource.find(s => s.id === id);
      return !!st && !isEveryone(st.name);
    });

    if (!realWorkers.length) {
      Alert.alert(
        'Working Staff',
        '"Everyone" cannot be the only working staff. Please add at least one real staff.',
      );
      return;
    }

    if (!finalChecklistStaff) {
      Alert.alert(
        'Final checklist',
        'Choose one of the working staff to complete the end-of-shift checklist.',
      );
      return;
    }

    // 🔹 convert wizard rows → map<ID, ID[]> for persistFinish
    const attendingSet = new Set(attendingParticipants || []);
    const assignmentsMap: Record<ID, ID[]> = {};

    (assignments || []).forEach(row => {
      const sid = row.staffId as ID;
      if (!sid) return;
      const cleaned = (row.participantIds || []).filter(pid =>
        attendingSet.has(pid),
      );
      assignmentsMap[sid] = cleaned;
    });

    try {
      await persistFinish({
        createSchedule,
        staff: staffSource ?? [],
        participants: partsSource ?? [],
        workingStaff: realWorkers,
        attendingParticipants,
        assignments: assignmentsMap,
        floatingDraft: {},
        cleaningDraft: {},
        finalChecklistDraft: {},
        finalChecklistStaff,
        pickupParticipants,
        helperStaff,
        dropoffAssignments,          // ✅ now persisted to store
        date: selectedDate,
      });
    } catch (e) {
      console.warn('persistFinish error, continuing to /edit anyway:', e);
    }

    try {
      router.replace(EDIT_HUB);
    } catch {}
  };

  const onNext = () => (step < TOTAL ? setStep(step + 1) : onComplete());
  const onBack = () => setStep(step > 1 ? step - 1 : 1);

  // ---- UI ------------------------------------------------------------------
  return (
    <>
      <Stack.Screen
        options={{
          header: () => (
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => {
                  try {
                    touch?.();
                  } catch {}
                  if (step === 1) router.back();
                  else onBack();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <ChevronLeft size={20} color="#667085" />
                <Text style={{ color: '#667085', fontSize: 14 }}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Create Today’s Schedule</Text>
              <Text style={styles.headerStep}>
                Step {step} of {TOTAL}
              </Text>

              <View style={styles.progressOuter}>
                <View
                  style={[
                    styles.progressInner,
                    { width: `${(step / TOTAL) * 100}%` },
                  ]}
                />
              </View>

              <View style={styles.datePill}>
                <Text style={styles.dateTxt}>{dateLabel}</Text>
              </View>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView
          style={styles.page}
          contentContainerStyle={{
            paddingBottom: 80,
            alignItems: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 13, color: '#667085' }}>
                Follow the steps below to create today&apos;s schedule. You can make adjustments
                later from the Edit Hub.
              </Text>
            </View>

            {step === 1 && <Step1 />}
            {step === 2 && <Step2 />}
            {step === 3 && <Step3 />}
            {step === 4 && <Step4 />}
            {step === 5 && <Step5 />}
            {step === 6 && <Step6 />}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <TouchableOpacity
              onPress={onBack}
              style={[styles.btnBase, styles.backBtn]}
              activeOpacity={0.95}
            >
              <Text style={styles.backTxt}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNext}
              style={[styles.btnBase, styles.nextBtn]}
              activeOpacity={0.95}
            >
              <Text style={styles.nextTxt}>
                {step < TOTAL ? 'Next' : 'Finish & go to Edit Hub'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const PILL = 999;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  page: { flex: 1, paddingHorizontal: 16 },
  inner: { width: '100%', maxWidth: 880, flex: 1 },

  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECF5',
    backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#101828' },
  headerStep: { marginTop: 6, fontSize: 12, color: '#667085' },
  progressOuter: {
    marginTop: 8,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5ECF5',
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#175CD3',
  },
  datePill: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: PILL,
    backgroundColor: '#EEF4FF',
  },
  dateTxt: { fontSize: 12, color: '#175CD3', fontWeight: '600' },

  section: { marginTop: 16, paddingBottom: 24 },
  title: { fontSize: 18, fontWeight: '800', color: '#101828', marginBottom: 8 },
  subTitle: { fontSize: 13, color: '#667085', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#101828', marginBottom: 6 },

  workingWrap: {
    minHeight: 120,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  emptyHint: { fontSize: 13, color: '#98A2B3' },

  // OLD list-style tiles (still used in other steps if you want)
  tiles: {
    marginTop: 8,
    gap: 8,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5ECF5',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF',
    gap: 8,
  },
  tileSel: {
    backgroundColor: '#EEF4FF',
    borderColor: '#D1E0FF',
  },

  rect: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E6ECF5',
  },
  tileName: { fontSize: 14, fontWeight: '600', color: '#101828' },

  // Generic chip style
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6ECF5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 6,
  },
  chipSel: { backgroundColor: '#175CD3', borderColor: '#175CD3' },
  chipTxt: { fontSize: 14, color: '#101828' },
  chipTxtSel: { color: '#FFF' },

  // grid + tile styles for Steps 1 & 2 and dropoff chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chipTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5ECF5',
    backgroundColor: '#FFF',
    minWidth: 160,
    maxWidth: 220,
    gap: 6,
  },
  chipTileSel: {
    backgroundColor: '#EEF4FF',
    borderColor: '#D1E0FF',
  },
  chipLabel: {
    fontSize: 14,
    color: '#101828',
    flexShrink: 1,
  },
  chipLabelSel: {
    color: '#175CD3',
    fontWeight: '600',
  },

  assignedSummary: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 2,
  },

  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  selectedName: { fontSize: 14, color: '#101828' },

  assignmentsWrap: {
    marginTop: 12,
    gap: 12,
  },
  assignmentCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5ECF5',
    borderRadius: 12,
    padding: 10,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  assignmentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#101828',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    backgroundColor: '#FFF',
    gap: 8,
    marginBottom: 6,
  },
  rowSel: {
    backgroundColor: '#EEF4FF',
    borderColor: '#D1E0FF',
  },
  rowTxt: { flex: 1, fontSize: 14, color: '#101828' },
  rowTxtSel: { color: '#175CD3', fontWeight: '600' },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5ECF5',
    backgroundColor: '#FFF',
  },
  footerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    gap: 12,
  },
  btnBase: {
    flex: 1,
    paddingVertical: Platform.select({ ios: 10, android: 10, default: 8 }),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    backgroundColor: '#FFF',
  },
  backTxt: { fontSize: 14, color: '#344054', fontWeight: '600' },
  nextBtn: { backgroundColor: '#175CD3' },
  nextTxt: { fontSize: 14, color: '#FFF', fontWeight: '600' },
});
