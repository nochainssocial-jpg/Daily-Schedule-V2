// app/edit/floating.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { FLOATING_ROOMS, STAFF as STATIC_STAFF } from '@/constants/data';
import Chip from '@/components/Chip';

type ID = string;

export default function EditFloatingScreen() {
  const {
    staff: scheduleStaff,
    workingStaff,
    floatingAssignments,
    updateSchedule,
  } = useSchedule();

  // Prefer staff from the store after create, fallback to static constants
  const staff = (scheduleStaff && scheduleStaff.length ? scheduleStaff : STATIC_STAFF) as typeof STATIC_STAFF;

  // If we have a Dream Team, use them as the pool for floaters, otherwise all staff
  const staffPool = useMemo(
    () => (workingStaff && workingStaff.length ? staff.filter(s => workingStaff.includes(s.id)) : staff),
    [staff, workingStaff],
  );

  const [activeRoomId, setActiveRoomId] = useState<string | null>(FLOATING_ROOMS[0]?.id ?? null);

  // Keep active room valid if rooms or selected id changes
  useEffect(() => {
    if (!FLOATING_ROOMS.length) {
      setActiveRoomId(null);
      return;
    }
    if (!activeRoomId || !FLOATING_ROOMS.some(r => r.id === activeRoomId)) {
      setActiveRoomId(FLOATING_ROOMS[0].id);
    }
  }, [activeRoomId]);

  const activeRoom = FLOATING_ROOMS.find(r => r.id === activeRoomId) || null;
  const staffById = new Map(staff.map((s) => [s.id, s]));

  // Determine which staff can be assigned to the active room
  const eligibleStaff = useMemo(() => {
    if (!activeRoom) return staffPool;
    if (activeRoom.id === 'twins') {
      // FSO: only female staff can be assigned to Twins
      return staffPool.filter(s => s.gender === 'female');
    }
    return staffPool;
  }, [activeRoom, staffPool]);

  const handleAssignStaff = (staffId: ID) => {
    if (!activeRoom) return;
    const current = floatingAssignments || {};
    const next = { ...current, [activeRoom.id]: staffId };
    updateSchedule({ floatingAssignments: next });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Floating Assignments</Text>
          <Text style={styles.subtitle}>
            Assign floating staff to rooms. Twins is FSO (Female Staff Only) for 11:00–11:30 and 13:00–13:30.
          </Text>

          {/* Room cards */}
          <View style={styles.roomRow}>
            {FLOATING_ROOMS.map((room) => {
              const assignedId = floatingAssignments?.[room.id];
              const st = assignedId ? staffById.get(assignedId) : null;
              const isActive = activeRoomId === room.id;
              const isTwins = room.id === 'twins';

              return (
                <TouchableOpacity
                  key={room.id}
                  style={[styles.roomCard, isActive && styles.roomCardActive, isTwins && styles.roomCardTwins]}
                  onPress={() => setActiveRoomId(room.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.roomLabel}>{room.label}</Text>
                  {isTwins && (
                    <Text style={styles.fsoTag}>FSO • 11:00–11:30 & 13:00–13:30</Text>
                  )}
                  <Text style={styles.assignedLabel}>
                    {st ? `Assigned: ${st.name}` : 'No floating staff assigned'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Staff selector */}
          <View style={styles.staffBlock}>
            <Text style={styles.sectionTitle}>
              {activeRoom ? `Select floating staff for ${activeRoom.label}` : 'Select a room above'}
            </Text>

            {activeRoom?.id === 'twins' && (
              <Text style={styles.helperText}>
                Twins is FSO: only female staff appear below and can be assigned here.
              </Text>
            )}

            {eligibleStaff.length === 0 ? (
              <Text style={styles.empty}>
                No eligible staff available. Make sure you have selected working staff in the create flow.
              </Text>
            ) : (
              <View style={styles.chipGrid}>
                {eligibleStaff.map((s) => {
                  const isAssigned = activeRoom && floatingAssignments?.[activeRoom.id] === s.id;
                  return (
                    <Chip
                      key={s.id}
                      label={s.name}
                      selected={isAssigned}
                      onPress={() => handleAssignStaff(s.id)}
                      style={styles.staffChip}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const MAX_WIDTH = 880;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
  },
  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: '#332244',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 16,
    color: '#5a486b',
  },
  roomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  roomCard: {
    flexGrow: 1,
    minWidth: 220,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5d9f2',
    backgroundColor: '#ffffff',
  },
  roomCardActive: {
    borderColor: '#e91e63',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  roomCardTwins: {
    // Slight pink tint to emphasise FSO
    backgroundColor: '#fef3f7',
  },
  roomLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3c234c',
  },
  fsoTag: {
    marginTop: 4,
    fontSize: 11,
    color: '#e91e63',
  },
  assignedLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#4c3b5c',
  },
  staffBlock: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#3c234c',
  },
  helperText: {
    fontSize: 12,
    opacity: 0.8,
    color: '#7a688c',
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  staffChip: {
    marginBottom: 8,
  },
  empty: {
    fontSize: 13,
    opacity: 0.75,
    color: '#7a688c',
  },
});
