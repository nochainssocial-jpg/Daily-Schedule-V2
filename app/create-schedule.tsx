// app/create-schedule.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';

import { Stack, router } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';

import { persistFinish } from '@/hooks/persist-finish';
import useSchedule from '@/hooks/schedule-adapter';
import {
  useSchedule as baseSchedule,
  type ScheduleSnapshot,
  type OutingGroup,
} from '@/hooks/schedule-store';
import { STAFF, PARTICIPANTS } from '@/constants/data';
import { saveScheduleToSupabase } from '@/lib/saveSchedule';

type ID = string;
const EDIT_HUB = '/edit';

const nm = (x?: string) => (x || '').trim().toLowerCase();
const isEveryone = (name?: string) => nm(name) === 'everyone';
const isAntoinette = (name?: string) => nm(name) === 'antoinette';

const STAFF_BY_ID: Record<ID, (typeof STAFF)[number]> = {};
STAFF.forEach((s) => (STAFF_BY_ID[s.id] = s));

const PARTS_BY_ID: Record<ID, (typeof PARTICIPANTS)[number]> = {};
PARTICIPANTS.forEach((p) => (PARTS_BY_ID[p.id] = p));

const EVERYONE = STAFF.find((s) => isEveryone(s.name));
const EVERYONE_ID = EVERYONE?.id ?? '';

const TOTAL = 4;

type AssignmentRow = {
  staffId: ID;
  participantIds: ID[];
};

type DropoffRow = {
  staffId: ID; // helper or Everyone
  participantIds: ID[]; // subset of attending
  locationId: number;
};

// ---------- Utility helpers -----------

const toRowsFromMap = (map: Record<ID, ID[]>): AssignmentRow[] =>
  Object.entries(map || {}).map(([staffId, participantIds]) => ({
    staffId,
    participantIds: participantIds || [],
  }));

const toMapFromRows = (rows: AssignmentRow[]): Record<ID, ID[]> => {
  const out: Record<ID, ID[]> = {};
  (rows || []).forEach((r) => {
    if (!r.staffId) return;
    out[r.staffId] = r.participantIds || [];
  });
  return out;
};

const toDropoffRowsFromMap = (
  dropoffAssignments: Record<ID, ID[]>,
  dropoffLocations: Record<ID, number>,
): DropoffRow[] => {
  const out: DropoffRow[] = [];
  Object.entries(dropoffAssignments || {}).forEach(([staffId, participantIds]) => {
    const locationId = dropoffLocations?.[staffId] ?? 1;
    out.push({
      staffId,
      participantIds: participantIds || [],
      locationId,
    });
  });
  return out;
};

const toDropoffMapsFromRows = (
  rows: DropoffRow[],
): {
  dropoffAssignments: Record<ID, ID[]>;
  dropoffLocations: Record<ID, number>;
} => {
  const dropoffAssignments: Record<ID, ID[]> = {};
  const dropoffLocations: Record<ID, number> = {};

  (rows || []).forEach((row) => {
    if (!row.staffId) return;
    dropoffAssignments[row.staffId] = row.participantIds || [];
    dropoffLocations[row.staffId] =
      typeof row.locationId === 'number' ? row.locationId : 1;
  });

  return { dropoffAssignments, dropoffLocations };
};

const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

// ------------- Component ---------------

export default function CreateScheduleScreen() {
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
    workingStaff: baseWorking = [],
    attendingParticipants: baseAttending = [],
    assignments: baseAssignments = {},
    pickupParticipants: basePickup = [],
    helperStaff: baseHelpers = [],
    dropoffAssignments: baseDropoffs = {},
    dropoffLocations: baseDropoffLocs = {},
    finalChecklistStaff: baseChecklistStaff = '',
    outingGroup: baseOutingGroup = null,
  } = hook;

  const staffSource = (staff && staff.length ? staff : STAFF) as typeof STAFF;
  const partsSource = (participants && participants.length
    ? participants
    : PARTICIPANTS) as typeof PARTICIPANTS;

  const everyone = EVERYONE;
  const everyoneId = EVERYONE_ID;

  const [step, setStep] = useState<number>(scheduleStep || 1);

  // ---- Local wizard state ----

  const [workingStaff, setWorkingStaff] = useState<string[]>(() =>
    baseWorking && baseWorking.length
      ? baseWorking
      : everyoneId
      ? [everyoneId]
      : [],
  );

  const [attendingParticipants, setAttendingParticipants] = useState<string[]>(() =>
    baseAttending && baseAttending.length ? baseAttending : [],
  );

  const [assignments, setAssignments] = useState<AssignmentRow[]>(() =>
    baseAssignments && Object.keys(baseAssignments).length
      ? toRowsFromMap(baseAssignments)
      : [],
  );

  const [pickupParticipants, setPickupParticipants] = useState<string[]>(() =>
    basePickup && basePickup.length ? basePickup : [],
  );

  const [helperStaff, setHelperStaff] = useState<string[]>(() =>
    baseHelpers && baseHelpers.length ? baseHelpers : [],
  );

  const [dropoffRows, setDropoffRows] = useState<DropoffRow[]>(() =>
    Object.keys(baseDropoffs || {}).length
      ? toDropoffRowsFromMap(baseDropoffs, baseDropoffLocs || {})
      : [],
  );

  const [finalChecklistStaff, setFinalChecklistStaff] = useState<string>(
    baseChecklistStaff || '',
  );

  // ⭐ Outing group – hydrate from base store if present
  const [outingGroup, setOutingGroup] = useState<OutingGroup | null>(() => {
    try {
      return (baseOutingGroup as OutingGroup) ?? null;
    } catch {
      return null;
    }
  });

  // keep adapter step in sync
  useEffect(() => {
    try {
      setScheduleStep?.(step);
    } catch {}
  }, [step, setScheduleStep]);

  // ---- Derived helpers ----

  const staffById = useMemo(() => {
    const map: Record<string, (typeof STAFF)[number]> = {};
    (staffSource || []).forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [staffSource]);

  const partsById = useMemo(() => {
    const map: Record<string, (typeof PARTICIPANTS)[number]> = {};
    (partsSource || []).forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [partsSource]);

  const selectedStaff = useMemo(
    () =>
      (workingStaff || [])
        .map((id) => staffById[id] || STAFF_BY_ID[id])
        .filter(Boolean),
    [workingStaff, staffById],
  );

  const selectedParticipants = useMemo(
    () =>
      (attendingParticipants || [])
        .map((id) => partsById[id] || PARTS_BY_ID[id])
        .filter(Boolean),
    [attendingParticipants, partsById],
  );

  const pickupParticipantObjs = useMemo(
    () =>
      (pickupParticipants || [])
        .map((id) => partsById[id] || PARTS_BY_ID[id])
        .filter(Boolean),
    [pickupParticipants, partsById],
  );

  const helperStaffObjs = useMemo(
    () =>
      (helperStaff || [])
        .map((id) => staffById[id] || STAFF_BY_ID[id])
        .filter(Boolean),
    [helperStaff, staffById],
  );

  const attendingSet = useMemo(
    () => new Set(attendingParticipants || []),
    [attendingParticipants],
  );

  // ensure assignments only refer to attending participants
  useEffect(() => {
    setAssignments((rows) =>
      (rows || []).map((r) => ({
        ...r,
        participantIds: (r.participantIds || []).filter((pid) =>
          attendingSet.has(pid),
        ),
      })),
    );
  }, [attendingSet]);

  // ensure pickup participants ⊆ attending
  useEffect(() => {
    setPickupParticipants((prev) =>
      (prev || []).filter((pid) => attendingSet.has(pid)),
    );
  }, [attendingSet]);

  // ensure dropoff participants ⊆ attending
  useEffect(() => {
    setDropoffRows((rows) =>
      (rows || []).map((row) => ({
        ...row,
        participantIds: (row.participantIds || []).filter((pid) =>
          attendingSet.has(pid),
        ),
      })),
    );
  }, [attendingSet]);

  // ---- Outing helpers ----

  const ensureOuting = (): OutingGroup => {
    if (outingGroup) return outingGroup;
    const fresh: OutingGroup = {
      id: `outing-${Date.now()}`,
      name: '',
      staffIds: [],
      participantIds: [],
      startTime: '',
      endTime: '',
      notes: '',
    };
    setOutingGroup(fresh);
    return fresh;
  };

  const toggleOutingStaff = (id: string) => {
    setOutingGroup((prev) => {
      const current = prev ?? ensureOuting();
      const exists = current.staffIds.includes(id);
      return {
        ...current,
        staffIds: exists
          ? current.staffIds.filter((sid) => sid !== id)
          : [...current.staffIds, id],
      };
    });
  };

  const toggleOutingParticipant = (id: string) => {
    setOutingGroup((prev) => {
      const current = prev ?? ensureOuting();
      const exists = current.participantIds.includes(id);
      return {
        ...current,
        participantIds: exists
          ? current.participantIds.filter((pid) => pid !== id)
          : [...current.participantIds, id],
      };
    });
  };

  const updateOutingField = (field: keyof OutingGroup, value: string) => {
    setOutingGroup((prev) => {
      const current = prev ?? ensureOuting();
      return { ...current, [field]: value };
    });
  };

  // ---- Step content ----

  const Step1 = () => {
    const validStaff = staffSource.filter((s) => !isEveryone(s.name));
    const selected = new Set(workingStaff);

    const selectedTop = [
      ...(everyone && selected.has(everyone.id) ? [everyone] : []),
      ...validStaff.filter((s) => selected.has(s.id)),
    ];

    const outingStaffIds = new Set(outingGroup?.staffIds || []);
    const outingParticipantIds = new Set(outingGroup?.participantIds || []);

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Dream Team (Working @ B2)</Text>
        <Text style={styles.subTitle}>
          Select who is working @ B2 today. &quot;Everyone&quot; lets you quickly
          include the whole team, but you can still toggle individuals on or off.
        </Text>

        {/* Selected staff pills */}
        <View style={{ marginTop: 16, marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>Selected staff</Text>
          {selectedTop.length ? (
            <View style={styles.chipRow}>
              {selectedTop.map((s) => {
                const selected = workingStaff.includes(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() =>
                      setWorkingStaff((prev) =>
                        prev.includes(s.id)
                          ? prev.filter((id) => id !== s.id)
                          : [...prev, s.id],
                      )
                    }
                    style={[
                      styles.chip,
                      selected && styles.chipSelected,
                      isEveryone(s.name) && styles.chipEveryone,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        selected && styles.chipLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {s.name}
                    </Text>
                    {selected && <Check size={16} color="#175CD3" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No staff selected yet. Use the list below to add them.
            </Text>
          )}
        </View>

        {/* Full list with Everyone */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>All staff</Text>
          <View style={styles.list}>
            {everyone && (
              <TouchableOpacity
                key={everyone.id}
                onPress={() =>
                  setWorkingStaff((prev) =>
                    prev.includes(everyone.id)
                      ? prev.filter((id) => id !== everyone.id)
                      : unique([everyone.id, ...prev]),
                  )
                }
                style={[
                  styles.row,
                  workingStaff.includes(everyone.id) && styles.rowSelected,
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rect, { backgroundColor: '#FEF3C7' }]} />
                  <Text
                    style={[
                      styles.rowTxt,
                      workingStaff.includes(everyone.id) && styles.rowTxtSel,
                    ]}
                  >
                    {everyone.name}
                  </Text>
                </View>
                {workingStaff.includes(everyone.id) && (
                  <Check size={18} color="#175CD3" />
                )}
              </TouchableOpacity>
            )}

            {validStaff.map((st) => {
              const selected = workingStaff.includes(st.id);
              return (
                <TouchableOpacity
                  key={st.id}
                  onPress={() =>
                    setWorkingStaff((prev) =>
                      prev.includes(st.id)
                        ? prev.filter((id) => id !== st.id)
                        : [...prev, st.id],
                    )
                  }
                  style={[styles.row, selected && styles.rowSelected]}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.rect,
                        { backgroundColor: st.color || '#E6ECF5' },
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
                  </View>
                  {selected && <Check size={18} color="#175CD3" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ⭐ Outing group (optional) */}
        <View
          style={{
            marginTop: 24,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E5ECF5',
            backgroundColor: '#FFF',
          }}
        >
          <Text style={styles.sectionTitle}>Outing group (optional)</Text>
          <Text style={styles.subTitle}>
            Use this when some staff and participants are going out (e.g.
            swimming). They will be treated as &quot;out&quot; for
            auto-assignments until you remove them from the group.
          </Text>

          {/* Outing name */}
          <Text style={{ fontSize: 13, color: '#667085', marginBottom: 4 }}>
            Outing name
          </Text>
          <TextInput
            placeholder="e.g. Swimming @ Local Pool"
            value={outingGroup?.name ?? ''}
            onChangeText={(text) => updateOutingField('name', text)}
            style={{
              borderWidth: 1,
              borderColor: '#E5ECF5',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              fontSize: 14,
              marginBottom: 12,
              backgroundColor: '#F9FAFB',
            }}
          />

          {/* Times */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 13, color: '#667085', marginBottom: 4 }}
              >
                Leave time
              </Text>
              <TextInput
                placeholder="11:00"
                value={outingGroup?.startTime ?? ''}
                onChangeText={(text) => updateOutingField('startTime', text)}
                style={{
                  borderWidth: 1,
                  borderColor: '#E5ECF5',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 14,
                  backgroundColor: '#F9FAFB',
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 13, color: '#667085', marginBottom: 4 }}
              >
                Return time
              </Text>
              <TextInput
                placeholder="15:00"
                value={outingGroup?.endTime ?? ''}
                onChangeText={(text) => updateOutingField('endTime', text)}
                style={{
                  borderWidth: 1,
                  borderColor: '#E5ECF5',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 14,
                  backgroundColor: '#F9FAFB',
                }}
              />
            </View>
          </View>

          {/* Staff going on outing */}
          <Text style={{ fontSize: 13, color: '#667085', marginBottom: 4 }}>
            Staff on outing
          </Text>
          <View style={styles.chipGrid}>
            {validStaff.map((st) => {
              const sel = outingStaffIds.has(st.id);
              return (
                <TouchableOpacity
                  key={st.id}
                  onPress={() => toggleOutingStaff(st.id)}
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

          {/* Participants going on outing */}
          <Text
            style={{
              fontSize: 13,
              color: '#667085',
              marginBottom: 4,
              marginTop: 16,
            }}
          >
            Participants on outing
          </Text>
          <View style={styles.chipGrid}>
            {partsSource
              .filter((p) => attendingParticipants.includes(p.id))
              .map((p) => {
                const sel = outingParticipantIds.has(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => toggleOutingParticipant(p.id)}
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
      </View>
    );
  };

  const Step2 = () => {
    const selected = selectedParticipants;

    const assignableStaff = selectedStaff.filter(
      (st) => !isEveryone(st.name) && !isAntoinette(st.name),
    );

    const rows = assignments;

    const handleAssign = (participantId: ID, staffId: ID) => {
      setAssignments((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((r) => r.staffId === staffId);
        const allIds = new Set(copy.flatMap((r) => r.participantIds || []));
        allIds.delete(participantId);

        if (idx === -1) {
          copy.push({
            staffId,
            participantIds: [participantId],
          });
        } else {
          const row = copy[idx];
          const set = new Set(row.participantIds || []);
          set.add(participantId);
          row.participantIds = Array.from(set);
        }

        const everyoneIndex = copy.findIndex(
          (r) => isEveryone(STAFF_BY_ID[r.staffId]?.name),
        );
        if (everyoneIndex !== -1) {
          const everyoneRow = copy[everyoneIndex];
          everyoneRow.participantIds = (everyoneRow.participantIds || []).filter(
            (pid) => pid !== participantId,
          );
        }

        return copy.map((row) => ({
          ...row,
          participantIds: (row.participantIds || []).filter((pid) =>
            allIds.has(pid) || row.staffId === staffId,
          ),
        }));
      });
      touch?.();
    };

    const handleClear = (participantId: ID) => {
      setAssignments((prev) =>
        (prev || []).map((row) => ({
          ...row,
          participantIds: (row.participantIds || []).filter(
            (pid) => pid !== participantId,
          ),
        })),
      );
      touch?.();
    };

    const staffForParticipant = (participantId: ID) => {
      const row = (assignments || []).find((r) =>
        (r.participantIds || []).includes(participantId),
      );
      return row ? row.staffId : null;
    };

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Participant Assignments</Text>
        <Text style={styles.subTitle}>
          Assign each attending participant to one staff member. Participants
          can be moved between staff as needed.
        </Text>

        <ScrollView
          style={{ marginTop: 16 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {selected.length === 0 ? (
            <Text style={styles.emptyText}>
              No participants selected. Go back to step 1 and add them first.
            </Text>
          ) : (
            selected.map((p) => {
              const assignedStaffId = staffForParticipant(p.id);
              const staffLabel = assignedStaffId
                ? staffById[assignedStaffId]?.name || 'Unknown'
                : 'Not assigned';

              return (
                <View key={p.id} style={styles.assignmentRow}>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.assignmentName}>{p.name}</Text>
                  </View>
                  <View style={{ flex: 2 }}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {assignableStaff.map((st) => {
                        const active = st.id === assignedStaffId;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            onPress={() => handleAssign(p.id, st.id)}
                            style={[
                              styles.assignChip,
                              active && styles.assignChipActive,
                            ]}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[
                                styles.assignChipLabel,
                                active && styles.assignChipLabelActive,
                              ]}
                            >
                              {st.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <View style={{ marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleClear(p.id)}
                        style={styles.clearLinkWrapper}
                      >
                        <Text style={styles.clearLinkText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={styles.currentAssigneeLabel}>Assigned to</Text>
                    <Text style={styles.currentAssigneeValue}>
                      {staffLabel}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  };

  const Step3 = () => {
    const selected = selectedParticipants;

    const handleTogglePickup = (id: ID) => {
      setPickupParticipants((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      touch?.();
    };

    const handleToggleHelper = (id: ID) => {
      setHelperStaff((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      touch?.();
    };

    const allRows = dropoffRows;
    const ensureRowForStaff = (staffId: ID): DropoffRow => {
      const existing = allRows.find((r) => r.staffId === staffId);
      if (existing) return existing;
      const row: DropoffRow = {
        staffId,
        participantIds: [],
        locationId: 1,
      };
      allRows.push(row);
      return row;
    };

    const handleDropoffToggle = (staffId: ID, participantId: ID) => {
      setDropoffRows((prev) => {
        const rowsCopy = [...prev];
        const rowIndex = rowsCopy.findIndex((r) => r.staffId === staffId);
        const row =
          rowIndex !== -1
            ? rowsCopy[rowIndex]
            : {
                staffId,
                participantIds: [],
                locationId: 1,
              };

        const set = new Set(row.participantIds || []);
        if (set.has(participantId)) {
          set.delete(participantId);
        } else {
          set.add(participantId);
        }

        const allRows = [...rowsCopy];
        if (rowIndex === -1) {
          allRows.push({
            ...row,
            participantIds: Array.from(set),
          });
        } else {
          allRows[rowIndex] = {
            ...row,
            participantIds: Array.from(set),
          };
        }

        return allRows;
      });
      touch?.();
    };

    const handleLocationChange = (staffId: ID, locationId: number) => {
      setDropoffRows((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((r) => r.staffId === staffId);
        if (idx === -1) {
          copy.push({
            staffId,
            participantIds: [],
            locationId,
          });
        } else {
          copy[idx] = {
            ...copy[idx],
            locationId,
          };
        }
        return copy;
      });
      touch?.();
    };

    const helperRows: DropoffRow[] = useMemo(() => {
      const helperSet = new Set(helperStaff || []);
      return (dropoffRows || []).filter((row) => helperSet.has(row.staffId));
    }, [dropoffRows, helperStaff]);

    const participantsByHelper: Record<ID, ID[]> = useMemo(() => {
      const out: Record<ID, ID[]> = {};
      (helperRows || []).forEach((row) => {
        out[row.staffId] = row.participantIds || [];
      });
      return out;
    }, [helperRows]);

    const locationByHelper: Record<ID, number> = useMemo(() => {
      const out: Record<ID, number> = {};
      (helperRows || []).forEach((row) => {
        out[row.staffId] = row.locationId ?? 1;
      });
      return out;
    }, [helperRows]);

    const allStaff = selectedStaff;
    const helpersOnly = allStaff.filter((st) => helperStaff.includes(st.id));

    const dropoffLocations = [
      { id: 1, name: 'Belmore' },
      { id: 2, name: 'Bankstown' },
      { id: 3, name: 'Other / Mixed' },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Pickups & Dropoffs</Text>
        <Text style={styles.subTitle}>
          Confirm who needs pickup in the morning, who will help with dropoffs,
          and which participants each helper is responsible for.
        </Text>

        <ScrollView
          style={{ marginTop: 16 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Pickup participants */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pickup participants (morning)</Text>
            <Text style={styles.cardSub}>
              Tick participants who require pickup in the morning.
            </Text>
            <View style={styles.chipGrid}>
              {selected.length === 0 ? (
                <Text style={styles.emptyText}>
                  No participants selected. Go back to step 1 and add them
                  first.
                </Text>
              ) : (
                selected.map((p) => {
                  const active = pickupParticipants.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => handleTogglePickup(p.id)}
                      style={[
                        styles.chip,
                        active && styles.chipSelectedStrong,
                      ]}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          active && styles.chipLabelSelectedStrong,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          {/* Helper staff */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Helpers for dropoffs</Text>
            <Text style={styles.cardSub}>
              Select staff who will help with afternoon dropoffs.
            </Text>
            <View style={styles.chipGrid}>
              {allStaff.length === 0 ? (
                <Text style={styles.emptyText}>
                  No staff selected. Go back to step 1 and add them first.
                </Text>
              ) : (
                allStaff.map((st) => {
                  const active = helperStaff.includes(st.id);
                  return (
                    <TouchableOpacity
                      key={st.id}
                      onPress={() => handleToggleHelper(st.id)}
                      style={[
                        styles.chip,
                        active && styles.chipSelectedStrong,
                      ]}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          active && styles.chipLabelSelectedStrong,
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

          {/* Dropoff assignments per helper */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dropoff details</Text>
            <Text style={styles.cardSub}>
              For each helper, choose which participants they are dropping off
              and which location applies.
            </Text>

            {helpersOnly.length === 0 ? (
              <Text style={styles.emptyText}>
                No helpers selected yet. Choose at least one helper above to
                assign dropoffs.
              </Text>
            ) : (
              helpersOnly.map((st) => {
                const assignedParticipants =
                  participantsByHelper[st.id] || [];
                const locationId = locationByHelper[st.id] ?? 1;
                const collapsed =
                  (dropoffRows.find((r) => r.staffId === st.id)?.locationId ??
                    1) === -999;

                return (
                  <View key={st.id} style={styles.dropRow}>
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.dropHelperName}>{st.name}</Text>
                    </View>

                    <View style={styles.dropLocationRow}>
                      <Text style={styles.dropLocationLabel}>
                        Dropoff location:
                      </Text>
                      <View style={styles.dropLocationChips}>
                        {dropoffLocations.map((loc) => {
                          const active = loc.id === locationId;
                          return (
                            <TouchableOpacity
                              key={loc.id}
                              onPress={() =>
                                handleLocationChange(st.id, loc.id)
                              }
                              style={[
                                styles.locChip,
                                active && styles.locChipActive,
                              ]}
                              activeOpacity={0.85}
                            >
                              <Text
                                style={[
                                  styles.locChipLabel,
                                  active && styles.locChipLabelActive,
                                ]}
                              >
                                {loc.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ marginTop: 6 }}>
                      <Text style={styles.dropParticipantsLabel}>
                        Participants:
                      </Text>
                      <View style={styles.chipGrid}>
                        {selected.map((p) => {
                          const active = assignedParticipants.includes(p.id);
                          return (
                            <TouchableOpacity
                              key={p.id}
                              onPress={() =>
                                handleDropoffToggle(st.id, p.id)
                              }
                              style={[
                                styles.chip,
                                active && styles.chipSelected,
                              ]}
                              activeOpacity={0.85}
                            >
                              <Text
                                style={[
                                  styles.chipLabel,
                                  active && styles.chipLabelSelected,
                                ]}
                                numberOfLines={1}
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
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const Step4 = () => {
    const realWorkers = selectedStaff.filter((st) => !isEveryone(st.name));
    const responsibleStaff = finalChecklistStaff
      ? staffById[finalChecklistStaff] || STAFF_BY_ID[finalChecklistStaff]
      : null;

    const handleSelect = (id: ID) => {
      setFinalChecklistStaff(id);
      touch?.();
    };

    return (
      <View style={styles.section}>
        <Text style={styles.title}>Final Checklist</Text>
        <Text style={styles.subTitle}>
          Choose one working staff member to be responsible for the end-of-shift
          checklist.
        </Text>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Responsible staff</Text>
          {realWorkers.length === 0 ? (
            <Text style={styles.emptyText}>
              No working staff selected. Go back to step 1 and add them first.
            </Text>
          ) : (
            <View style={styles.chipGrid}>
              {realWorkers.map((st) => {
                const active = st.id === finalChecklistStaff;
                return (
                  <TouchableOpacity
                    key={st.id}
                    onPress={() => handleSelect(st.id)}
                    style={[
                      styles.chip,
                      active && styles.chipSelectedStrong,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        active && styles.chipLabelSelectedStrong,
                      ]}
                    >
                      {st.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {responsibleStaff && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Checklist owner</Text>
            <Text style={styles.infoBody}>
              {responsibleStaff.name} will complete the end-of-shift checklist
              in the Daily Schedule app and confirm all tasks are done.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1 />;
      case 2:
        return <Step2 />;
      case 3:
        return <Step3 />;
      case 4:
      default:
        return <Step4 />;
    }
  };

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

    const realWorkers = workingStaff.filter((id) => {
      const st = staffSource.find((s) => s.id === id);
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
    const attendingSet2 = new Set(attendingParticipants || []);
    const assignmentsMap: Record<ID, ID[]> = {};

    (assignments || []).forEach((row) => {
      const sid = row.staffId as ID;
      if (!sid) return;
      const cleaned = (row.participantIds || []).filter((pid) =>
        attendingSet2.has(pid),
      );
      assignmentsMap[sid] = cleaned;
    });

    // 🔥 pull recent cleaning snapshots from the base schedule store
    let recentCleaningSnapshots: ScheduleSnapshot[] = [];
    try {
      const state = baseSchedule.getState();
      recentCleaningSnapshots = state.recentCleaningSnapshots || [];
    } catch (err) {
      console.warn(
        '[create-schedule] unable to read recentCleaningSnapshots from store, continuing without history:',
        err,
      );
    }

    // ⭐ Sync outingGroup into the base schedule store before finish
    try {
      const state = baseSchedule.getState();
      if (outingGroup && typeof state.updateSchedule === 'function') {
        state.updateSchedule({ outingGroup });
      } else if (!outingGroup && typeof state.updateSchedule === 'function') {
        // explicitly clear it if no outing for today
        state.updateSchedule({ outingGroup: null } as any);
      }
    } catch (err) {
      console.warn(
        '[create-schedule] failed to sync outingGroup into base store:',
        err,
      );
    }

    // First, let persistFinish compute all derived slices (floating, cleaning, etc.)
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
        dropoffAssignments: toDropoffMapsFromRows(dropoffRows)
          .dropoffAssignments,
        date: selectedDate,
        // pass history into fairness engine
        recentSnapshots: recentCleaningSnapshots,
      });
    } catch (e) {
      console.warn('persistFinish error, continuing anyway:', e);
    }

    // After persistFinish, grab the canonical snapshot from the base schedule store
    let snapshot: ScheduleSnapshot;

    try {
      const state = baseSchedule.getState();

      snapshot = {
        staff: state.staff ?? (staffSource ?? []),
        participants: state.participants ?? (partsSource ?? []),

        workingStaff: state.workingStaff ?? realWorkers,
        attendingParticipants:
          state.attendingParticipants ?? attendingParticipants,

        // Outing group from store, falling back to local if needed
        outingGroup: (state as any).outingGroup ?? outingGroup ?? null,

        assignments: state.assignments ?? assignmentsMap,
        floatingAssignments: state.floatingAssignments ?? {},
        cleaningAssignments: state.cleaningAssignments ?? {},

        finalChecklist: state.finalChecklist ?? {},
        finalChecklistStaff:
          state.finalChecklistStaff ?? finalChecklistStaff,

        pickupParticipants: state.pickupParticipants ?? pickupParticipants,
        helperStaff: state.helperStaff ?? helperStaff,
        dropoffAssignments: state.dropoffAssignments ?? toDropoffMapsFromRows(dropoffRows).dropoffAssignments,
        dropoffLocations:
          state.dropoffLocations ??
          toDropoffMapsFromRows(dropoffRows).dropoffLocations,

        date: state.date ?? selectedDate,
        meta: {
          ...(state.meta || {}),
          from: (state.meta && state.meta.from) || 'create-wizard',
        },
      };
    } catch (err) {
      console.warn(
        '[create-schedule] failed to read snapshot from store, falling back:',
        err,
      );

      // Fallback: minimal snapshot (won't be as rich but avoids total failure)
      const maps = toDropoffMapsFromRows(dropoffRows);

      snapshot = {
        staff: staffSource ?? [],
        participants: partsSource ?? [],
        workingStaff: realWorkers,
        attendingParticipants,
        outingGroup: outingGroup ?? null,
        assignments: assignmentsMap,
        floatingAssignments: {},
        cleaningAssignments: {},
        finalChecklist: {},
        finalChecklistStaff,
        pickupParticipants,
        helperStaff,
        dropoffAssignments: maps.dropoffAssignments,
        dropoffLocations: maps.dropoffLocations,
        date: selectedDate,
        meta: { from: 'create-wizard' },
      };
    }

    // Save to Supabase
    try {
      const result = await saveScheduleToSupabase('B2', snapshot);

      if (!result.ok) {
        console.warn('Supabase save error:', result.error);
      } else {
        console.log('Supabase schedule saved with code:', result.code);
      }

      // Persist the share code into the store so Share screen can use it
      if (result && result.code) {
        try {
          const state = baseSchedule.getState();
          const currentMeta = (state.meta || {}) as Record<string, any>;
          if (typeof state.updateSchedule === 'function') {
            state.updateSchedule({
              meta: {
                ...currentMeta,
                shareCode: result.code,
              },
            } as any);
          }
        } catch (err) {
          console.warn(
            '[create-schedule] failed to store shareCode in meta:',
            err,
          );
        }

        // Also persist to localStorage on web so Share screen can always recover it
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(
              'nc_share_code',
              String(result.code),
            );
            // Store the full snapshot as well for same-device import fallback
            window.localStorage.setItem(
              'nc_schedule_' + String(result.code),
              JSON.stringify(snapshot),
            );
          }
        } catch (err) {
          console.warn(
            '[create-schedule] failed to store shareCode/snapshot in localStorage:',
            err,
          );
        }
      }
    } catch (e) {
      console.warn('Supabase insert failed:', e);
    }

    // Continue as normal
    try {
      router.replace(EDIT_HUB);
    } catch {}
  };

  const onNext = () => (step < TOTAL ? setStep(step + 1) : onComplete());
  const onBack = () => setStep(step > 1 ? step - 1 : 1);

  // ---- UI --------

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerTitle: 'Create Schedule',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                try {
                  router.back();
                } catch {}
              }}
              style={styles.headerBack}
            >
              <ChevronLeft size={20} color="#111827" />
              <Text style={styles.headerBackLabel}>Back</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Create Daily Schedule{selectedDate ? ` — ${selectedDate}` : ''}
        </Text>
        <Text style={styles.headerSubtitle}>
          Work through each step to set the Dream Team, participants, pickups,
          and responsibilities for the day.
        </Text>
      </View>

      <View style={styles.stepperWrap}>
        <View style={styles.stepperRow}>
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map((num) => {
            const active = num === step;
            const complete = num < step;
            return (
              <View key={num} style={styles.stepWrapper}>
                <View
                  style={[
                    styles.stepCircle,
                    complete && styles.stepCircleComplete,
                    active && styles.stepCircleActive,
                  ]}
                >
                  {complete ? (
                    <Check size={16} color="#FFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        active && styles.stepNumberActive,
                      ]}
                    >
                      {num}
                    </Text>
                  )}
                </View>
                <View style={styles.stepBarContainer}>
                  {num < TOTAL && (
                    <View
                      style={[
                        styles.stepBar,
                        step > num && styles.stepBarActive,
                      ]}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.stepLabels}>
          <Text
            style={[
              styles.stepLabel,
              step === 1 && styles.stepLabelActive,
            ]}
          >
            Dream Team
          </Text>
          <Text
            style={[
              styles.stepLabel,
              step === 2 && styles.stepLabelActive,
            ]}
          >
            Assignments
          </Text>
          <Text
            style={[
              styles.stepLabel,
              step === 3 && styles.stepLabelActive,
            ]}
          >
            Pickups & Dropoffs
          </Text>
          <Text
            style={[
              styles.stepLabel,
              step === 4 && styles.stepLabelActive,
            ]}
          >
            Checklist
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.navBtn, styles.backBtn]}
          activeOpacity={0.9}
        >
          <Text style={styles.backTxt}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          style={[styles.navBtn, styles.nextBtn]}
          activeOpacity={0.9}
        >
          <Text style={styles.nextTxt}>
            {step < TOTAL ? 'Next step' : 'Finish & Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBackLabel: {
    marginLeft: 4,
    fontSize: 14,
    color: '#111827',
  },
  stepperWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  stepCircleActive: {
    borderColor: '#175CD3',
    backgroundColor: '#EFF6FF',
  },
  stepCircleComplete: {
    borderColor: '#175CD3',
    backgroundColor: '#175CD3',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#1D4ED8',
  },
  stepBarContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  stepBar: {
    height: 3,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  stepBarActive: {
    backgroundColor: '#175CD3',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subTitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  chipSelected: {
    borderColor: '#175CD3',
    backgroundColor: '#EFF6FF',
  },
  chipSelectedStrong: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  chipEveryone: {
    borderColor: '#FBBF24',
    backgroundColor: '#FFFBEB',
  },
  chipLabel: {
    fontSize: 13,
    color: '#374151',
  },
  chipLabelSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  chipLabelSelectedStrong: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  list: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  rowSelected: {
    backgroundColor: '#F3F4FF',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowTxt: {
    fontSize: 14,
    color: '#111827',
  },
  rowTxtSel: {
    fontWeight: '600',
    color: '#111827',
  },
  rect: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  assignmentName: {
    fontSize: 14,
    color: '#111827',
  },
  assignChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 6,
    backgroundColor: '#FFF',
  },
  assignChipActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  assignChipLabel: {
    fontSize: 13,
    color: '#374151',
  },
  assignChipLabelActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  clearLinkWrapper: {
    alignSelf: 'flex-start',
  },
  clearLinkText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  currentAssigneeLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  currentAssigneeValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  dropRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  dropHelperName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dropLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dropLocationLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 6,
  },
  dropLocationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  locChip: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  locChipActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFEDD5',
  },
  locChipLabel: {
    fontSize: 12,
    color: '#374151',
  },
  locChipLabelActive: {
    color: '#C2410C',
    fontWeight: '600',
  },
  dropParticipantsLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 4,
  },
  chipTile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipTileSel: {
    borderColor: '#175CD3',
    backgroundColor: '#EFF6FF',
  },
  chipLabelSel: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  infoBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  infoBody: {
    marginTop: 4,
    fontSize: 13,
    color: '#1E293B',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  navBtn: {
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
    marginRight: 8,
  },
  backTxt: { fontSize: 14, color: '#344054', fontWeight: '600' },
  nextBtn: { backgroundColor: '#175CD3', marginLeft: 8 },
  nextTxt: { fontSize: 14, color: '#FFF', fontWeight: '600' },
});
