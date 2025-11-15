// app/edit/pickups-dropoffs.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';

type ID = string;

const MAX_WIDTH = 880;

const isEveryone = (name?: string | null) =>
  (name || '').trim().toLowerCase() === 'everyone';

export default function EditPickupsDropoffsScreen() {
  const {
    staff,
    participants,
    workingStaff,
    attendingParticipants,
    pickupParticipants,
    helperStaff,
    dropoffAssignments,
    updateSchedule,
  } = useSchedule();

  const [activeStaffId, setActiveStaffId] = useState<ID | null>(null);
  const [hideEmptyStaff, setHideEmptyStaff] = useState<boolean>(true);

  const staffById = useMemo(
    () => new Map(staff.map((s) => [s.id as ID, s])),
    [staff]
  );

  const attending = useMemo(
    () =>
      participants
        .filter((p) => attendingParticipants.includes(p.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [participants, attendingParticipants]
  );

  const pickupsSet = useMemo(
    () => new Set(pickupParticipants || []),
    [pickupParticipants]
  );

  const workingSet = useMemo(
    () => new Set(workingStaff || [] as ID[]),
    [workingStaff]
  );

  // Staff actually working at B2, excluding "Everyone"
  const workingStaffList = useMemo(
    () =>
      staff
        .filter((s) => workingSet.has(s.id as ID) && !isEveryone(s.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, workingSet]
  );

  // Helper pool (not working at B2, excluding "Everyone")
  const helperPool = useMemo(
    () =>
      staff
        .filter((s) => !workingSet.has(s.id as ID) && !isEveryone(s.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, workingSet]
  );

  const assignments = dropoffAssignments || {};

  // Participants available for dropoffs: attending but not pickups
  const visibleDropoffParticipants = useMemo(
    () =>
      attending.filter(
        (p) => !pickupsSet.has(p.id) // pickups don't appear here
      ),
    [attending, pickupsSet]
  );

  // Build pid -> staffId lookup
  const participantAssignedTo = useMemo(() => {
    const map = new Map<ID, ID>();
    Object.entries(assignments).forEach(([sid, pids]) => {
      (pids || []).forEach((pid) => map.set(pid as ID, sid as ID));
    });
    return map;
  }, [assignments]);

  // Filter staff list if we hide staff with no dropoffs
  const staffWithDropoffs = useMemo(
    () =>
      workingStaffList.filter((s) => {
        if (!hideEmptyStaff) return true;
        const list = assignments[s.id as ID];
        return Array.isArray(list) && list.length > 0;
      }),
    [workingStaffList, assignments, hideEmptyStaff]
  );

  // Keep active staff valid
  useEffect(() => {
    const baseList = hideEmptyStaff ? staffWithDropoffs : workingStaffList;
    if (!activeStaffId && baseList[0]) {
      setActiveStaffId(baseList[0].id as ID);
    } else if (
      activeStaffId &&
      !baseList.some((s) => s.id === activeStaffId)
    ) {
      setActiveStaffId(baseList[0]?.id ?? null);
    }
  }, [workingStaffList, staffWithDropoffs, hideEmptyStaff, activeStaffId]);

  const currentStaff =
    activeStaffId && staffById.get(activeStaffId as ID)
      ? staffById.get(activeStaffId as ID)
      : undefined;

  const assignedToCurrent = useMemo(
    () =>
      activeStaffId
        ? visibleDropoffParticipants.filter(
            (p) => participantAssignedTo.get(p.id as ID) === activeStaffId
          )
        : [],
    [visibleDropoffParticipants, participantAssignedTo, activeStaffId]
  );

  const unassignedForCurrent = useMemo(
    () =>
      activeStaffId
        ? visibleDropoffParticipants.filter(
            (p) => !participantAssignedTo.has(p.id as ID)
          )
        : [],
    [visibleDropoffParticipants, participantAssignedTo, activeStaffId]
  );

  const togglePickup = (pid: ID) => {
    const current = new Set(pickupParticipants || []);
    if (current.has(pid)) current.delete(pid);
    else current.add(pid);
    updateSchedule({ pickupParticipants: Array.from(current) });
  };

  const toggleHelper = (sid: ID) => {
    const current = new Set(helperStaff || []);
    if (current.has(sid)) current.delete(sid);
    else current.add(sid);
    updateSchedule({ helperStaff: Array.from(current) });
  };

  const toggleDropoff = (pid: ID) => {
    if (!activeStaffId) return;

    const current = { ...(dropoffAssignments || {}) } as Record<
      ID,
      ID[]
    >;

    let previouslyAssignedTo: ID | null = null;

    Object.entries(current).forEach(([sid, pids]) => {
      if (!Array.isArray(pids)) return;
      if (pids.includes(pid)) {
        previouslyAssignedTo = sid as ID;
        current[sid as ID] = pids.filter((x) => x !== pid);
        if (!current[sid as ID].length) delete current[sid as ID];
      }
    });

    if (previouslyAssignedTo === activeStaffId) {
      updateSchedule({ dropoffAssignments: current });
      return;
    }

    const existing = current[activeStaffId] || [];
    current[activeStaffId] = [...existing, pid];
    updateSchedule({ dropoffAssignments: current });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Pickups &amp; Dropoffs</Text>
          <Text style={styles.subtitle}>
            Review and adjust today's pickups, helpers and dropoff assignments.
            Participants in pickups are not shown in the dropoff lists, and each
            participant can only be assigned to one staff member.
          </Text>

          {/* PICKUPS */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Pickups</Text>
            <Text style={styles.sectionSub}>
              Select participants being picked up by external transport.
            </Text>
            <View style={styles.chipRow}>
              {visibleDropoffParticipants.map((p) => {
                const selected = pickupsSet.has(p.id as ID);
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => togglePickup(p.id as ID)}
                    activeOpacity={0.85}
                    style={[styles.chip, selected && styles.chipSel]}
                  >
                    <Text
                      style={[
                        styles.chipTxt,
                        selected && styles.chipTxtSel,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* HELPERS */}
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Helpers (optional)</Text>
            <Text style={styles.sectionSub}>
              Select staff who will assist with pickups and dropoffs. Only team
              members not working at B2 are shown here.
            </Text>
            <View style={styles.chipRow}>
              {helperPool.map((s) => {
                const selected = (helperStaff || []).includes(s.id as ID);
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => toggleHelper(s.id as ID)}
                    activeOpacity={0.85}
                    style={[styles.chip, selected && styles.chipSel]}
                  >
                    <Text
                      style={[
                        styles.chipTxt,
                        selected && styles.chipTxtSel,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* DROPOFFS */}
          <View style={{ marginTop: 24 }}>
            <View style={styles.dropoffsHeaderRow}>
              <Text style={styles.sectionTitle}>Dropoffs</Text>
              <TouchableOpacity
                onPress={() => setHideEmptyStaff((v) => !v)}
                activeOpacity={0.85}
              >
                <Text style={styles.hideToggle}>
                  {hideEmptyStaff
                    ? 'Show staff with no dropoffs'
                    : 'Hide staff with no dropoffs'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSub}>
              Choose a staff member, then tap participants to assign or unassign
              their dropoffs. Each participant can only be assigned to one staff
              member at a time.
            </Text>

            {/* Staff selector */}
            <View style={styles.chipRow}>
              { (hideEmptyStaff ? staffWithDropoffs : workingStaffList).map((s) => {
                const selected = s.id === activeStaffId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setActiveStaffId(s.id as ID)}
                    activeOpacity={0.85}
                    style={[styles.chip, selected && styles.chipSel]}
                  >
                    <Text
                      style={[
                        styles.chipTxt,
                        selected && styles.chipTxtSel,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {currentStaff && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.assignedSummary}>
                  Assigned to {currentStaff.name}
                </Text>
                {assignedToCurrent.length === 0 && (
                  <Text style={styles.emptyHint}>
                    No dropoff assignments yet. Tap a participant below to
                    assign.
                  </Text>
                )}
                {assignedToCurrent.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.row}
                    onPress={() => toggleDropoff(p.id as ID)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.rowTxt}>{p.name}</Text>
                    <Text style={styles.rowTxtAction}>Tap to unassign</Text>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.assignedSummary, { marginTop: 16 }]}>
                  Not assigned to {currentStaff.name}
                </Text>
                {unassignedForCurrent.length === 0 && (
                  <Text style={styles.emptyHint}>
                    No unassigned participants remaining for dropoffs.
                  </Text>
                )}
                {unassignedForCurrent.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.row}
                    onPress={() => toggleDropoff(p.id as ID)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.rowTxt}>{p.name}</Text>
                    <Text style={styles.rowTxtAction}>Tap to assign</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF7FB',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3C234C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B5B7A',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C234C',
  },
  sectionSub: {
    fontSize: 12,
    color: '#7B688C',
    marginTop: 4,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E0D0F0',
    backgroundColor: '#FFFFFF',
  },
  chipSel: {
    backgroundColor: '#175CD3',
    borderColor: '#175CD3',
  },
  chipTxt: {
    fontSize: 13,
    color: '#3C234C',
  },
  chipTxtSel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dropoffsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  hideToggle: {
    fontSize: 12,
    color: '#175CD3',
    fontWeight: '600',
  },
  assignedSummary: {
    fontSize: 12,
    color: '#7B688C',
  },
  emptyHint: {
    fontSize: 12,
    color: '#9B8DA9',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0D0F0',
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  rowTxt: {
    flex: 1,
    fontSize: 13,
    color: '#3C234C',
  },
  rowTxtAction: {
    fontSize: 11,
    color: '#175CD3',
    fontWeight: '600',
  },
});
