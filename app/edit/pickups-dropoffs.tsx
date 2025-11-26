import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Participant } from '@/constants/data';
import { DROPOFF_OPTIONS } from '@/constants/data';
import { useSchedule } from '@/hooks/schedule-store';
import { useNotifications } from '@/hooks/notifications';
import SaveExit from '@/components/SaveExit';

type ID = string;

const MAX_WIDTH = 880;
const ACCENT = '#10B981'; // emerald to match Edit Hub tile

const isEveryone = (name?: string | null) =>
  (name || '').trim().toLowerCase() === 'everyone';

export default function EditPickupsDropoffsScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const {
    staff,
    participants,
    workingStaff,
    attendingParticipants,
    pickupParticipants,
    helperStaff,
    dropoffAssignments,
    dropoffLocations,
    updateSchedule,
  } = useSchedule();
  const { push } = useNotifications();

  const [hideEmptyStaff, setHideEmptyStaff] = useState(true);
  const [collapsedStaff, setCollapsedStaff] = useState<Record<ID, boolean>>({});
  const [showHelpers, setShowHelpers] = useState(false);
const [showAllPickupCandidates, setShowAllPickupCandidates] =
  useState(false);

  const staffById = useMemo(
    () => new Map(staff.map((s) => [s.id as ID, s])),
    [staff],
  );

  const attending = useMemo(
    () =>
      participants
        .filter((p) => attendingParticipants.includes(p.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [participants, attendingParticipants],
  );

  const pickupsSet = useMemo(
    () => new Set(pickupParticipants || []),
    [pickupParticipants],
  );

  const helperSet = useMemo(
    () => new Set(helperStaff || []),
    [helperStaff],
  );

  const workingSet = useMemo(
    () => new Set(workingStaff || []),
    [workingStaff],
  );

  // Staff actually working @ B2, excluding "Everyone"
  const workingStaffList = useMemo(
    () =>
      staff
        .filter((s) => workingSet.has(s.id) && !isEveryone(s.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, workingSet],
  );

  // Helpers = staff not working @ B2, excluding "Everyone"
  const helperPool = useMemo(
    () =>
      staff
        .filter((s) => !workingSet.has(s.id) && !isEveryone(s.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, workingSet],
  );

  const helperStaffList = useMemo(
    () =>
      staff
        .filter((s) => helperSet.has(s.id as ID))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, helperSet],
  );

  const assignments = (dropoffAssignments || {}) as Record<ID, ID[]>;

  // Participants that can take dropoffs
  const visibleDropoffParticipants = useMemo(
    () =>
      attending.filter(
        (p) => !pickupsSet.has(p.id as ID), // pickups not shown in dropoffs
      ),
    [attending, pickupsSet],
  );

  // pid -> staffId lookup
  const participantAssignedTo = useMemo(() => {
    const map = new Map<ID, ID>();
    Object.entries(assignments).forEach(([sid, pids]) => {
      (pids || []).forEach((pid) => map.set(pid as ID, sid as ID));
    });
    return map;
  }, [assignments]);

  const getDropoffLabel = (p: Participant): string => {
    const options = DROPOFF_OPTIONS[p.id as ID];
    if (!options || options.length === 0) return p.name;
    const index =
      (dropoffLocations && dropoffLocations[p.id as ID]) ?? 0;
    return options[index] ?? options[0];
  };

  const cycleDropoffLocation = (pid: ID) => {
    const options = DROPOFF_OPTIONS[pid];
    if (!options || options.length === 0) return;

    const currentIndex =
      (dropoffLocations && dropoffLocations[pid]) ?? 0;
    const nextIndex = (currentIndex + 1) % options.length;

    updateSchedule({
      dropoffLocations: {
        ...(dropoffLocations || {}),
        [pid]: nextIndex,
      },
    });
    push('Dropoff location updated', 'pickups');
  };

  // Hide staff cards with no dropoffs if requested
  const staffForCards = useMemo(() => {
    // Merge working staff and selected helpers, de-duplicated by id
    const merged = [...workingStaffList, ...helperStaffList];
    const byId = new Map<ID, (typeof staff)[number]>();
    merged.forEach((s) => {
      if (!byId.has(s.id as ID)) {
        byId.set(s.id as ID, s);
      }
    });

    const list = Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    if (!hideEmptyStaff) return list;

    return list.filter((s) => {
      const assignedList = assignments[s.id as ID];
      return Array.isArray(assignedList) && assignedList.length > 0;
    });
  }, [workingStaffList, helperStaffList, assignments, hideEmptyStaff, staff]);

  const togglePickup = (pid: ID) => {
    const current = new Set(pickupParticipants || []);
    if (current.has(pid)) current.delete(pid);
    else current.add(pid);
    updateSchedule({ pickupParticipants: Array.from(current) });
    push('Pickups updated', 'pickups');
  };

  const toggleHelper = (sid: ID) => {
    const current = new Set(helperStaff || []);
    if (current.has(sid)) current.delete(sid);
    else current.add(sid);
    updateSchedule({ helperStaff: Array.from(current) });
    push('Helper staff updated', 'pickups');
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
      push('Dropoff assignments updated', 'pickups');
      return;
    }

    const list = current[sid] || [];
    current[sid] = [...list, pid];
    updateSchedule({ dropoffAssignments: current });
    push('Dropoff assignments updated', 'pickups');
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="pickups" />
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="bus-outline"
          size={220}
          color="#FF8A92"
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Pickups &amp; Dropoffs</Text>
          <Text style={styles.subtitle}>
            Review and adjust today&apos;s pickups, helpers and dropoff
            assignments. Participants in pickups are not shown in the dropoff
            lists, and each participant can only be assigned to one staff
            member.
          </Text>

          {/* PICKUPS */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.dropoffsHeaderRow}>
              <Text style={styles.sectionTitle}>Pickups</Text>
              {attending.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    setShowAllPickupCandidates((v) => !v)
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.hideToggle}>
                    {showAllPickupCandidates
                      ? 'Show selected only'
                      : 'Show all attendees'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.sectionSub}>
              Tap participants who will be picked up by external transport. You
              can add or remove pickups here even after the schedule wizard has
              been completed.
            </Text>
            <View style={styles.chipRow}>
              {attending
                .filter(
                  (p) =>
                    showAllPickupCandidates ||
                    pickupsSet.has(p.id as ID),
                )
                .map((p) => {
                  const selected = pickupsSet.has(p.id as ID);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => togglePickup(p.id as ID)}
                      activeOpacity={0.85}
                      style={[
                        styles.chip,
                        selected && styles.chipSel,
                      ]}
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
            {attending.length === 0 && (
              <Text style={styles.emptyHint}>
                No attending participants have been set for today yet.
              </Text>
            )}
            {!pickupsSet.size && attending.length > 0 && !showAllPickupCandidates && (
              <Text style={styles.emptyHint}>
                No pickups selected yet. Switch to &quot;Show all attendees&quot;
                to choose pickups.
              </Text>
            )}
          </View>

          {/* HELPERS */}
          <View style={{ marginTop: 24 }}>
            <View style={styles.dropoffsHeaderRow}>
              <Text style={styles.sectionTitle}>Helpers (optional)</Text>
              {helperPool.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowHelpers((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.hideToggle}>
                    {showHelpers ? 'Hide helpers' : 'Show helpers'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.sectionSub}>
              Select staff who will assist with pickups and dropoffs. Only team
              members not working at B2 are shown here.
            </Text>

            {showHelpers && helperPool.length > 0 && (
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
            )}
          </View>

          {/* DROPOFFS – cards per staff */}
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
              dropoffs. Each participant can only belong to one staff member at
              a time.
            </Text>

            {staffForCards.map((s) => {
              const assigned = visibleDropoffParticipants.filter(
                (p) => participantAssignedTo.get(p.id as ID) === s.id,
              );

              const visibleForStaff = visibleDropoffParticipants.filter((p) => {
                const assignedStaff = participantAssignedTo.get(p.id as ID);
                return !assignedStaff || assignedStaff === (s.id as ID);
              });

              const hasAssigned = assigned.length > 0;
              const collapsed = collapsedStaff[s.id as ID] ?? !hasAssigned;

              return (
                <View key={s.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeader}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      <View
                        style={[
                          styles.rect,
                          { backgroundColor: (s as any).color || '#E6ECF5' },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignmentName}>{s.name}</Text>
                        <Text style={styles.assignedSummary}>
                          {assigned.length
                            ? `Assigned: ${assigned
                                .map((p) => getDropoffLabel(p as Participant))
                                .join(', ')}`
                            : 'No dropoff assignments yet.'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        setCollapsedStaff((prev) => ({
                          ...prev,
                          [s.id as ID]: !collapsed,
                        }))
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.hideToggle}>
                        {collapsed ? 'Show list' : 'Hide list'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!collapsed && (
                    <View style={[styles.chipRow, { marginTop: 8 }]}>
                      {visibleForStaff.map((p) => {
                        const selected =
                          participantAssignedTo.get(p.id as ID) === s.id;
                        return (
                          <TouchableOpacity
                            key={p.id + '-' + s.id}
                            onPress={() =>
                              toggleDropoff(s.id as ID, p.id as ID)
                            }
                            onLongPress={() =>
                              cycleDropoffLocation(p.id as ID)
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
                              {getDropoffLabel(p as Participant)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
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
    backgroundColor: '#FFE4E6',
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
  },
  scroll: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 160,
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
    borderColor: '#CCF4E1',
    backgroundColor: '#FFFFFF',
  },
  chipSel: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
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
    width: '100%',
  },
  hideToggle: {
    fontSize: 12,
    color: ACCENT,
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
