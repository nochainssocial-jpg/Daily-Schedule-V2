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
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSchedule } from '@/hooks/schedule-store';
import {
  STAFF as STATIC_STAFF,
  PARTICIPANTS as STATIC_PARTS,
} from '@/constants/data';
import { getRiskBand, SCORE_BUBBLE_STYLES } from '@/constants/ratingsTheme';
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

type ParticipantBand = 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh';

type ParticipantProfileHover = {
  id: ID;
  name: string;
  band: ParticipantBand;
  score: number;
  row: any | null;
};

function getParticipantBand(score: number): ParticipantBand {
  if (!score || score <= 0) return 'veryLow';
  if (score <= 5) return 'veryLow';
  if (score <= 10) return 'low';
  if (score <= 15) return 'medium';
  if (score <= 20) return 'high';
  return 'veryHigh';
}

// Behaviour risk from behaviours 1–3
function getBehaviourRisk(
  behaviours?: number | null,
): 'low' | 'medium' | 'high' | null {
  if (typeof behaviours !== 'number') return null;
  if (behaviours <= 1) return 'low';
  if (behaviours === 2) return 'medium';
  if (behaviours >= 3) return 'high';
  return null;
}

// ---- Outing phase helpers (short vs long, active vs complete) ----

type OutingGroup = {
  name?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  staffIds?: (string | number)[];
  participantIds?: (string | number)[];
};

type OutingPhase = 'none' | 'activeShort' | 'completeShort' | 'activeLong';

const SHORT_OUTING_THRESHOLD_MINUTES = 14 * 60; // 14:00

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Expect formats like "10:30" or "9:05"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function getOutingPhase(outingGroup: OutingGroup | null | undefined): OutingPhase {
  if (!outingGroup) return 'none';

  const staffCount = outingGroup.staffIds?.length ?? 0;
  const participantCount = outingGroup.participantIds?.length ?? 0;
  if (staffCount === 0 && participantCount === 0) return 'none';

  const startMinutes = parseTimeToMinutes(outingGroup.startTime);
  const endMinutes = parseTimeToMinutes(outingGroup.endTime);

  // No valid end time = treat as "out for the day"
  if (endMinutes === null) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (startMinutes !== null && nowMinutes < startMinutes) {
      return 'none';
    }
    return 'activeLong';
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // If there's a future start time, nothing yet
  if (startMinutes !== null && nowMinutes < startMinutes) {
    return 'none';
  }

  const isShortOuting = endMinutes < SHORT_OUTING_THRESHOLD_MINUTES;

  if (!isShortOuting) {
    // Long outing (ends at/after 14:00) – treat as "out for day" once started
    return 'activeLong';
  }

  // Short outing (< 14:00)
  if (nowMinutes <= endMinutes) {
    return 'activeShort';
  }

  // After end time of a short outing → complete, staff/participants back onsite
  return 'completeShort';
}

export default function EditAssignmentsScreen() {
  const { width, height } = useWindowDimensions();

  // Treat "mobile web" as actual mobile browsers (iPhone / Android) only.
  // Hover-based profile modals remain enabled on desktop / laptop web.
  const isMobileWeb =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPhone|Android/i.test(navigator.userAgent);

  const enableHover = Platform.OS === 'web' && !isMobileWeb;

  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const {
    staff: scheduleStaff,
    participants: scheduleParts,
    assignments,
    workingStaff,
    attendingParticipants,
    trainingStaffToday = [],
    outingGroup, // read outing group for offsite state
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

  const [participantLookup, setParticipantLookup] =
    React.useState<Record<string, any>>({});

  const [hoveredProfile, setHoveredProfile] =
    React.useState<ParticipantProfileHover | null>(null);

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
            'id,name,behaviours,personal_care,communication,sensory,social,community,safety,about_intro,about_likes,about_dislikes,about_support,about_safety,about_pdf_url',
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

  // Canonical assignments (in store): participantId -> staffId | null
  const assignmentsMap: Record<ID, ID | null> = (assignments || {}) as any;

  const attendingIds: ID[] =
    (attendingParticipants && attendingParticipants.length
      ? (attendingParticipants as ID[])
      : partsSource.map((p) => p.id as ID)) || [];

  const attendingSet = new Set(attendingIds);

  const staffById = new Map(staffSource.map((s) => [s.id, s]));
  const partsById = new Map(partsSource.map((p) => [p.id, p]));

  // Offsite participants from outingGroup (IDs only)
  const offsiteParticipantIds = React.useMemo(() => {
    const set = new Set<ID>();
    const og = outingGroup as any;
    if (og && Array.isArray(og.participantIds)) {
      og.participantIds.forEach((id: any) => {
        set.add(String(id) as ID);
      });
    }
    return set;
  }, [outingGroup]);

  // Outing phase: only treat as offsite while outing is active (short or long)
  const outingStaffCount = outingGroup?.staffIds?.length ?? 0;
  const outingParticipantCount = outingGroup?.participantIds?.length ?? 0;
  const hasOutingBase =
    !!outingGroup && (outingStaffCount > 0 || outingParticipantCount > 0);

  const outingPhase: OutingPhase = hasOutingBase
    ? getOutingPhase(outingGroup)
    : 'none';

  const outingIsActive =
    outingPhase === 'activeShort' || outingPhase === 'activeLong';

  // Ensure training staff do not keep participant assignments
  React.useEffect(() => {
    if (!assignmentsMap) return;
    if (!trainingStaffToday || !(trainingStaffToday as ID[]).length) return;

    const trainingIds = new Set<ID>((trainingStaffToday as ID[]) || []);
    const current = assignmentsMap as Record<ID, ID | null>;
    let changed = false;
    const next: Record<ID, ID | null> = { ...current };

    Object.entries(current).forEach(([pid, sid]) => {
      if (!sid) return;
      if (trainingIds.has(sid as ID)) {
        next[pid as ID] = null;
        changed = true;
      }
    });

    if (changed) {
      updateSchedule({ assignments: next });
    }
  }, [assignmentsMap, trainingStaffToday, updateSchedule]);

  // Helper: current owner for a participant (if any)
  const getOwner = (participantId: ID): ID | null => {
    const sid = assignmentsMap[participantId];
    return sid ? (sid as ID) : null;
  };

  const handleToggle = (staffId: ID, participantId: ID) => {
    if (readOnly) {
      push('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }

    const current = (assignmentsMap || {}) as Record<ID, ID | null>;
    const next: Record<ID, ID | null> = { ...current };

    const currentOwner = getOwner(participantId);

    // If this staff already owns the participant, unassign them
    if (currentOwner && currentOwner === staffId) {
      next[participantId] = null;
    } else {
      // Move participant from any previous owner to this staff
      next[participantId] = staffId;
    }

    updateSchedule({ assignments: next });
    push('Team daily assignments updated', 'assignments');
  };

  const renderProfileModal = () => {
    if (!hoveredProfile || !enableHover) return null;

    const { band, score, name, row } = hoveredProfile;
    const intro = row?.about_intro || '';
    const likes = row?.about_likes || '';
    const dislikes = row?.about_dislikes || '';
    const support = row?.about_support || '';
    const safety = row?.about_safety || '';
    const pdfUrl = row?.about_pdf_url || '';
    const behaviours = row?.behaviours ?? null;

    const behaviourRisk = getBehaviourRisk(
      typeof behaviours === 'number' ? behaviours : Number(behaviours ?? 0),
    );

    let riskLabel = '';
    if (behaviourRisk === 'low') riskLabel = 'Low';
    if (behaviourRisk === 'medium') riskLabel = 'Medium';
    if (behaviourRisk === 'high') riskLabel = 'High';

    let riskDescription = '';
    if (behaviourRisk === 'high') {
      riskDescription =
        'Behaviour Risks (self-injurious behaviour, physical aggression towards others, impulsive behaviour with limited awareness of risk to self).';
    } else if (behaviourRisk === 'medium') {
      riskDescription =
        'Behaviour Risks (intermittent or situation-based behaviours of concern that may require more experienced staff in some activities).';
    } else if (behaviourRisk === 'low') {
      riskDescription =
        'Behaviour Risks (low level behaviours of concern that can usually be managed with general support, structure, and redirection).';
    }

    const domains: Array<{ key: keyof any; label: string; icon: any }> = [
      { key: 'personal_care', label: 'Personal care', icon: 'shower' },
      {
        key: 'communication',
        label: 'Communication',
        icon: 'message-text-outline',
      },
      { key: 'sensory', label: 'Sensory', icon: 'eye-circle' },
      { key: 'social', label: 'Social', icon: 'account-group' },
      {
        key: 'community',
        label: 'Community',
        icon: 'city-variant-outline',
      },
      { key: 'safety', label: 'Safety', icon: 'shield-check' },
    ];

    const modalStyles: any[] = [styles.profileModal];

    // Position the card in the left-hand gap: centre between screen edge and content.
    const leftGap = Math.max(0, (width - MAX_WIDTH) / 2);
    let modalWidth = Math.min(420, Math.max(320, leftGap - 32));
    if (!Number.isFinite(modalWidth) || modalWidth <= 0) {
      modalWidth = 400;
    }
    const centreX = leftGap / 2;
    const left = Math.max(16, centreX - modalWidth / 2);

    modalStyles.push({
      left,
      top: 140,
      width: modalWidth,
    });

    if (band === 'veryLow') modalStyles.push(styles.profileModalVeryLow);
    if (band === 'low') modalStyles.push(styles.profileModalLow);
    if (band === 'medium') modalStyles.push(styles.profileModalMedium);
    if (band === 'high') modalStyles.push(styles.profileModalHigh);
    if (band === 'veryHigh') modalStyles.push(styles.profileModalVeryHigh);

    const getDomainValue = (key: keyof any): number | null => {
      if (!row) return null;
      const raw = (row as any)[key];
      const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const renderDomainBubble = (value: number | null) => {
      if (!value) {
        return (
          <View style={[styles.domainBubble, styles.domainBubbleEmpty]}>
            <Text style={styles.domainBubbleText}>-</Text>
          </View>
        );
      }

      const bubbleStyles: any[] = [styles.domainBubble];
      if (value === 1) bubbleStyles.push(styles.domainBubbleLow);
      if (value === 2) bubbleStyles.push(styles.domainBubbleMedium);
      if (value === 3) bubbleStyles.push(styles.domainBubbleHigh);

      return (
        <View style={bubbleStyles}>
          <Text style={styles.domainBubbleText}>{value}</Text>
        </View>
      );
    };

    return (
      <View style={modalStyles} pointerEvents="box-none">
        <View style={styles.profileHeaderRow}>
          <View style={styles.profileHeaderLeft}>
            <Text style={styles.profileName}>{name}</Text>
            {score > 0 && (
              <View
                style={[
                  styles.scoreBubble,
                  band === 'veryLow' && styles.scoreBubbleVeryLow,
                  band === 'low' && styles.scoreBubbleLow,
                  band === 'medium' && styles.scoreBubbleMedium,
                  band === 'high' && styles.scoreBubbleHigh,
                  band === 'veryHigh' && styles.scoreBubbleVeryHigh,
                  styles.profileScoreBubble,
                ]}
              >
                <Text style={styles.scoreBubbleText}>{score}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setHoveredProfile(null)}
            style={styles.profileCloseButton}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={16} color="#4b5563" />
          </TouchableOpacity>
        </View>

        {/* Behaviour risk row */}
        <View style={styles.profileMetaRow}>
          <Text style={styles.profileMetaLabel}>Behaviour risk</Text>
          {behaviourRisk ? (
            <View
              style={[
                styles.riskBadge,
                behaviourRisk === 'low' && styles.riskBadgeLow,
                behaviourRisk === 'medium' && styles.riskBadgeMedium,
                behaviourRisk === 'high' && styles.riskBadgeHigh,
              ]}
            >
              <Text style={styles.riskBadgeText}>
                {riskLabel.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : (
            <Text style={styles.profileMetaValue}>Not rated</Text>
          )}
        </View>
        {!!riskDescription && (
          <Text style={styles.profileMetaNote}>{riskDescription}</Text>
        )}

        {/* Complexity rating row */}
        <View style={[styles.profileMetaRow, { marginTop: 6 }]}>
          <Text style={styles.profileMetaLabel}>Complexity rating</Text>
        </View>
        <View style={styles.profileDomainRow}>
          {domains.map((d) => {
            const value = getDomainValue(d.key);
            return (
              <View key={String(d.key)} style={styles.profileDomainItem}>
                <MaterialCommunityIcons
                  name={d.icon}
                  size={22}
                  color="#0F172A"
                  style={styles.profileDomainIcon}
                />
                <Text style={styles.profileDomainLabel}>{d.label}</Text>
                {renderDomainBubble(value)}
              </View>
            );
          })}
        </View>

        {/* Scrollable description section */}
        <View style={styles.profileScrollShell}>
          <ScrollView
            style={styles.profileScroll}
            contentContainerStyle={styles.profileScrollContent}
          >
            {!!intro && (
              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>Overview</Text>
                <Text style={styles.profileText}>{intro}</Text>
              </View>
            )}

            {!!likes && (
              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>Likes</Text>
                <Text style={styles.profileText}>{likes}</Text>
              </View>
            )}

            {!!dislikes && (
              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>Dislikes / triggers</Text>
                <Text style={styles.profileText}>{dislikes}</Text>
              </View>
            )}

            {!!support && (
              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>Support strategies</Text>
                <Text style={styles.profileText}>{support}</Text>
              </View>
            )}

            {!!safety && (
              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>Safety notes</Text>
                <Text style={styles.profileText}>{safety}</Text>
              </View>
            )}

            {!!pdfUrl && (
              <TouchableOpacity
                style={styles.profilePdfButton}
                onPress={() => Linking.openURL(pdfUrl)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={18}
                  color="#BE123C"
                />
                <Text style={styles.profilePdfButtonText}>
                  View full profile PDF
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    );
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
                const showScore = isAdmin && score > 0;

                const isTraining = trainingSet.has(staffId);
                const canAssign = !isTraining;

                // All participants currently assigned to this staff
                const staffAssigned = attendingIds.filter(
                  (pid) => assignmentsMap[pid] === staffId,
                ) as ID[];

                const assignedNames = staffAssigned
                  .map((pid) => partsById.get(pid)?.name)
                  .filter(Boolean)
                  .join(', ');

                // Participants this staff can see & tap:
                // - attending
                // - either unassigned or currently owned by this staff
                const availablePids = attendingIds.filter((pid) => {
                  const owner = assignmentsMap[pid];
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
                      {isAdmin &&
                        (isTraining ? (
                          <MaterialCommunityIcons
                            name="account-supervisor"
                            size={24}
                            color="#1C5F87"
                          />
                        ) : band === 'senior' ? (
                          <MaterialCommunityIcons
                            name="account-star"
                            size={24}
                            color="#FBBF24"
                          />
                        ) : null)}
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
                        const partNameKey = `name:${String(
                          partName,
                        ).toLowerCase()}`;
                        const ratingRow =
                          participantLookup[pid as ID] ??
                          participantLookup[partNameKey];
                        const partScore = getParticipantScore(ratingRow);
                        const partBand =
                          partScore > 0 ? getParticipantBand(partScore) : 'low';

                        const behaviourRisk = ratingRow
                          ? getBehaviourRisk((ratingRow as any).behaviours)
                          : null;

                        let riskLetter = '';
                        if (behaviourRisk === 'low') riskLetter = 'L';
                        else if (behaviourRisk === 'medium') riskLetter = 'M';
                        else if (behaviourRisk === 'high') riskLetter = 'H';

                        // Offsite only while outing is active (short or long)
                        const isOffsite =
                          outingIsActive && offsiteParticipantIds.has(pid);

                        const handleMouseEnter = () => {
                          if (!enableHover) return;
                          setHoveredProfile({
                            id: pid as ID,
                            name: partName,
                            band: partBand,
                            score: partScore,
                            row: ratingRow ?? null,
                          });
                        };

                        return (
                          <TouchableOpacity
                            key={pid}
                            onPress={
                              canAssign ? () => handleToggle(staffId, pid) : undefined
                            }
                            disabled={!canAssign}
                            activeOpacity={0.85}
                            onMouseEnter={handleMouseEnter}
                            style={[
                              styles.chip,
                              isAssigned && styles.chipSel,
                              !canAssign && styles.chipDisabled,
                              !isAssigned &&
                                partScore > 0 &&
                                (partBand === 'veryLow' || partBand === 'low') &&
                                styles.chipLow,
                              !isAssigned &&
                                partScore > 0 &&
                                partBand === 'medium' &&
                                styles.chipMedium,
                              !isAssigned &&
                                partScore > 0 &&
                                (partBand === 'high' || partBand === 'veryHigh') &&
                                styles.chipHigh,
                              // Offsite participants: white pill, keep border colour
                              isOffsite && styles.chipOffsite,
                            ]}
                          >
                            {/* Name */}
                            <Text
                              style={[
                                styles.chipTxt,
                                isAssigned && styles.chipTxtSel,
                                isOffsite && styles.chipTxtOffsite,
                              ]}
                              numberOfLines={1}
                            >
                              {partName}
                            </Text>

                            {/* Behaviour risk dial L/M/H */}
                            {behaviourRisk && (
                              <View
                                style={[
                                  styles.riskBadge,
                                  behaviourRisk === 'low' && styles.riskBadgeLow,
                                  behaviourRisk === 'medium' &&
                                    styles.riskBadgeMedium,
                                  behaviourRisk === 'high' && styles.riskBadgeHigh,
                                ]}
                              >
                                <Text style={styles.riskBadgeText}>
                                  {riskLetter}
                                </Text>
                              </View>
                            )}

                            {/* Total score bubble */}
                            {partScore > 0 && (
                              <View
                                style={[
                                  styles.scoreBubble,
                                  partBand === 'veryLow' &&
                                    styles.scoreBubbleVeryLow,
                                  partBand === 'low' &&
                                    styles.scoreBubbleLow,
                                  partBand === 'medium' &&
                                    styles.scoreBubbleMedium,
                                  partBand === 'high' &&
                                    styles.scoreBubbleHigh,
                                  partBand === 'veryHigh' &&
                                    styles.scoreBubbleVeryHigh,
                                ]}
                              >
                                <Text style={styles.scoreBubbleText}>
                                  {partScore}
                                </Text>
                              </View>
                            )}

                            {/* Check if assigned */}
                            {isAssigned && (
                              <Text
                                style={[
                                  styles.checkMark,
                                  isOffsite && styles.checkMarkOffsite,
                                ]}
                              >
                                ✓
                              </Text>
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
      {renderProfileModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  profileModal: {
    position: 'absolute',
    zIndex: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5d6ff',
    padding: 12,
    backgroundColor: '#fef2f2',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  profileModalVeryLow: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  profileModalLow: {
    backgroundColor: '#dcfce7',
    borderColor: '#a7f3d0',
  },
  profileModalMedium: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  profileModalHigh: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  profileModalVeryHigh: {
    backgroundColor: '#fee2e2',
    borderColor: '#fb7185',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
  },
  profileCloseButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
    marginRight: 8,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  profileMetaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginRight: 6,
  },
  profileMetaValue: {
    fontSize: 12,
    color: '#4b5563',
  },
  profileMetaNote: {
    fontSize: 11,
    color: '#4b5563',
    marginTop: 2,
  },
  profileDomainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 4,
    marginBottom: 4,
  },
  profileDomainItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
    minHeight: 64,
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  profileDomainIcon: {
    marginBottom: 2,
  },
  profileDomainLabel: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 2,
    textAlign: 'center',
  },
  domainBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  domainBubbleEmpty: {
    backgroundColor: '#f9fafb',
  },
  domainBubbleLow: {
    borderColor: '#22C55E',
  },
  domainBubbleMedium: {
    borderColor: '#EAB308',
  },
  domainBubbleHigh: {
    borderColor: '#EF4444',
  },
  domainBubbleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  profileScrollShell: {
    marginTop: 6,
    maxHeight: 320,
  },
  profileScroll: {
    borderRadius: 12,
  },
  profileScrollContent: {
    paddingBottom: 8,
  },
  profileSection: {
    marginBottom: 6,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  profileText: {
    fontSize: 11,
    color: '#111827',
  },
  profilePdfButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fecaca',
  },
  profilePdfButtonText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#7f1d1d',
  },

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
    fontSize: 16,
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
    fontSize: 14,
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
  // Participant rating bubbles (match Participants screen)
  scoreBubble: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#e7dff2',
    backgroundColor: '#f8f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Very low (0–5)
  scoreBubbleVeryLow: {
    backgroundColor: '#ecfdf3',
    borderColor: '#22C55E',
  },
  // Low (6–10)
  scoreBubbleLow: {
    backgroundColor: '#fefce8',
    borderColor: '#EAB308',
  },
  // Medium (11–15)
  scoreBubbleMedium: {
    backgroundColor: '#fff7ed',
    borderColor: '#F97316',
  },
  // High (16–20)
  scoreBubbleHigh: {
    backgroundColor: '#fee2e2',
    borderColor: '#FB7185',
  },
  // Very high (21+)
  scoreBubbleVeryHigh: {
    backgroundColor: '#fee2e2',
    borderColor: '#EF4444',
  },
  scoreBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#332244',
  },

  riskBadge: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskBadgeLow: {
    backgroundColor: '#22C55E',
  },
  riskBadgeMedium: {
    backgroundColor: '#F97316',
  },
  riskBadgeHigh: {
    backgroundColor: '#EF4444',
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
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
  // Offsite: white pill, keep border colour from risk band or default
  chipOffsite: {
    backgroundColor: '#FFFFFF',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipSel: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
  },
  chipTxtSel: {
    color: '#FFFFFF',
  },
  chipTxtOffsite: {
    color: '#101828', // dark text when offsite (overrides white)
  },
  checkMark: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  checkMarkOffsite: {
    color: '#111827',
  },
  profileScoreBubble: {
    backgroundColor: '#FFFFFF',
  },
});
