// app/edit/assignments.tsx
import React from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSchedule } from '@/hooks/schedule-store';
import {
  STAFF as STATIC_STAFF,
  PARTICIPANTS as STATIC_PARTS,
} from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import SaveExit from '@/components/SaveExit';

type ID = string;

const nm = (x?: string) => (x || '').trim().toLowerCase();
const isEveryone = (x?: string) => nm(x) === 'everyone';
const isAntoinette = (x?: string) => nm(x) === 'antoinette';

const MAX_WIDTH = 880;
const PILL = 999;
const ACCENT = '#6366F1'; // indigo

export default function EditAssignmentsScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const {
    staff: scheduleStaff,
    participants: scheduleParts,
    assignments,
    workingStaff,
    attendingParticipants,
    updateSchedule,
  } = useSchedule();
  const { push } = useNotifications();

  const staffSource =
    (scheduleStaff && scheduleStaff.length ? scheduleStaff : STATIC_STAFF) ||
    [];
  const partsSource =
    (scheduleParts && scheduleParts.length ? scheduleParts : STATIC_PARTS) ||
    [];

  const workingSet = new Set<ID>(
    (workingStaff && workingStaff.length ? (workingStaff as ID[]) : []) as ID[],
  );

  // Staff rows: working staff only, plus "Everyone", excluding Antoinette.
  const rowStaff = staffSource.filter((s) => {
    const inWorking = workingSet.has(s.id as ID);
    const everyone = isEveryone(s.name);
    const anto = isAntoinette(s.name);

    if (anto) return false;
    if (workingSet.size) {
      return inWorking || everyone;
    }
    return !anto;
  });

  const assignmentsMap: Record<ID, ID[]> = (assignments || {}) as any;

  const attendingIds: ID[] =
    (attendingParticipants && attendingParticipants.length
      ? (attendingParticipants as ID[])
      : partsSource.map((p) => p.id as ID)) || [];

  const attendingSet = new Set(attendingIds);

  const staffById = new Map(staffSource.map((s) => [s.id, s]));
  const partsById = new Map(partsSource.map((p) => [p.id, p]));

  const assignedByParticipant: Record<ID, ID> = {};
  Object.entries(assignmentsMap).forEach(([sid, pids]) => {
    if (!Array.isArray(pids)) return;
    (pids as ID[]).forEach((pid) => {
      if (attendingSet.has(pid as ID)) {
        assignedByParticipant[pid as ID] = sid as ID;
      }
    });
  });

  const handleToggle = (staffId: ID, participantId: ID) => {
    const current = assignmentsMap || {};
    const next: Record<ID, ID[]> = {};

    Object.entries(current).forEach(([sid, pids]) => {
      next[sid as ID] = Array.isArray(pids) ? [...(pids as ID[])] : [];
    });

    const currentOwner = assignedByParticipant[participantId];

    if (currentOwner && currentOwner === staffId) {
      next[staffId] = (next[staffId] || []).filter((id) => id !== participantId);
    } else {
      if (currentOwner) {
        next[currentOwner] = (next[currentOwner] || []).filter(
          (id) => id !== participantId,
        );
      }
      const arr = next[staffId] || [];
      if (!arr.includes(participantId)) arr.push(participantId);
      next[staffId] = arr;
    }

    updateSchedule({ assignments: next });
    push('Team daily assignments updated', 'assignments');
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="assignments" />
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="clipboard-outline"
          size={220}
          color="#7C58FF"
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Team Daily Assignments</Text>
          <Text style={styles.subtitle}>
            Working staff @ B2 (including Everyone) with their individual
            participant assignments. Tap a name to move them between staff
            members.
          </Text>

          {rowStaff.length === 0 ? (
            <Text style={styles.helperText}>
              No working staff found. Create a schedule and select your Dream
              Team first.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {rowStaff.map((st) => {
                const staffId = st.id as ID;
                const staffAssigned = (assignmentsMap[staffId] || []).filter(
                  (pid) => attendingSet.has(pid as ID),
                ) as ID[];

                const assignedNames = staffAssigned
                  .map((pid) => partsById.get(pid)?.name)
                  .filter(Boolean)
                  .join(', ');

                const availablePids = attendingIds.filter((pid) => {
                  const owner = assignedByParticipant[pid];
                  return !owner || owner === staffId;
                });

                return (
                  <View key={staffId} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.rect,
                          { backgroundColor: st.color || '#ddd' },
                        ]}
                      />
                      <Text style={styles.staffName}>{st.name}</Text>
                    </View>

                    {staffAssigned.length > 0 && (
                      <Text style={styles.assignedSummary}>
                        Assigned: {assignedNames}
                      </Text>
                    )}

                    <View style={styles.chipWrap}>
                      {availablePids.map((pid) => {
                        const isAssigned = staffAssigned.includes(pid);
                        const part = partsById.get(pid);
                        return (
                          <TouchableOpacity
                            key={pid}
                            onPress={() => handleToggle(staffId, pid)}
                            activeOpacity={0.85}
                            style={[styles.chip, isAssigned && styles.chipSel]}
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
                            {isAssigned && (
                              <Text style={styles.checkMark}>✓</Text>
                            )}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E5DEFF',
  },
    scroll: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 160,
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
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
  helperText: {
    fontSize: 13,
    opacity: 0.8,
    color: '#7a688c',
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rect: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E6ECF5',
  },
  staffName: {
    fontSize: 14,
    color: '#101828',
    fontWeight: '600',
  },
  assignedSummary: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6ECF5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: PILL,
    gap: 6,
  },
  chipSel: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipTxt: {
    fontSize: 14,
    color: '#101828',
  },
  chipTxtSel: {
    color: '#FFFFFF',
  },
  checkMark: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});
