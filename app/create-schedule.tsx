// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useSchedule } from '@/hooks/schedule-store';
import { persistFinish } from '@/hooks/persist-finish';
import {
  STAFF,
  PARTICIPANTS,
  CLEANING_TASKS,
  FLOATING_TIME_SLOTS,
} from '@/components/data';
import { ROUTES } from '@/components/routes';
import { useTodayLabel } from '@/components/use-today-label';

const PILL = 999;

const isEveryone = (name: string) =>
  name.trim().toLowerCase() === 'everyone';

// ---- helpers ----------------------------------------------------

function safeArray<T>(val: T[] | undefined | null, fallback: T[] = []): T[] {
  return Array.isArray(val) ? val : fallback;
}

// ---- main -------------------------------------------------------

export default function CreateScheduleScreen() {
  const router = useRouter();
  const { step: stepParam } = useLocalSearchParams<{ step?: string }>();
  const todayLabel = useTodayLabel();

  const {
    schedule,
    updateSchedule,
    createSchedule,
    clearSchedule,
  } = useSchedule();

  const scheduleStep = Number(stepParam ?? 1);
  const [localStep, setLocalStep] = useState<number>(
    Number(scheduleStep || 1) || 1,
  );
  const step = Math.max(Math.min(localStep || 1, 6), 1);
  const TOTAL_STEPS = 6;

  // base data
  const staffSource = STAFF;
  const partsSource = PARTICIPANTS;

  // local working state
  const [workingStaff, setWorkingStaff] = useState<string[]>(
    schedule?.workingStaff?.length
      ? schedule.workingStaff
      : staffSource.map(s => s.id),
  );
  const [attendingParticipants, setAttendingParticipants] = useState<string[]>(
    schedule?.attendingParticipants?.length
      ? schedule.attendingParticipants
      : [],
  );
  const [assignments, setAssignments] = useState<Record<string, string[]>>(
    schedule?.assignments ?? {},
  );
  const [pickupParticipants, setPickupParticipants] = useState<string[]>(
    schedule?.pickupParticipants ?? [],
  );
  const [helperStaff, setHelperStaff] = useState<string[]>(
    schedule?.helperStaff ?? [],
  );
  const [dropoffAssignments, setDropoffAssignments] = useState<
    Record<string, string[]>
  >({});
  const [finalChecklistStaff, setFinalChecklistStaff] = useState<string | null>(
    schedule?.finalChecklistStaff ?? null,
  );

  const progress = (step / TOTAL_STEPS) * 100;

  // ---- Step 1: Dream team ---------------------------------------

  const Step1 = () => {
    const workingSet = new Set(workingStaff);

    const toggleStaff = (id: string) => {
      if (id === 'everyone') {
        const allIds = staffSource.map(s => s.id);
        const isAllSelected = allIds.every(x => workingSet.has(x));
        const next = isAllSelected ? [] : allIds;
        setWorkingStaff(next);
        // also keep helpers in sync – helpers can only be non-working staff
        setHelperStaff(prev => prev.filter(hid => !next.includes(hid)));
        return;
      }

      setWorkingStaff(prev =>
        prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id],
      );
      setHelperStaff(prev => prev.filter(hid => hid !== id));
    };

    const workingLabel = useMemo(() => {
      if (!workingStaff.length) return 'No staff selected yet.';
      if (workingStaff.length === staffSource.length)
        return 'Everyone is working @ B2 today.';
      const names = staffSource
        .filter(s => workingStaff.includes(s.id))
        .map(s => s.name)
        .sort((a, b) => a.localeCompare(b));
      return `Working today: ${names.join(', ')}.`;
    }, [workingStaff]);

    const offDutyNames = staffSource
      .filter(s => !workingStaff.includes(s.id))
      .map(s => s.name)
      .sort((a, b) => a.localeCompare(b));

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Dream Team (Working @ B2)</Text>
        <Text style={styles.subTitle}>
          Select who&apos;s working @ B2 today. &quot;Everyone&quot; lets you
          quickly toggle the whole team. Staff not working here can still be
          used as dropoff helpers later.
        </Text>

        <View style={{ marginTop: 16 }}>
          <TouchableOpacity
            onPress={() => toggleStaff('everyone')}
            activeOpacity={0.9}
            style={[
              styles.tile,
              workingStaff.length === staffSource.length && styles.tileSel,
            ]}
          >
            <View
              style={[
                styles.rect,
                { backgroundColor: '#E5ECF5' },
              ]}
            />
            <Text style={styles.tileName}>Everyone</Text>
          </TouchableOpacity>

          <Text style={[styles.assignedSummary, { marginTop: 8 }]}>
            {workingLabel}
          </Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Team members</Text>
          <Text style={styles.subTitle}>
            Toggle staff on or off individually. This list is always sorted
            alphabetically.
          </Text>

          <View style={[styles.tiles, { marginTop: 12 }]}>
            {staffSource
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(st => {
                const sel = workingSet.has(st.id);
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.tile, sel && styles.tileSel]}
                    activeOpacity={0.9}
                    onPress={() => toggleStaff(st.id)}
                  >
                    <View
                      style={[
                        styles.rect,
                        { backgroundColor: st.color || '#E5ECF5' },
                      ]}
                    />
                    <Text style={styles.tileName}>{st.name}</Text>
                  </TouchableOpacity>
                );
              })}
          </View>

          {!!offDutyNames.length && (
            <Text style={[styles.assignedSummary, { marginTop: 8 }]}>
              Not working @ B2: {offDutyNames.join(', ')}.
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ---- Step 2: Attending participants ---------------------------

  const Step2 = () => {
    const attendingSet = new Set(attendingParticipants);

    const toggleParticipant = (id: string) => {
      setAttendingParticipants(prev =>
        prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id],
      );
      setAssignments(prev => {
        const next: Record<string, string[]> = {};
        Object.entries(prev).forEach(([staffId, pids]) => {
          next[staffId] = (pids || []).filter(p => p !== id);
        });
        return next;
      });
      setPickupParticipants(prev => prev.filter(pid => pid !== id));
      setDropoffAssignments(prev => {
        const next: Record<string, string[]> = {};
        Object.entries(prev).forEach(([sid, pids]) => {
          next[sid] = (pids || []).filter(pid => pid !== id);
        });
        return next;
      });
    };

    const attendingNames = partsSource
      .filter(p => attendingSet.has(p.id))
      .map(p => p.name)
      .sort((a, b) => a.localeCompare(b));

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Attending Participants</Text>
        <Text style={styles.subTitle}>
          Choose which participants are attending today. Only these will appear
          in the assignment steps.
        </Text>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Participants</Text>
          <Text style={styles.subTitle}>
            Tap a name to toggle whether they&apos;re attending today. This list
            is sorted alphabetically.
          </Text>

          <View style={[styles.tiles, { marginTop: 12 }]}>
            {partsSource
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => {
                const sel = attendingSet.has(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.tile, sel && styles.tileSel]}
                    activeOpacity={0.9}
                    onPress={() => toggleParticipant(p.id)}
                  >
                    <View style={styles.rect} />
                    <Text style={styles.tileName}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}
          </View>

          {!!attendingNames.length ? (
            <Text style={[styles.assignedSummary, { marginTop: 8 }]}>
              Attending today: {attendingNames.join(', ')}.
            </Text>
          ) : (
            <Text style={[styles.assignedSummary, { marginTop: 8 }]}>
              No participants selected yet.
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ---- Step 3: Team daily assignments ---------------------------

  const Step3 = () => {
    const attending = partsSource
      .filter(p => attendingParticipants.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const workingList = staffSource
      .filter(s => workingStaff.includes(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const assignmentsSafe = assignments || {};
    const assignedTo = new Map<string, string>();
    Object.entries(assignmentsSafe).forEach(([sid, pids]) => {
      (pids || []).forEach(pid => {
        assignedTo.set(pid, sid);
      });
    });

    const unassigned = attending.filter(p => !assignedTo.has(p.id));

    const toggleAssignment = (staffId: string, participantId: string) => {
      setAssignments(prev => {
        const next: Record<string, string[]> = {};
        Object.entries(prev).forEach(([sid, pids]) => {
          next[sid] = (pids || []).filter(pid => pid !== participantId);
        });

        const wasAssignedTo = assignedTo.get(participantId);
        if (wasAssignedTo === staffId) {
          return next;
        }

        if (!next[staffId]) next[staffId] = [];
        next[staffId].push(participantId);
        return next;
      });
    };

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Team Daily Assignments</Text>
        <Text style={styles.subTitle}>
          Working staff @ B2 (including Everyone) with their individual
          participant assignments. Tap a name to move them between staff
          members.
        </Text>

        {workingList.map(st => {
          const staffAssignments = safeArray(assignmentsSafe[st.id]);
          const assigned = attending.filter(p =>
            staffAssignments.includes(p.id),
          );
          const anyAssigned = assigned.length > 0;

          return (
            <View key={st.id} style={{ marginTop: 16 }}>
              <View style={styles.assignmentCard}>
                <View style={styles.assignmentHeader}>
                  <View
                    style={[
                      styles.rect,
                      { backgroundColor: st.color || '#E5ECF5' },
                    ]}
                  />
                  <Text style={styles.assignmentName}>{st.name}</Text>
                </View>

                <Text style={styles.assignedSummary}>
                  {anyAssigned
                    ? `Assigned: ${assigned.map(p => p.name).join(', ')}`
                    : 'No participants assigned yet.'}
                </Text>

                <View style={[styles.chipGrid, { marginTop: 8 }]}>
                  {attending.map(p => {
                    const selectedForStaff =
                      safeArray(assignmentsSafe[st.id]).includes(p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.chip,
                          selectedForStaff && styles.chipSel,
                        ]}
                        onPress={() => toggleAssignment(st.id, p.id)}
                        activeOpacity={0.9}
                      >
                        <Text
                          style={[
                            styles.chipTxt,
                            selectedForStaff && styles.chipTxtSel,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}

        {unassigned.length > 0 && (
          <Text style={[styles.assignedSummary, { marginTop: 12 }]}>
            Unassigned participants:{' '}
            {unassigned.map(p => p.name).join(', ')}.
          </Text>
        )}
      </View>
    );
  };

  // ---- Step 4: Pickups & dropoffs ------------------------------------------
  const Step4 = () => {
    const pickupSet = new Set(pickupParticipants || []);
    const helperSet = new Set(helperStaff || []);

    const attending = partsSource
      .filter(p => attendingParticipants.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const workingList = staffSource
      .filter(s => workingStaff.includes(s.id) && !isEveryone(s.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    const helperCandidates = staffSource
      .filter(
        s => !workingStaff.includes(s.id) && !isEveryone(s.name),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const dropoffEligible = attending.filter(p => !pickupSet.has(p.id));

    const assignedTo = new Map<string, string>();
    Object.entries(dropoffAssignments || {}).forEach(([sid, pids]) => {
      (pids || []).forEach(pid => {
        assignedTo.set(pid, sid);
      });
    });

    const [showHelpers, setShowHelpers] = useState(false);

    const togglePickupLocal = (pid: string) => {
      setPickupParticipants(prev =>
        prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid],
      );
    };

    const toggleHelperLocal = (sid: string) => {
      setHelperStaff(prev =>
        prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid],
      );
    };

    const toggleDropoffLocal = (staffId: string, participantId: string) => {
      setDropoffAssignments(prev => {
        const next: Record<string, string[]> = {};
        for (const [sid, pids] of Object.entries(prev)) {
          next[sid] = [...pids];
        }

        for (const [sid, pids] of Object.entries(next)) {
          next[sid] = pids.filter(pid => pid !== participantId);
        }

        const currentlyAssignedTo = assignedTo.get(participantId);
        if (currentlyAssignedTo === staffId) {
          return next;
        }

        if (!next[staffId]) next[staffId] = [];
        next[staffId].push(participantId);
        return next;
      });
    };

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Pickups & Dropoffs</Text>
        <Text style={styles.subTitle}>
          Choose which participants are picked up by external transport, which
          staff will assist, and who is responsible for each dropoff. You can
          adjust everything later in the Edit Hub.
        </Text>

        {/* Pickups */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Pickups</Text>
          <Text style={styles.subTitle}>
            Select participants being picked up by external transport. These
            participants will not appear in the dropoff lists.
          </Text>

          {attending.length ? (
            <View style={styles.chipGrid}>
              {attending.map(p => {
                const sel = pickupSet.has(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, sel && styles.chipSel]}
                    onPress={() => togglePickupLocal(p.id)}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[styles.chipTxt, sel && styles.chipTxtSel]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              Pickups are only available once you have at least one attending
              participant.
            </Text>
          )}
        </View>

        {/* Helpers */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text style={styles.sectionTitle}>
                Dropoff Helpers (optional)
              </Text>
              <Text style={styles.subTitle}>
                Select staff who will assist with pickups and dropoffs. Only
                team members not working at B2 are shown here.
              </Text>
            </View>
            {helperCandidates.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowHelpers(v => !v)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: '#175CD3',
                    fontWeight: '600',
                  }}
                >
                  {showHelpers ? 'Hide helpers' : 'Show helpers'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showHelpers && helperCandidates.length > 0 && (
            <View style={styles.chipGrid}>
              {helperCandidates.map(st => {
                const sel = helperSet.has(st.id);
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.chip, sel && styles.chipSel]}
                    onPress={() => toggleHelperLocal(st.id)}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[styles.chipTxt, sel && styles.chipTxtSel]}
                    >
                      {st.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Dropoffs */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Dropoffs</Text>
          <Text style={styles.subTitle}>
            Assign each dropoff participant to one staff member. Participants in
            Pickups won&apos;t appear here. Tap a name to move them between
            staff members.
          </Text>

          {workingList.length === 0 ? (
            <Text style={styles.emptyHint}>
              Set your Dream Team in Step 1 before assigning dropoffs.
            </Text>
          ) : dropoffEligible.length === 0 ? (
            <Text style={styles.emptyHint}>
              Once you have attending participants who are not in Pickups,
              you&apos;ll be able to assign their dropoffs here.
            </Text>
          ) : (
            <View style={{ marginTop: 12, gap: 12 }}>
              {workingList.map(st => {
                const assigned = dropoffEligible.filter(
                  p => assignedTo.get(p.id) === st.id,
                );
                const anyAssigned = assigned.length > 0;

                return (
                  <View key={st.id} style={styles.assignmentCard}>
                    <View style={styles.assignmentHeader}>
                      <View
                        style={[
                          styles.rect,
                          { backgroundColor: st.color || '#E5ECF5' },
                        ]}
                      />
                      <Text style={styles.assignmentName}>{st.name}</Text>
                    </View>

                    <Text style={styles.assignedSummary}>
                      {anyAssigned
                        ? `Assigned: ${assigned
                            .map(p => p.name)
                            .join(', ')}`
                        : 'No dropoffs assigned yet.'}
                    </Text>

                    <View style={[styles.chipGrid, { marginTop: 8 }]}>
                      {dropoffEligible.map(p => {
                        const selectedForStaff =
                          assignedTo.get(p.id) === st.id;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.chip,
                              selectedForStaff && styles.chipSel,
                            ]}
                            onPress={() =>
                              toggleDropoffLocal(st.id, p.id)
                            }
                            activeOpacity={0.9}
                          >
                            <Text
                              style={[
                                styles.chipTxt,
                                selectedForStaff && styles.chipTxtSel,
                              ]}
                            >
                              {p.name}
                            </Text>
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

  // ---- Step 5: Automatic Floating & Cleaning message -----------------------
  const Step5 = () => (
    <View style={styles.section}>
      <Text style={styles.title}>
        Automatic Floating & Cleaning Assignments
      </Text>
      <Text style={styles.subTitle}>
        Daily Schedule App will now generate floating and end-of-shift cleaning
        assignments automatically when you finish creating today&apos;s
        schedule. You can review and adjust these later in the Edit Hub.
      </Text>
    </View>
  );

  // ---- Step 6: Final checklist ---------------------------------------------

  const Step6 = () => {
    const workingList = staffSource
      .filter(s => workingStaff.includes(s.id) && !isEveryone(s.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    const finalId =
      finalChecklistStaff && workingStaff.includes(finalChecklistStaff)
        ? finalChecklistStaff
        : workingList.length
        ? workingList[0].id
        : null;

    const handleSelect = (id: string) => {
      setFinalChecklistStaff(id);
    };

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Final Checklist Assignment</Text>
        <Text style={styles.subTitle}>
          Choose who is last to leave and responsible for the End-of-Shift
          checklist. Only staff working @ B2 are listed here.
        </Text>

        <View style={{ marginTop: 16 }}>
          {workingList.length === 0 ? (
            <Text style={styles.emptyHint}>
              Set your Dream Team in Step 1 before assigning the checklist.
            </Text>
          ) : (
            workingList.map(st => {
              const selected = finalId === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[styles.row, selected && styles.rowSel]}
                  onPress={() => handleSelect(st.id)}
                  activeOpacity={0.9}
                >
                  <View
                    style={[
                      styles.rect,
                      { backgroundColor: st.color || '#E5ECF5' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.rowTxt,
                      selected && styles.rowTxtSel,
                    ]}
                  >
                    {st.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    );
  };

  // ---- navigation actions ---------------------------------------------------

  const canGoBack = step > 1;
  const canGoNext = step < TOTAL_STEPS;

  const goStep = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), TOTAL_STEPS);
    setLocalStep(clamped);
  };

  const handleBack = () => {
    if (!canGoBack) {
      router.push(ROUTES.HOME);
      return;
    }
    goStep(step - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    goStep(step + 1);
  };

  const handleFinish = async () => {
    const payload = {
      workingStaff,
      attendingParticipants,
      assignments,
      pickupParticipants,
      helperStaff,
      dropoffAssignments,
      finalChecklistStaff,
    };

    const created = await createSchedule(payload);
    await persistFinish(created, {
      cleaning: CLEANING_TASKS,
      floatingSlots: FLOATING_TIME_SLOTS,
      staff: staffSource,
      participants: partsSource,
    });

    router.push(ROUTES.EDIT_HUB);
  };

  const backLabel = step === 1 ? 'Home' : 'Back';
  const nextLabel = step === TOTAL_STEPS ? 'Finish & go to Edit Hub' : 'Next';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={{
              paddingHorizontal: 4,
              paddingVertical: 4,
              marginRight: 4,
            }}
          >
            <ChevronLeft size={18} color="#175CD3" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Today&apos;s Schedule</Text>
        </View>
        <Text style={styles.headerStep}>
          Step {step} of {TOTAL_STEPS}
        </Text>

        <View style={styles.progressOuter}>
          <View style={[styles.progressInner, { width: `${progress}%` }]} />
        </View>

        <View style={styles.datePill}>
          <Text style={styles.dateTxt}>{todayLabel}</Text>
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center' }}>
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
                Follow the steps below to create today&apos;s schedule. You can
                make adjustments later from the Edit Hub.
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
      </View>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.btnBase, styles.backBtn]}
            activeOpacity={0.9}
          >
            <Text style={styles.backTxt}>{backLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={step === TOTAL_STEPS ? handleFinish : handleNext}
            style={[styles.btnBase, styles.nextBtn]}
            activeOpacity={0.95}
          >
            <Text style={styles.nextTxt}>{nextLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---- styles -----------------------------------------------------

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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#101828',
    marginBottom: 8,
  },
  subTitle: { fontSize: 13, color: '#667085', marginBottom: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
    marginBottom: 6,
  },

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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
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
