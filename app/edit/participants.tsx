// app/edit/participants.tsx
// Edit screen for attending participants with participant pool.
// Integrates with outings: participants on outing are shown as outline pills.
import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

import { useSchedule } from '@/hooks/schedule-store';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import { PARTICIPANTS as STATIC_PARTICIPANTS } from '@/constants/data';
import SaveExit from '@/components/SaveExit';
import Chip from '@/components/Chip';

type ID = string;

const MAX_WIDTH = 880;

const makePartMap = () => {
  const map: Record<string, any> = {};
  STATIC_PARTICIPANTS.forEach((p) => {
    map[p.id] = p;
  });
  return map;
};


const sortByName = (list: any[]) =>
  list.slice().sort((a, b) => a.name.localeCompare(b.name));

// ---- Ratings + behaviour helpers ----

type ParticipantRatingRow = {
  id: string;
  behaviours?: number | null;
  personal_care?: number | null;
  communication?: number | null;
  sensory?: number | null;
  social?: number | null;
  community?: number | null;
  safety?: number | null;
};

type ParticipantRating = {
  behaviours?: number | null;
  personal_care?: number | null;
  communication?: number | null;
  sensory?: number | null;
  social?: number | null;
  community?: number | null;
  safety?: number | null;
};

function getParticipantTotalScore(member: ParticipantRating | any): number | null {
  if (!member) return null;

  const values = [
    member.behaviours,
    member.personal_care,
    member.communication,
    member.sensory,
    member.social,
    member.community,
    member.safety,
  ].filter(
    (v: any): v is number =>
      typeof v === 'number' && !Number.isNaN(v),
  );

  if (!values.length) return null;
  return values.reduce((sum: number, v: number) => sum + v, 0);
}

function getParticipantScoreLevel(total: number): 'low' | 'medium' | 'high' {
  // Same bands as Participants Settings: 7–21
  if (total >= 16) return 'high';
  if (total >= 10) return 'medium';
  return 'low';
}

function BehaviourMeter({ value }: { value?: number | null }) {
  // behaviours is 1–3 from Supabase, but we show 5 segments:
  // 1 = 2 green segments, 2 = 3 amber segments, 3 = 5 red/orange segments.
  const raw = typeof value === 'number' ? value : 0;
  const clamped = Math.max(0, Math.min(3, raw));

  let filledSegments = 0;
  if (clamped === 1) filledSegments = 2;
  else if (clamped === 2) filledSegments = 3;
  else if (clamped === 3) filledSegments = 5;

  return (
    <View style={styles.behaviourMeter}>
      {[1, 2, 3, 4, 5].map((level) => {
        const isFilled = level <= filledSegments;

        let extraStyle = null;
        if (!isFilled) {
          extraStyle = styles.behaviourSegmentOff;
        } else if (clamped === 1) {
          extraStyle = styles.behaviourSegmentLow;
        } else if (clamped === 2) {
          extraStyle = styles.behaviourSegmentMedium;
        } else if (clamped === 3) {
          extraStyle = styles.behaviourSegmentHigh;
        }

        return (
          <View
            key={level}
            style={[styles.behaviourSegment, extraStyle]}
          />
        );
      })}
    </View>
  );
}



export default function EditParticipantsScreen() {
  const { width } = useWindowDimensions();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const [ratingMap, setRatingMap] = useState<Record<string, ParticipantRatingRow>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadRatings() {
      const { data, error } = await supabase
        .from('participants')
        .select('id, behaviours, personal_care, communication, sensory, social, community, safety');
      if (!isMounted || !data) return;
      const map: Record<string, ParticipantRatingRow> = {};
      (data as any[]).forEach((row) => {
        map[row.id] = row as ParticipantRatingRow;
      });
      setRatingMap(map);
    }
    loadRatings();
    return () => {
      isMounted = false;
    };
  }, []);

  const {
    participants,
    attendingParticipants = [],
    outingGroup,
    updateSchedule,
  } = useSchedule() as any;

  const { push } = useNotifications();

  const partById = useMemo(makePartMap, []);

  // Prefer Supabase participants snapshot when available so we get live ratings.
  const participantsSource = (participants && participants.length
    ? participants
    : STATIC_PARTICIPANTS) as any[];

  const allParts = useMemo(
    () => sortByName(participantsSource.slice()),
    [participantsSource]
  );

  const attendingSet = useMemo(
    () => new Set<string>((attendingParticipants ?? []) as string[]),
    [attendingParticipants]
  );

  const attendingList = useMemo(
    () =>
      allParts.filter((p) => attendingSet.has(p.id as ID)),
    [allParts, attendingSet]
  );

  const poolList = useMemo(
    () =>
      allParts.filter((p) => !attendingSet.has(p.id as ID)),
    [allParts, attendingSet]
  );

  const outingParticipantSet = useMemo(
    () => new Set<string>(outingGroup?.participantIds ?? []),
    [outingGroup]
  );

  const toggleParticipant = (id: ID) => {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    const current = new Set<string>(attendingParticipants as ID[]);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    const next = Array.from(current);
    updateSchedule?.({ attendingParticipants: next });
    // 🔔 Toast for participant changes
    push?.('Attending participants updated', 'participants');
  };

  const contentWidth = Math.min(width - 32, MAX_WIDTH);
  const isMobileWeb = Platform.OS === 'web' && width < 768;

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="participants" />

      {/* Web-only hero icon for Participants */}
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="happy-outline"
          size={220}
          color="#5DBBFA"
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { width: contentWidth }]}>
          <Text style={styles.title}>Attending Participants</Text>
          <Text style={styles.subtitle}>
            Tap participants to mark who is attending at B2 today. Attending participants
            show up in Assignments, Floating, Pickups and Dropoffs screens.
          </Text>

          <Text style={styles.sectionTitle}>Attending</Text>
          {attendingList.length === 0 ? (
            <Text style={styles.empty}>No participants have been selected yet.</Text>
          ) : (
            <View style={styles.attendingGrid}>
              {attendingList.map((p) => {
                const isOutOnOuting = outingParticipantSet.has(p.id as ID);
                const mode = isOutOnOuting ? 'offsite' : 'onsite';

                const rating = ratingMap[p.id as ID];
                const total = rating ? getParticipantTotalScore(rating) : null;
                const level =
                  total !== null ? getParticipantScoreLevel(total) : null;

                const scoreStyles = [styles.scoreBubble];
                if (level === 'low') scoreStyles.push(styles.scoreBubbleLow);
                if (level === 'medium') scoreStyles.push(styles.scoreBubbleMedium);
                if (level === 'high') scoreStyles.push(styles.scoreBubbleHigh);

                return (
                  <TouchableOpacity
                    key={p.id as ID}
                    activeOpacity={0.85}
                    onPress={() => toggleParticipant(p.id as ID)}
                    style={[
                      styles.attendingPill,
                      mode === 'offsite'
                        ? styles.attendingPillOffsite
                        : styles.attendingPillOnsite,
                    ]}
                  >
                    <View style={styles.attendingPillContent}>
                      <View style={styles.attendingHeaderRow}>
                        <Text
                          style={[
                            styles.attendingName,
                            mode === 'offsite' && styles.attendingNameOffsite,
                          ]}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                        {total !== null && (
                          <View style={scoreStyles}>
                            <Text style={styles.scoreBubbleText}>{total}</Text>
                          </View>
                        )}
                      </View>
                      <BehaviourMeter value={ratingMap[p.id as ID]?.behaviours ?? null} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Participant Pool
          </Text>
          {poolList.length === 0 ? (
            <Text style={styles.empty}>Everyone is attending today.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {poolList.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  mode="default"
                  onPress={() => toggleParticipant(p.id as ID)}
                />
              ))}
            </View>
          )}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendOnsite]} />
              <Text style={styles.legendLabel}>On-site</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendOffsite]} />
              <Text style={styles.legendLabel}>On outing</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E0F2FE',
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 160,
  },
  inner: {
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0F172A',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empty: {
    fontSize: 13,
    opacity: 0.75,
    color: '#64748B',
  },

  // Attending grid with score + pill
  attendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  attendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    width: 148,
  },
  attendingPillOnsite: {
    backgroundColor: '#F54FA5',
    borderColor: '#F54FA5',
  },
  attendingPillOffsite: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F54FA5',
  },
  attendingPillContent: {
    flex: 1,
  },
  attendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  attendingName: {

    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 6,
  },
  attendingNameOffsite: {
    color: '#F54FA5',
  },

  // 5‑segment behaviour meter inside pill
  behaviourMeter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  behaviourSegment: {
    width: 4,
    height: 10,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  behaviourSegmentOff: {
    backgroundColor: '#E5E7EB',
  },
  behaviourSegmentLow: {
    backgroundColor: '#4ADE80', // green for low‑risk
  },
  behaviourSegmentMedium: {
    backgroundColor: '#FACC15', // amber for medium‑risk
  },
  behaviourSegmentHigh: {
    backgroundColor: '#F97316', // orange‑red for high‑risk
  },
// Score bubble on left of pill
  scoreBubble: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e7dff2',
    backgroundColor: '#f8f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  scoreBubbleLow: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  scoreBubbleMedium: {
    backgroundColor: '#fef9c3',
    borderColor: '#feea55',
  },
  scoreBubbleHigh: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  scoreBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#332244',
  },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
  },
  legendOnsite: {
    backgroundColor: '#F54FA5',
    borderColor: '#F54FA5',
  },
  legendOffsite: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F54FA5',
  },
  legendLabel: {
    fontSize: 12,
    color: '#0F172A',
  },
});
