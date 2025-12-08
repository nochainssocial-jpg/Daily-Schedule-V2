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
import { DROPOFF_OPTIONS } from '@/constants/data';
import { useSchedule } from '@/hooks/schedule-store';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';

type ID = string;

const MAX_WIDTH = 880;
const ACCENT = '#10B981'; // emerald to match Edit Hub tile

const isEveryone = (name: string | null | undefined) =>
  typeof name === 'string' && name.trim().toLowerCase() === 'everyone';

export default function PickupsDropoffsScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

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

  // Attending participants for today
  const attending = useMemo(
    () =>
      participants.filter((p) =>
        attendingParticipants.includes(p.id as ID),
      ),
    [participants, attendingParticipants],
  );

  const pickupsSet = useMemo(
    () => new Set(pickupParticipants || []),
    [pickupParticipants],
  );

  const helperSet = useMemo(
    () => new Set<string>((helperStaff || []).map((id: any) => String(id))),
    [helperStaff],
  );

  const workingSet = useMemo(
    () => new Set<string>((workingStaff || []).map((id: any) => String(id))),
    [workingStaff],
  );

  // Staff actually working @ B2, excluding "Everyone"
  const workingStaffList = useMemo(
    () =>
      staff
        .filter(
          (s) => workingSet.has(String(s.id)) && !isEveryone(s.name),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, workingSet],
  );

  const helperStaffList = useMemo(
    () =>
      staff
        .filter((s) => helperSet.has(String(s.id)))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, helperSet],
  );

  // Map of staffId -> staff row (for legacy shapes / safety)
  const staffById = useMemo(() => {
    const map = new Map<ID, (typeof staff)[number]>();
    staff.forEach((s) => {
      if (s.id) {
        map.set(s.id as ID, s);
      }
    });
    return map;
  }, [staff]);

  // Normalise dropoff assignments so values are always staffId -> participantId[]
  const assignments = React.useMemo(() => {
    const raw = (dropoffAssignments || {}) as Record<ID, any>;
    const normalised: Record<ID, ID[]> = {};

    Object.entries(raw).forEach(([sid, pids]) => {
      if (!pids) {
        normalised[sid as ID] = [];
        return;
      }

      // New shape: staffId -> participantId[]
      if (Array.isArray(pids)) {
        normalised[sid as ID] = (pids as ID[]).filter(Boolean) as ID[];
        return;
      }

      // Legacy shape: participantId -> { staffId, locationId }
      if (typeof pids === 'object' && 'staffId' in (pids as any)) {
        const value = pids as { staffId?: ID | null };
        if (value.staffId) {
          const staffId = value.staffId as ID;
          if (!normalised[staffId]) normalised[staffId] = [];
          normalised[staffId].push(sid as ID); // sid is participantId
        }
        return;
      }

      // Shape: participantId -> staffId (value is a staff id string)
      const valueId = String(pids) as ID;
      if (staffById.has(valueId)) {
        const staffId = valueId;
        if (!normalised[staffId]) normalised[staffId] = [];
        normalised[staffId].push(sid as ID); // sid is participantId
        return;
      }

      // Fallback: treat as "staffId -> single participantId"
      normalised[sid as ID] = [valueId];
    });

    return normalised;
  }, [dropoffAssignments, staffById]);

  // Participants that can take dropoffs = attending & NOT pickups
  const visibleDropoffParticipants = useMemo(
    () =>
      attending.filter(
        (p) => !pickupsSet.has(p.id as ID),
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

  // Label for dropoff chips = participant name + current location option
  const getDropoffLabel = (p: { id: ID; name: string }): string => {
    const options = DROPOFF_OPTIONS[p.id as ID];
    if (!options || options.length === 0) return p.name;
    const index =
      (dropoffLocations && dropoffLocations[p.id as ID]) ?? 0;
    const location = options[index] ?? options[0];
    return `${p.name} – ${location}`;
  };

  // Long-press to cycle dropoff location
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

  // Merge working staff and selected helpers, de-duplicated by id
  const staffForCards = useMemo(() => {
    const merged = [...workingStaffList, ...helperStaffList];
    const byId = new Map<ID, (typeof staff)[number]>();

    merged.forEach((s) => {
      if (!s.id) return;
      byId.set(s.id as ID, s);
    });

    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [workingStaffList, helperStaffList, staff]);

  const [showAllPickupCandidates, setShowAllPickupCandidates] =
    useState(false);
  const [hideEmptyStaff, setHideEmptyStaff] = useState(false);
  const [collapsedStaff, setCollapsedStaff] = useState<Record<ID, boolean>>(
    {},
  );
  const [helpersCollapsed, setHelpersCollapsed] = useState(true); // helpers auto-hidden

  const togglePickup = (pid: ID) => {
    if (readOnly) {
      push('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    const current = new Set(pickupParticipants || []);
    if (current.has(pid)) current.delete(pid);
    else current.add(pid);
    updateSchedule({ pickupParticipants: Array.from(current) });
    push('Pickup participants updated', 'pickups');
  };

  const toggleHelper = (sid: ID) => {
    if (readOnly) {
      push('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    const current = new Set(helperStaff || []);
    if (current.has(sid)) current.delete(sid);
    else current.add(sid);
    updateSchedule({ helperStaff: Array.from(current) });
    push('Helper staff updated', 'pickups');
  };

  const toggleDropoff = (sid: ID, pid: ID) => {
    if (readOnly) {
      push('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }

    // Start from the normalised staffId -> participantIds mapping
    const current: Record<ID, ID[]> = {};
    Object.entries(assignments).forEach(([staffId, pids]) => {
      current[staffId as ID] = [...(pids || [])] as ID[];
    });

    let previousOwner: ID | null = null;

    Object.entries(current).forEach(([staffId, pids]) => {
      if (!Array.isArray(pids)) return;
      if (pids.includes(pid)) {
        previousOwner = staffId as ID;
        const filtered = pids.filter((x) => x !== pid);
        if (filtered.length) current[staffId as ID] = filtered;
        else delete current[staffId as ID];
      }
    });

    // Already owned by this staff -> toggle off (this will unassign the participant)
    if (previousOwner === sid) {
      // Rebuild canonical participant -> { staffId, locationId } map
      const canonical: Record<ID, { staffId: ID | null; locationId: number | null } | null> = {};
      Object.entries(current).forEach(([staffId, pids]) => {
        (pids || []).forEach((participantId) => {
          const locIndex =
            (dropoffLocations && typeof dropoffLocations[participantId as ID] === 'number')
              ? (dropoffLocations[participantId as ID] as number)
              : null;
          canonical[participantId as ID] = {
            staffId: staffId as ID,
            locationId: locIndex,
          };
        });
      });

      updateSchedule({ dropoffAssignments: canonical });
      push('Dropoff assignments updated', 'pickups');
      return;
    }

    const list = current[sid] || [];
    if (!list.includes(pid)) {
      current[sid] = [...list, pid];
    }

    // Rebuild canonical participant -> { staffId, locationId } map
    const canonical: Record<ID, { staffId: ID | null; locationId: number | null } | null> = {};
    Object.entries(current).forEach(([staffId, pids]) => {
      (pids || []).forEach((participantId) => {
        const locIndex =
          (dropoffLocations && typeof dropoffLocations[participantId as ID] === 'number')
            ? (dropoffLocations[participantId as ID] as number)
            : null;
        canonical[participantId as ID] = {
          staffId: staffId as ID,
          locationId: locIndex,
        };
      });
    });

    updateSchedule({ dropoffAssignments: canonical });
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

  <View style={{ paddingVertical: 8 }}>
    <View style={styles.chipRow}>
      {(showAllPickupCandidates
        ? attending
        : attending.filter((p) => pickupsSet.has(p.id as ID))
      ).map((p) => {
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
            <View style={styles.dropoffsHeaderRow}>
              <Text style={styles.sectionTitle}>Helpers</Text>
              <TouchableOpacity
                onPress={() => setHelpersCollapsed((v) => !v)}
                activeOpacity={0.85}
              >
                <Text style={styles.hideToggle}>
                  {helpersCollapsed ? 'Show helpers list' : 'Hide helpers list'}
                </Text>
              </TouchableOpacity>
            </View>

            {!helpersCollapsed && (
              <>
                <Text style={styles.sectionSub}>
                  Helpers are staff who aren&apos;t working at B2 but can support
                  pickups and dropoffs. Tap to add or remove helpers.
                </Text>

                <View style={{ paddingVertical: 8 }}>
                  <View style={styles.chipRow}>
                    {staff
                      .filter(
                        (s) =>
                          !workingSet.has(String(s.id)) &&
                          !isEveryone(s.name),
                      )
                      .map((s) => {
                        const selected = helperSet.has(String(s.id));
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
              </>
            )}
          </View>

          {/* DROPOFFS */}
          <View style={{ marginTop: 24, marginBottom: 20 }}>
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
              dropoffs. Long-press a participant to cycle their dropoff
              location. Each participant can only belong to one staff member at
              a time.
            </Text>

            {staffForCards.map((s) => {
              const assigned = visibleDropoffParticipants.filter(
                (p) => participantAssignedTo.get(p.id as ID) === s.id,
              );

              // KEY BEHAVIOUR:
              // Show unassigned participants + those assigned to THIS staff only.
              const visibleForStaff = visibleDropoffParticipants.filter(
                (p) => {
                  const owner = participantAssignedTo.get(p.id as ID);
                  return !owner || owner === (s.id as ID);
                },
              );

              const hasAssigned = assigned.length > 0;
              const collapsed = collapsedStaff[s.id as ID] ?? !hasAssigned;

              if (hideEmptyStaff && !hasAssigned) {
                return null;
              }

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
                                .map((p) => getDropoffLabel(p as any))
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
                              {getDropoffLabel(p as any)}
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
    backgroundColor: '#ffcaae',
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
  },
  scroll: {
    paddingBottom: 120,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSub: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  dropoffsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hideToggle: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  chipSel: {
    backgroundColor: '#ECFEFF',
    borderColor: '#0EA5E9',
  },
  chipTxt: {
    fontSize: 13,
    color: '#374151',
  },
  chipTxtSel: {
    color: '#0369A1',
    fontWeight: '600',
  },
  assignmentCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rect: {
    width: 24,
    height: 24,
    borderRadius: 8,
    marginRight: 8,
  },
  assignmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  assignedSummary: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
});
