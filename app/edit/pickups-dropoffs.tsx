// app/create-schedule/step4-pickups-dropoffs.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { STAFF, PARTICIPANTS } from '@/constants/data';
import Chip from '@/components/Chip';

type ID = string;

export default function Step4PickupsDropoffs(props) {
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
  const staffById = new Map(STAFF.map((s) => [s.id, s]));
  const participantsById = new Map(PARTICIPANTS.map((p) => [p.id, p]));

  // Non-working staff eligible as helpers
  const helperCandidates = STAFF.filter((s) => !workingStaff.includes(s.id));

  // Filter participants shown in dropoffs (must be attending & not pickup)
  const dropoffCandidates = attendingParticipants.filter(
    (pid) => !pickupParticipants.includes(pid),
  );

  // Build dropoff staff list
  const dropoffStaffIds = [...workingStaff, ...helperStaff];
  const dropoffStaff = dropoffStaffIds
    .map((id) => staffById.get(id))
    .filter(Boolean);

  const unassignedDropoff = dropoffCandidates.filter((pid) => {
    const assigned = Object.values(dropoffAssignments).flat();
    return !assigned.includes(pid);
  });

  const togglePickup = (pid: ID) => {
    if (pickupParticipants.includes(pid)) {
      setPickupParticipants(pickupParticipants.filter((id) => id !== pid));
    } else {
      setPickupParticipants([...pickupParticipants, pid]);

      // Remove from dropoff assignments if it was assigned
      const next = {};
      for (const [sid, pids] of Object.entries(dropoffAssignments)) {
        next[sid] = pids.filter((id) => id !== pid);
      }
      setDropoffAssignments(next);
    }
  };

  const toggleHelper = (sid: ID) => {
    if (helperStaff.includes(sid)) {
      // remove helper
      setHelperStaff(helperStaff.filter((id) => id !== sid));

      // Also remove helper from dropoff assignments staff list
      const next = { ...dropoffAssignments };
      delete next[sid];
      setDropoffAssignments(next);
    } else {
      // add helper
      setHelperStaff([...helperStaff, sid]);
    }
  };

  const assignDropoff = (pid: ID, sid: ID) => {
    const next = {};
    // remove from all first
    for (const [staffId, pids] of Object.entries(dropoffAssignments)) {
      next[staffId] = pids.filter((id) => id !== pid);
    }
    // add to chosen
    next[sid] = [...(next[sid] || []), pid];
    setDropoffAssignments(next);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>

          {/* ============= PICKUPS ============= */}
          <Text style={styles.title}>Pickups</Text>
          <Text style={styles.subtitle}>Select participants being picked up by external transport.</Text>

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

          {/* ============= HELPERS ============= */}
          <View style={{ marginTop: 26 }}>
            <TouchableOpacity onPress={() => setShowHelpers(!showHelpers)} activeOpacity={0.8}>
              <Text style={styles.helperToggle}>
                {showHelpers ? '▼ Hide Helpers' : '➕ Add Helpers (optional)'}
              </Text>
            </TouchableOpacity>

            {showHelpers && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.subtitle}>Select staff to assist with dropoffs:</Text>
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

          {/* ============= DROPOFF ASSIGNMENTS ============= */}
          <Text style={[styles.title, { marginTop: 30 }]}>Dropoffs</Text>

          {dropoffStaff.length === 0 ? (
            <Text style={styles.empty}>No dropoff staff available. Add helpers or select working staff.</Text>
          ) : (
            <>
              <Text style={styles.subtitle}>Tap a participant to assign staff.</Text>

              <Text style={styles.sectionSubTitle}>Assigned</Text>
              {Object.entries(dropoffAssignments).map(([sid, pids]) => {
                const staff = staffById.get(sid);
                return (
                  <View key={sid} style={{ marginBottom: 12 }}>
                    <Text style={styles.staffName}>{staff?.name}</Text>
                    {pids.length === 0 ? (
                      <Text style={styles.emptySmall}>No dropoff assignments yet.</Text>
                    ) : (
                      pids.map((pid) => {
                        const p = participantsById.get(pid);
                        return (
                          <TouchableOpacity
                            key={pid}
                            style={styles.dropoffAssignedRow}
                            onPress={() => assignDropoff(pid, sid)}
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

              <Text style={styles.sectionSubTitle}>Unassigned</Text>
              {unassignedDropoff.length === 0 ? (
                <Text style={styles.empty}>All participants assigned.</Text>
              ) : (
                unassignedDropoff.map((pid) => {
                  const p = participantsById.get(pid);
                  return (
                    <View key={pid} style={styles.unassignedBlock}>
                      <Text style={styles.rowText}>{p?.name}</Text>

                      {/* Staff picker inline */}
                      <View style={styles.staffPickerRow}>
                        {dropoffStaff.map((s) => (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => assignDropoff(pid, s.id)}
                            style={styles.staffChip}
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
  emptySmall: { fontSize: 12, opacity: 0.6, color: '#7a688c' },

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

  rowText: { fontSize: 14, color: '#4c3b5c' },
  rowHint: { fontSize: 11, color: '#a8446f' },

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
  staffChipText: { fontSize: 12, color: '#3a2464' },
});
