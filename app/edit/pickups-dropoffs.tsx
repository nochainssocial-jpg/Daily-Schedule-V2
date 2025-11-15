// app/edit/pickups-dropoffs.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { STAFF, PARTICIPANTS } from '@/constants/data';
import { useSchedule } from '@/hooks/schedule-store';
import Chip from '@/components/Chip';

type ID = string;

function Step4PickupsDropoffs(props) {
  const {
    workingStaff = [],
    attendingParticipants = [],
    pickupParticipants = [],
    helperStaff = [],
    dropoffAssignments = {},
    setPickupParticipants,
    setHelperStaff,
    setDropoffAssignments,
  } = props;

  const [showHelpers, setShowHelpers] = useState(false);
  const staffById = new Map(STAFF.map(s => [s.id, s]));
  const participantsById = new Map(PARTICIPANTS.map(p => [p.id, p]));

  // Non-working staff eligible as helpers
  const helperCandidates = STAFF.filter(s => !workingStaff.includes(s.id));

  // Filter participants shown in dropoffs (must be attending & not pickup)
  const dropoffCandidates = attendingParticipants.filter(
    pid => !pickupParticipants.includes(pid),
  );

  // Build dropoff staff list (working + helpers)
  const dropoffStaffIds = [...workingStaff, ...helperStaff];
  const dropoffStaff = dropoffStaffIds
    .map(id => staffById.get(id))
    .filter(Boolean);

  // Active staff (for "Assigned / Not assigned" lists)
  const [activeStaffId, setActiveStaffId] = useState<ID | null>(
    dropoffStaff[0]?.id ?? null,
  );

  useEffect(() => {
    if (!dropoffStaff.length) {
      setActiveStaffId(null);
      return;
    }
    if (!activeStaffId || !dropoffStaff.some(s => s.id === activeStaffId)) {
      setActiveStaffId(dropoffStaff[0].id);
    }
  }, [dropoffStaff, activeStaffId]);

  const activeStaff = dropoffStaff.find(s => s.id === activeStaffId) || null;

  const togglePickup = (pid: ID) => {
    if (pickupParticipants.includes(pid)) {
      setPickupParticipants(pickupParticipants.filter(id => id !== pid));
    } else {
      setPickupParticipants([...pickupParticipants, pid]);

      // Remove from dropoff assignments if it was assigned
      const next: Record<string, ID[]> = {};
      for (const [sid, pids] of Object.entries(dropoffAssignments)) {
        next[sid] = (pids as ID[]).filter(id => id !== pid);
      }
      setDropoffAssignments(next);
    }
  };

  const toggleHelper = (sid: ID) => {
    if (helperStaff.includes(sid)) {
      // remove helper
      setHelperStaff(helperStaff.filter(id => id !== sid));

      // Also remove helper from dropoff assignments staff list
      const next: Record<string, ID[]> = { ...dropoffAssignments };
      delete next[sid];
      setDropoffAssignments(next);
    } else {
      // add helper
      setHelperStaff([...helperStaff, sid]);
    }
  };

  // Toggle dropoff assignment for the active staff (Team Daily style)
  const toggleDropoffForActive = (pid: ID) => {
    if (!activeStaffId) return;

    const current = dropoffAssignments || {};
    const next: Record<string, ID[]> = {};

    // First, remove this participant from all staff to ensure single owner
    Object.entries(current).forEach(([sid, pids]) => {
      if (!Array.isArray(pids)) return;
      const filtered = (pids as ID[]).filter(id => id !== pid);
      next[sid] = filtered;
    });

    const alreadyAssignedToActive = (current[activeStaffId] || []).includes(pid);

    if (!alreadyAssignedToActive) {
      const existing = next[activeStaffId] || [];
      next[activeStaffId] = [...existing, pid];
    } else {
      // If they were assigned to active staff, we just leave them removed
      next[activeStaffId] = next[activeStaffId] || [];
    }

    setDropoffAssignments(next);
  };

  // Build lists for "assigned" vs "not assigned" for the active staff
  const assignedIdsForActive = new Set(
    activeStaffId && dropoffAssignments && dropoffAssignments[activeStaffId]
      ? (dropoffAssignments[activeStaffId] as ID[])
      : [],
  );

  const dropoffCandidatesParts = dropoffCandidates
    .map(pid => participantsById.get(pid))
    .filter(Boolean) as { id: ID; name: string }[];

  const assignedList = dropoffCandidatesParts.filter(p =>
    assignedIdsForActive.has(p.id),
  );
  const unassignedList = dropoffCandidatesParts.filter(
    p => !assignedIdsForActive.has(p.id),
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          {/* ============= PICKUPS ============= */}
          <Text style={styles.title}>Pickups</Text>
          <Text style={styles.subtitle}>
            Select participants being picked up by external transport.
          </Text>

          <View style={styles.chipGrid}>
            {attendingParticipants.map(pid => {
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

          {/* ============= HELPERS ============= */}
          <View style={{ marginTop: 26 }}>
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
                <Text style={styles.subtitle}>
                  Select staff to assist with dropoffs:
                </Text>
                <View style={styles.chipGrid}>
                  {helperCandidates.map(s => (
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
                {helperStaff.map(sid => {
                  const s = staffById.get(sid);
                  return (
                    <View key={sid} style={styles.helperRow}>
                      <Text style={styles.helperName}>{s?.name}</Text>
                      <TouchableOpacity onPress={() => toggleHelper(sid)}>
                        <Text style={styles.removeHelper}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ============= DROPOFF ASSIGNMENTS (Team Daily style) ============= */}
          <Text style={[styles.title, { marginTop: 30 }]}>Dropoffs</Text>

          {dropoffStaff.length === 0 ? (
            <Text style={styles.empty}>
              No dropoff staff available. Add helpers or select working staff.
            </Text>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Choose a staff member, then tap participants to assign or unassign
                their dropoffs. Each participant can only be assigned to one staff
                member at a time.
              </Text>

              {/* Staff selector row */}
              <View style={styles.staffRow}>
                {dropoffStaff.map(s => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    selected={activeStaffId === s.id}
                    onPress={() => setActiveStaffId(s.id)}
                    style={styles.staffChip}
                  />
                ))}
              </View>

              {!activeStaff ? (
                <Text style={styles.emptySmall}>
                  Select a staff member above to manage dropoffs.
                </Text>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>
                    Assigned to {activeStaff.name}
                  </Text>
                  {assignedList.length === 0 ? (
                    <Text style={styles.emptySmall}>
                      No dropoff assignments yet.
                    </Text>
                  ) : (
                    assignedList.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.dropoffAssignedRow}
                        onPress={() => toggleDropoffForActive(p.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rowText}>{p.name}</Text>
                        <Text style={styles.tagUnassign}>Tap to unassign</Text>
                      </TouchableOpacity>
                    ))
                  )}

                  <Text style={styles.sectionTitle}>
                    Not assigned to {activeStaff.name}
                  </Text>
                  {unassignedList.length === 0 ? (
                    <Text style={styles.empty}>
                      All dropoff participants are currently assigned.
                    </Text>
                  ) : (
                    unassignedList.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.unassignedRow}
                        onPress={() => toggleDropoffForActive(p.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rowText}>{p.name}</Text>
                        <Text style={styles.tagAssign}>Tap to assign</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const MAX_WIDTH = 880;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf7fb' },
  scroll: { paddingBottom: 40, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: 24 },

  title: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#3c234c' },
  subtitle: { fontSize: 12, opacity: 0.7, marginBottom: 10, color: '#6b547b' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  helperToggle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a488c',
  },

  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  helperName: { fontSize: 14, color: '#4c3b5c' },
  removeHelper: { fontSize: 12, color: '#e91e63' },

  sectionSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    color: '#3c234c',
  },

  empty: { fontSize: 13, opacity: 0.75, color: '#7a688c' },
  emptySmall: { fontSize: 12, opacity: 0.7, color: '#7a688c' },

  staffName: { fontSize: 14, fontWeight: '600', color: '#3c234c', marginBottom: 4 },

  dropoffAssignedRow: {
    backgroundColor: '#fbe4f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  unassignedRow: {
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

  rowText: { fontSize: 14, color: '#4c3b5c' },

  tagAssign: { fontSize: 11, color: '#e91e63' },
  tagUnassign: { fontSize: 11, color: '#7a4860' },

  staffRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  staffChip: {
    marginBottom: 8,
  },
});

// Edit wrapper: loads data from the current schedule and persists changes
export default function EditPickupsDropoffsScreen() {
  const {
    workingStaff,
    attendingParticipants,
    pickupParticipants,
    helperStaff,
    dropoffAssignments,
    updateSchedule,
  } = useSchedule();

  const setPickupParticipants = (updater: any) => {
    updateSchedule({
      pickupParticipants:
        typeof updater === 'function'
          ? updater(pickupParticipants || [])
          : updater || [],
    });
  };

  const setHelperStaff = (updater: any) => {
    updateSchedule({
      helperStaff:
        typeof updater === 'function' ? updater(helperStaff || []) : updater || [],
    });
  };

  const setDropoffAssignments = (updater: any) => {
    updateSchedule({
      dropoffAssignments:
        typeof updater === 'function'
          ? updater(dropoffAssignments || {})
          : updater || {},
    });
  };

  return (
    <Step4PickupsDropoffs
      workingStaff={workingStaff || []}
      attendingParticipants={attendingParticipants || []}
      pickupParticipants={pickupParticipants || []}
      helperStaff={helperStaff || []}
      dropoffAssignments={dropoffAssignments || {}}
      setPickupParticipants={setPickupParticipants}
      setHelperStaff={setHelperStaff}
      setDropoffAssignments={setDropoffAssignments}
    />
  );
}
