// app/edit/assignments.tsx
import React from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSchedule } from '@/hooks/schedule-store';
import {
  STAFF as STATIC_STAFF,
  PARTICIPANTS as STATIC_PARTS,
} from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';
import { supabase } from '@/lib/supabase';

type ID = string;

const nm = (x?: string) => (x || '').trim().toLowerCase();
const isEveryone = (x?: string) => nm(x) === 'everyone';
const isAntoinette = (x?: string) => nm(x) === 'antoinette';

const MAX_WIDTH = 880;
const PILL = 999;
const ACCENT = '#4862f1b3'; // indigo

const STAFF_SCORE_KEYS: Array<keyof any> = [
  'experience_level',
  'behaviour_capability',
  'personal_care_skill',
  'mobility_assistance',
  'communication_support',
  'reliability_rating',
];

function getStaffScore(row: any): number {
  if (!row) return 0;
  return STAFF_SCORE_KEYS.reduce((sum, key) => {
    const raw = (row as any)?.[key];
    const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
}

function getScoreBand(score: number): 'none' | 'junior' | 'mid' | 'senior' {
  if (!score || score <= 0) return 'none';
  if (score >= 15) return 'senior';
  if (score >= 9) return 'mid';
  return 'junior';
}

const PARTICIPANT_SCORE_KEYS: Array<keyof any> = [
  'behaviours',
  'personal_care',
  'communication',
  'sensory',
  'social',
  'community',
  'safety',
];

function getParticipantScore(row: any): number {
  if (!row) return 0;
  return PARTICIPANT_SCORE_KEYS.reduce((sum, key) => {
    const raw = (row as any)?.[key];
    const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
}

function getParticipantBand(score: number): 'low' | 'medium' | 'high' {
  if (!score || score <= 0) return 'low';
  if (score >= 16) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}


export default function EditAssignmentsScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' &&
      /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const {
    staff: scheduleStaff,
    participants: scheduleParts,
    assignments,
    workingStaff,
    attendingParticipants,
    trainingStaffToday = [],
    updateSchedule,
  } = useSchedule() as any;
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

  const [ratingLookup, setRatingLookup] = React.useState<Record<string, any>>(
    {},
  );

  const [participantLookup, setParticipantLookup] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    let cancelled = false;

    async function loadRatings() {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select(
            'id,legacy_id,name,experience_level,behaviour_capability,personal_care_skill,mobility_assistance,communication_support,reliability_rating',
          );

        if (error || !data || cancelled) return;

        const map: Record<string, any> = {};
        (data as any[]).forEach((row) => {
          if (!row) return;

          const uuidKey = row.id ? String(row.id) : null;
          const legacyKey = row.legacy_id ? String(row.legacy_id) : null;
          const nameKey =
            row.name && typeof row.name === 'string'
              ? `name:${row.name.toLowerCase()}`
              : null;

          if (uuidKey) map[uuidKey] = row;
          if (legacyKey) map[legacyKey] = row;
          if (nameKey) map[nameKey] = row;
        });

        if (!cancelled) {
          setRatingLookup(map);
        }
      } catch (e) {
        console.warn('[assignments] failed to load staff ratings', e);
      }
    }

    loadRatings();

    return () => {
      cancelled = true;
    };
  }, []);

React.useEffect(() => {
    let cancelled = false;

    async function loadParticipantRatings() {
      try {
        const { data, error } = await supabase
          .from('participants')
          .select(
            'id,name,behaviours,personal_care,communication,sensory,social,community,safety',
          );

        if (error || !data || cancelled) return;

        const map: Record<string, any> = {};
        (data as any[]).forEach((row) => {
          if (!row || !row.name) return;

          const uuidKey = row.id ? String(row.id) : null;
          const nameKey = `name:${String(row.name).toLowerCase()}`;

          if (uuidKey) map[uuidKey] = row;
          if (nameKey) map[nameKey] = row;
        });

        if (!cancelled) {
          setParticipantLookup(map);
        }
      } catch (e) {
        console.warn('[assignments] failed to load participant ratings', e);
      }
    }

    loadParticipantRatings();

    return () => {
      cancelled = true;
    };
  }, []);

  const trainingSet = React.useMemo(
    () => new Set<ID>((trainingStaffToday as ID[]) || []),
    [trainingStaffToday],
  );

  // Ensure training staff do not keep participant assignments
  React.useEffect(() => {
    if (!assignments) return;
    if (!trainingStaffToday || !(trainingStaffToday as ID[]).length) return;

    const trainingIds = new Set<ID>((trainingStaffToday as ID[]) || []);
    const current = assignments as Record<ID, ID[]>;
    let changed = false;
    const next: Record<ID, ID[]> = {};

    Object.entries(current).forEach(([sid, pids]) => {
      if (!Array.isArray(pids)) return;
      const key = sid as ID;
      if (trainingIds.has(key)) {
        if ((pids as ID[]).length > 0) changed = true;
        return;
      }
      next[key] = pids as ID[];
    });

    if (changed) {
      updateSchedule({ assignments: next });
    }
  }, [assignments, trainingStaffToday, updateSchedule]);

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
    if (readOnly) {
      push('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
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
          color="#4862f1b3"
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

                const nameKey = `name:${String(st.name || '').toLowerCase()}`;
                const ratingSource =
                  ratingLookup[staffId as ID] ?? ratingLookup[nameKey] ?? st;

                const score = getStaffScore(ratingSource);
                const band = getScoreBand(score);
                const showScore = score > 0;

                const isTraining = trainingSet.has(staffId);
                const canAssign = !isTraining;

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

                const cardStyles = [styles.card] as any[];
                if (isTraining) cardStyles.push(styles.cardTraining);

                return (
                  <View key={staffId} style={cardStyles}>
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.rect,
                          { backgroundColor: st.color || '#ddd' },
                        ]}
                      />
                      {showScore && (
                        <View
                          style={[
                            styles.scoreCircle,
                            band === 'senior' && styles.scoreCircleSenior,
                            band === 'mid' && styles.scoreCircleMid,
                            band === 'junior' && styles.scoreCircleJunior,
                          ]}
                        >
                          <Text style={styles.scoreText}>{score}</Text>
                        </View>
                      )}
                      <Text style={styles.staffName}>{st.name}</Text>
                      {isTraining ? (
                        <MaterialCommunityIcons
                          name="account-supervisor"
                          size={20}
                          color="#1C5F87"
                        />
                      ) : band === 'senior' ? (
                        <MaterialCommunityIcons
                          name="account-star"
                          size={20}
                          color="#FBBF24"
                        />
                      ) : null}
                    </View>

                    {isTraining ? (
                      <Text style={styles.trainingNote}>
                        Training today – no direct participant assignments.
                      </Text>
                    ) : staffAssigned.length > 0 ? (
                      <Text style={styles.assignedSummary}>
                        Assigned: {assignedNames}
                      </Text>
                    ) : null}

                    <View style={styles.chipWrap}>
                      {availablePids.map((pid) => {
                        const isAssigned = staffAssigned.includes(pid);
                        const part = partsById.get(pid);
                        const partName = part?.name || '—';
                        const partNameKey = `name:${String(partName).toLowerCase()}`;
                        const ratingRow =
                          participantLookup[pid as ID] ??
                          participantLookup[partNameKey];
                        const partScore = getParticipantScore(ratingRow);
                        const partBand =
                          partScore > 0 ? getParticipantBand(partScore) : 'low';
                        const chipLabel =
                          partScore > 0 ? `${partName} ${partScore}` : partName;

                        return (
                          <TouchableOpacity
                            key={pid}
                            onPress={
                              canAssign
                                ? () => handleToggle(staffId, pid)
                                : undefined
                            }
                            disabled={!canAssign}
                            activeOpacity={0.85}
                            style={[
                              styles.chip,
                              isAssigned && styles.chipSel,
                              !canAssign && styles.chipDisabled,
                              !isAssigned &&
                                partScore > 0 &&
                                partBand === 'low' &&
                                styles.chipLow,
                              !isAssigned &&
                                partScore > 0 &&
                                partBand === 'medium' &&
                                styles.chipMedium,
                              !isAssigned &&
                                partScore > 0 &&
                                partBand === 'high' &&
                                styles.chipHigh,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipTxt,
                                isAssigned && styles.chipTxtSel,
                              ]}
                              numberOfLines={1}
                            >
                              {chipLabel}
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
    fontSize: 24,
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
  cardTraining: {
    opacity: 0.75,
    backgroundColor: '#F9FAFB',
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
  scoreCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  scoreCircleJunior: {
    backgroundColor: '#BFDBFE',
  },
  scoreCircleMid: {
    backgroundColor: '#FDE68A',
  },
  scoreCircleSenior: {
    backgroundColor: '#C4B5FD',
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  trainingNote: {
    fontSize: 12,
    color: '#7a688c',
    marginBottom: 2,
    fontStyle: 'italic',
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
  chipLow: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  chipMedium: {
    borderColor: '#facc15',
    backgroundColor: '#fef9c3',
  },
  chipHigh: {
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
  },
  chipDisabled: {
    opacity: 0.5,
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
