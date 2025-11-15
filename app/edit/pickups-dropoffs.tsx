// app/edit/pickups-dropoffs.tsx
import React, { useMemo, useState } from 'react';
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

  const [hideEmptyStaff, setHideEmptyStaff] = useState(true);

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
    () => new Set(workingStaff || []),
    [workingStaff]
  );

  // Staff actually working @ B2, excluding "Everyone"
  const workingStaffList = useMemo(
    () =>
      staff
        .filter((s) => workingSet.has(s.id) && !isEveryone(s.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, workingSet]
  );

  // Helpers = staff not working @ B2, excluding "Everyone"
  const helperPool = useMemo(
    () =>
      staff
        .filter((s) => !workingSet.has(s.id) && !isEveryone(s.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, workingSet]
  );

  const assignments = (dropoffAssignments || {}) as Record<ID, ID[]>;

  // Participants that can take dropoffs
  const visibleDropoffParticipants = useMemo(
    () =>
      attending.filter(
        (p) => !pickupsSet.has(p.id as ID) // pickups not shown in dropoffs
      ),
    [attending, pickupsSet]
  );

  // pid -> staffId lookup
  const participantAssignedTo = useMemo(() => {
    const map = new Map<ID, ID>();
    Object.entries(assignments).forEach(([sid, pids]) => {
      (pids || []).forEach((pid) => map.set(pid as ID, sid as ID));
    });
    return map;
  }, [assignments]);

  // Hide staff cards with no dropoffs if requested
  const staffForCards = useMemo(
    () =>
      hideEmptyStaff
        ? workingStaffList.filter((s) => {
            const list = assignments[s.id as ID];
            return Array.isArray(list) && list.length > 0;
          })
        : workingStaffList,
    [workingStaffList, assignments, hideEmptyStaff]
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

  const toggleDropoff = (sid: ID, pid: ID) => {
    const current = { ...(dropoffAssignments || {}) } as Record<ID, ID[]>;

    let previousOwner: ID | null = null;

    Object.entries(current).forEach(([staffId, pids]) => {
      if (!Array.isArray(pids)) return;
      if (pids.includes(pid)) {
        previousOwner = staffId as ID;
        current[staffId as ID] = pids.filter((x) => x !== pid);
        if (!current[staffId as ID].length) delete current[staffId as ID];
      }
    });

    // Already owned by this staff -> toggle off
    if (previousOwner === sid) {
      updateSchedule({ dropoffAssignments: current });
      return;
    }

    const list = current[sid] || [];
    current[sid] = [...list, pid];
    updateSchedule({ dropoffAssignments: current });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Pickups &amp; Dropoffs</Text>
          <Text style={styles.subtitle}>
            Review and adjust today&apos;s pickups, helpers and dropoff
            assignments. Participants in pickups are not shown in the dropoff
            lists, and each participant can only be assigned to one staff member.
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

          {/* DROPOFFS – cards per staff, like Team Daily Assignments */}
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
              Tap participants inside each staff card to assign or move
              dropoffs. Each participant can only belong to one staff member at a
              time.
            </Text>

            {staffForCards.map((s) => {
              const assigned = visibleDropoffParticipants.filter(
                (p) => participantAssignedTo.get(p.id as ID) === s.id
              );

              return (
                <View key={s.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeader}>
                    <View style={styles.rect} />
                    <Text style={styles.assignmentName}>{s.name}</Text>
                  </View>
                  <Text style={styles.assignedSummary}>
                    {assigned.length
                      ? `Assigned: ${assigned
                          .map((p) => p.name)
                          .join(', ')}`
                      : 'No dropoff assignments yet.'}
                  </Text>

                  <View style={[styles.chipRow, { marginTop: 8 }]}>
                    {visibleDropoffParticipants.map((p) => {
                      const selected =
                        participantAssignedTo.get(p.id as ID) === s.id;
                      return (
                        <TouchableOpacity
                          key={p.id + '-' + s.id}
                          onPress={() =>
                            toggleDropoff(s.id as ID, p.id as ID)
                          }
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
              );
            })}

            {staffForCards.length === 0 && (
              <Text style={styles.emptyHint}>
                No staff currently have dropoff assignments. Toggle &quot;Show
                staff with no dropoffs&quot; above if you&apos;d like to assign
                them from scratch.
              </Text>
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
  assignmentCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D0F0',
    backgroundColor: '#FFFFFF',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 4,
  },
  rect: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E6ECF5',
  },
  assignmentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3C234C',
  },
  assignedSummary: {
    fontSize: 12,
    color: '#7B688C',
  },
  emptyHint: {
    fontSize: 12,
    color: '#9B8DA9',
    marginTop: 8,
  },
});
