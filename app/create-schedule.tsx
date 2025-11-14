// app/create-schedule.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';

import { persistFinish } from '@/hooks/persist-finish';
import useSchedule from '@/hooks/schedule-adapter';
import { STAFF, PARTICIPANTS } from '@/components/data';
import * as Data from '@/components/data';
import PickDropEditor from '@/components/PickDropEditor';

type ID = string;
type FloatRow = { frontRoom?: ID; scotty?: ID; twins?: ID };

const EDIT_HUB = '/edit';

const nm = (x?: string) => (x || '').trim().toLowerCase();
const isAntoinette = (x?: string) => nm(x) === 'antoinette';
const isEveryone   = (x?: string) => nm(x) === 'everyone';

// ---- seed helpers for floating/cleaning/final checklist --------------------
function makeFloatingSeed(): Record<string, FloatRow> {
  const slots = (Data as any).TIME_SLOTS ?? [];
  const seed: Record<string, FloatRow> = {};
  for (const s of (slots || [])) seed[String((s as any).id)] = {};
  return seed;
}
function makeChecklistSeed(): Record<string, boolean> {
  const defs = (Data as any).DEFAULT_CHECKLIST ?? [];
  const out: Record<string, boolean> = {};
  for (const c of (defs || [])) out[String((c as any).id)] = false;
  return out;
}
// Twins FSO windows (11:00–11:30 and 13:00–13:30); also respects slot ids '3' and '7' if used
function isFSOTwinsSlot(slot: any): boolean {
  const id = String(slot?.id ?? '');
  if (id === '3' || id === '7') return true;
  const st = (slot?.startTime || '').slice(0,5);
  const en = (slot?.endTime || '').slice(0,5);
  return (st === '11:00' && en === '11:30') || (st === '13:00' && en === '13:30');
}
// Round-robin builder, avoids immediate repeat when possible; Twins use female pool during FSO
function buildInitialFloatingAssignments(
  staffSource: Array<{ id: ID; name?: string; gender?: string }>,
  realWorkers: string[]
): Record<string, FloatRow> {
  const slots: any[] = (Data as any).TIME_SLOTS ?? [];
  const byId: Record<string, any> = {};
  for (const s of staffSource) byId[s.id] = s;

  // Identify special staff
  const everyone = staffSource.find(s => isEveryone(s.name));
  const everyoneId = everyone?.id;
  const anto = staffSource.find(s => isAntoinette(s.name));
  const antoId = anto?.id;

  // Base worker pool: real workers, excluding "Everyone"
  const baseWorkers = (realWorkers || [])
    .filter(Boolean)
    .filter(id => id !== everyoneId);

  let iFR = 0, iSC = 0, iTW = 0;
  let lastFR: string | undefined, lastSC: string | undefined, lastTW: string | undefined;

  const nextFrom = (arr: string[], last: string | undefined, idx: 'FR' | 'SC' | 'TW') => {
    if (!arr.length) return undefined;
    let i = idx === 'FR' ? iFR : idx === 'SC' ? iSC : iTW;
    for (let step = 0; step < arr.length; step++) {
      const cid = arr[i % arr.length];
      i = (i + 1) % arr.length;
      if (cid !== last || arr.length === 1) {
        if (idx === 'FR') iFR = i;
        if (idx === 'SC') iSC = i;
        if (idx === 'TW') iTW = i;
        return cid;
      }
    }
    if (idx === 'FR') iFR = i;
    if (idx === 'SC') iSC = i;
    if (idx === 'TW') iTW = i;
    return arr[0];
  };

  const out: Record<string, FloatRow> = {};

  for (const slot of slots) {
    const sid = String(slot.id);
    const row: FloatRow = {};
    const start = String(slot?.startTime || '').slice(0, 5); // 'HH:MM'

    // For this slot, build the effective worker pools:
    // - Always exclude "Everyone"
    // - Antoinette is only available for floating AFTER 1:30pm (i.e., >= 13:30)
    const workersForSlot = baseWorkers.filter(id => {
      if (!antoId || id !== antoId) return true;
      return start >= '13:30';
    });

    const femalesForSlot = workersForSlot.filter(
      id => (byId[id]?.gender || '').toLowerCase() === 'female'
    );

    row.frontRoom = nextFrom(workersForSlot, lastFR, 'FR');
    lastFR = row.frontRoom;

    row.scotty = nextFrom(workersForSlot, lastSC, 'SC');
    lastSC = row.scotty;

    const pool = isFSOTwinsSlot(slot) ? femalesForSlot : workersForSlot;
    row.twins = nextFrom(pool, lastTW, 'TW');
    lastTW = row.twins;

    out[sid] = row;
  }

  return out;
}

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
      try { setScheduleStep(clamped); } catch {}
    }
  };

  // ---- sources & defaults --------------------------------------------------
  const staffSource = (Array.isArray(staff) && staff.length ? staff : STAFF) || [];
  const partsSource = (Array.isArray(participants) && participants.length ? participants : PARTICIPANTS) || [];
  const everyone = staffSource.find(s => isEveryone(s.name));
  const everyoneId = everyone?.id;

  const [workingStaff, setWorkingStaff] = useState<string[]>(() => (everyoneId ? [everyoneId] : []));
  const [attendingParticipants, setAttendingParticipants] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Array<{ staffId: string; participantIds: string[] }>>([]);
  const [finalChecklistStaff, setFinalChecklistStaff] = useState<string>('');

  // harmless defaults for PickDropEditor
  const isSelected = (_: string) => false;
  const selectedAnywhere = (_: string) => false;
  const toggleLeg = (_sid: string, _pid: string, _leg: 'pickup' | 'dropoff') => {};

  // ---- date ---------------------------------------------------------------
  const dateObj = useMemo(() => {
    if (!selectedDate || typeof selectedDate !== 'string') return new Date();
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDate]);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];

  // ---- toggles -------------------------------------------------------------
  const toggleStaff = (id: string) =>
    setWorkingStaff(prev => {
      // Always keep "Everyone" selected; never allow it to be removed
      if (id === everyoneId) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      const exists = prev.includes(id);
      if (exists) {
        // Toggling off a non-Everyone staff member
        return prev.filter(x => x !== id);
      }
      // Toggling on: ensure Everyone is present in the working staff list
      if (everyoneId && !prev.includes(everyoneId)) {
        return [everyoneId, ...prev, id];
      }
      return [...prev, id];
    });

  const toggleParticipant = (id: string) =>
    setAttendingParticipants(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

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
      // Remove from any other staff first
      const out = prev.map(r =>
        r.staffId === staffId
          ? r
          : { ...r, participantIds: (r.participantIds || []).filter(id => id !== participantId) }
      );
      const target = out.find(r => r.staffId === staffId);
      if (target) {
        if (!target.participantIds.includes(participantId)) {
          target.participantIds = [...target.participantIds, participantId];
        }
      }
      return [...out];
    });
  };

  const unassign = (participantId: string) => {
    setAssignments(prev =>
      prev.map(r => ({
        ...r,
        participantIds: (r.participantIds || []).filter(id => id !== participantId),
      })),
    );
  };

  // ---- adapter bridge ------------------------------------------------------
  const TOTAL_STEPS = 5;

  // ---- Step 1: Working staff -----------------------------------------------
  const Step1 = () => {
    const validStaff = staffSource.filter(s => !isEveryone(s.name)); // keep Everyone out of the bottom list
    const selected = new Set(workingStaff);
    const selectedTop = [
      ...(everyone && selected.has(everyone.id) ? [everyone] : []),
      ...validStaff.filter(s => selected.has(s.id)),
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Working @ B2 Today</Text>

        <View style={styles.workingWrap}>
          {selectedTop.length ? (
            <View style={styles.tiles}>
              {selectedTop.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => toggleStaff(s.id)}
                  style={[styles.tile, styles.tileSel]}
                  activeOpacity={0.85}
                >
                  <View style={[styles.rect, { backgroundColor: s.color || '#ddd' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tileName}>{s.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>Select at least one staff member to work @ B2 today.</Text>
          )}
        </View>

        <Text style={styles.subTitle}>Tap to add or remove staff from today’s Dream Team</Text>
        <View style={styles.tiles}>
          {validStaff.map(s => {
            const sel = selected.has(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => toggleStaff(s.id)}
                style={[styles.tile, sel && styles.tileSel]}
                activeOpacity={0.85}
              >
                <View style={[styles.rect, { backgroundColor: s.color || '#ddd' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tileName}>{s.name}</Text>
                </View>
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
        <Text style={styles.title}>Participants attending Day Program today</Text>
        <Text style={styles.subTitle}>Tap to mark who is attending today.</Text>

        <View style={styles.attendingWrap}>
          {partsSource.map(p => {
            const sel = selected.has(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => toggleParticipant(p.id)}
                style={[styles.row, sel && styles.rowSel]}
                activeOpacity={0.85}
              >
                <View style={[styles.rect, { backgroundColor: sel ? '#175CD3' : '#E6ECF5' }]} />
                <Text style={[styles.rowTxt, sel && styles.rowTxtSel]}>{p.name}</Text>
                {sel && <Check size={18} color="#175CD3" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ---- Step 3: Assign participants to staff --------------------------------
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
        <Text style={styles.title}>Assign Participants to Staff</Text>
        <Text style={{ color: '#667085', marginBottom: 8 }}>
          Antoinette (TL) is excluded from assignment rows.
        </Text>

        <View style={{ gap: 10 }}>
          {rows.map(a => {
            const st = staffSource.find(s => s.id === a.staffId);
            const staffAssignedPids = a.participantIds || [];

            // Pretty summary for this staff member
            const assignedNames = staffAssignedPids
              .map(pid => partsSource.find(p => p.id === pid)?.name)
              .filter(Boolean)
              .join(', ');

            // For this row, show:
            //  - all unassigned participants
            //  - plus anyone already assigned to THIS staff
            const availablePids = (attendingParticipants || []).filter(pid => {
              const assignedStaff = assignedByParticipant[pid];
              return !assignedStaff || assignedStaff === a.staffId;
            });

            return (
              <View
                key={a.staffId}
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 10 }}
              >
                {/* Staff header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <View style={[styles.rect, { backgroundColor: st?.color || '#ddd' }]} />
                  <Text style={styles.rowTxt}>{st?.name ?? '—'}</Text>
                </View>

                {/* Sticky "Assigned" summary */}
                {staffAssignedPids.length > 0 && (
                  <Text style={styles.assignedSummary}>
                    Assigned: {assignedNames}
                  </Text>
                )}

                {/* Chips: unassigned + this staff's assigned participants */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {availablePids.map(pid => {
                    const isAssigned = staffAssignedPids.includes(pid);
                    const part = partsSource.find(p => p.id === pid);
                    return (
                      <TouchableOpacity
                        key={pid}
                        onPress={() =>
                          isAssigned ? unassign(pid) : assignTo(a.staffId, pid)
                        }
                        activeOpacity={0.85}
                        style={[
                          styles.chip,
                          isAssigned && styles.chipSel,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipTxt,
                            isAssigned && styles.chipTxtSel,
                          ]}
                          numberOfLines={1}
                        >
                          {part?.name || '—'}
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
      </View>
    );
  };

  // ---- Step 4: Auto-assignment preview (floating / cleaning) ---------------
  const Step4 = () => {
    const floatingSeed = makeFloatingSeed();
    const cleaningSeed = (Data as any).DEFAULT_CHORES || [];

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Automatic Floating & Cleaning Preview</Text>
        <Text style={styles.subTitle}>
          This step will auto-seed floating and cleaning duties using round-robin logic.
        </Text>

        <Text style={{ marginTop: 12, fontSize: 14, color: '#475467' }}>
          Floating Time Slots:
        </Text>
        {Object.keys(floatingSeed).map(slotId => (
          <View key={slotId} style={styles.row}>
            <Text style={styles.rowTxt}>Slot #{slotId}</Text>
          </View>
        ))}

        <Text style={{ marginTop: 16, fontSize: 14, color: '#475467' }}>
          Cleaning Duties (preview only, finalised on completion):
        </Text>
        {cleaningSeed.map((ch: any) => (
          <View key={String(ch.id)} style={styles.row}>
            <Text style={styles.rowTxt}>{String(ch.name || '')}</Text>
          </View>
        ))}

        <Text style={{ marginTop: 12, fontSize: 12, color: '#98A2B3' }}>
          Auto-assignment balances Front Room, Scotty, Twins and distributes chores — no back-to-back
          slots.
        </Text>
      </View>
    );
  };

  const Step5 = () => (
    <View style={styles.section}>
      <Text style={styles.title}>Final Checklist Assignment</Text>
      {(workingStaff || []).map(id => {
        const st = staffSource.find(s => s.id === id);
        const selected = finalChecklistStaff === id;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => setFinalChecklistStaff(id)}
            style={[styles.row, selected && styles.rowSel]}
            activeOpacity={0.85}
          >
            <View style={[styles.rect, { backgroundColor: st?.color || '#ddd' }]} />
            <Text style={[styles.rowTxt, selected && styles.rowTxtSel]}>{st?.name ?? '—'}</Text>
            {selected && <Check size={18} color="#175CD3" />}
          </TouchableOpacity>
        );
      })}
      <Text style={{ marginTop: 12, fontSize: 12, color: '#98A2B3' }}>
        The selected staff member will be responsible for completing the End-of-Shift checklist.
      </Text>
    </View>
  );

  const TOTAL = TOTAL_STEPS;

  // ---- validation + finish -------------------------------------------------
  const onComplete = async () => {
    if (!workingStaff || workingStaff.length === 0) {
      Alert.alert('Dream Team', 'Please select at least one staff member working @ B2 today.');
      return;
    }
    if (!attendingParticipants || attendingParticipants.length === 0) {
      Alert.alert('Attending Participants', 'Please select at least one participant attending today.');
      return;
    }

    const realWorkers = workingStaff.filter(id => {
      const st = staffSource.find(s => s.id === id);
      return !!st && !isEveryone(st.name);
    });

    if (!realWorkers.length) {
      Alert.alert('Working Staff', '"Everyone" cannot be the only working staff. Please add at least one real staff.');
      return;
    }

    if (!finalChecklistStaff) {
      Alert.alert('Final checklist', 'Choose one of the working staff to complete the end-of-shift checklist.');
      return;
    }

    try {
      await persistFinish({
        createSchedule,
        staff: staffSource ?? [],
        participants: partsSource ?? [],
        workingStaff: realWorkers,
        attendingParticipants,
        // drafts (if you later store wizard-local edits)
        floatingDraft: {},
        cleaningDraft: {},
        finalChecklistDraft: {},
        finalChecklistStaff,
      });
    } catch (e) {
      console.warn('persistFinish error, continuing to /edit anyway:', e);
    }

    try { router.replace(EDIT_HUB); } catch {}
  };

  const onNext = () => (step < TOTAL_STEPS ? setStep(step + 1) : onComplete());
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
                  try { touch?.(); } catch {}
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
                <View style={[styles.progressInner, { width: `${(step / TOTAL) * 100}%` }]} />
              </View>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.inner}>
            <View style={styles.datePill}>
              <Text style={styles.dateTxt}>
                {day} {dateObj.toLocaleDateString()}
              </Text>
            </View>

            {step === 1 && <Step1 />}
            {step === 2 && <Step2 />}
            {step === 3 && <Step3 />}
            {step === 4 && <Step4 />}
            {step === 5 && <Step5 />}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <TouchableOpacity
              onPress={() => {
                try { touch?.(); } catch {}
                if (step === 1) router.back();
                else onBack();
              }}
              style={[styles.btnBase, styles.backBtn]}
              activeOpacity={0.95}
            >
              <Text style={styles.backTxt}>{step === 1 ? 'Cancel' : 'Back'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNext}
              style={[styles.btnBase, styles.nextBtn]}
              activeOpacity={0.95}
            >
              <Text style={styles.nextTxt}>{step === TOTAL ? 'Finish' : 'Next'}</Text>
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
  page: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6ECF5',
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
  chipDisable: { opacity: 0.4 },
  chipTxt: { fontSize: 14, color: '#101828' },
  chipTxtSel: { color: '#FFF' },
  chipTxtDisable: { color: '#475467' },

  assignedSummary: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  rowSel: { backgroundColor: '#EEF4FF', borderColor: '#D1E0FF' },
  rowTxt: { fontSize: 14, color: '#101828', flex: 1 },
  rowTxtSel: { color: '#175CD3' },

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5ECF5',
    padding: 12,
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

  attendingWrap: {
    minHeight: 120,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'flex-start',
    marginBottom: 2,
  },
});
