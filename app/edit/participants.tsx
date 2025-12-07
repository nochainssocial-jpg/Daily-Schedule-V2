// app/edit/participants.tsx
// Edit screen for attending participants with participant pool.
// Integrates with outings: participants on outing are shown as outline pills.
import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

import { useSchedule } from '@/hooks/schedule-store';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import { PARTICIPANTS as STATIC_PARTICIPANTS } from '@/constants/data';
import {
  getRiskBand,
  MAX_PARTICIPANT_SCORE,
  RISK_GRADIENT_COLORS,
  SCORE_BUBBLE_STYLES,
} from '@/constants/ratingsTheme';
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
  // Delegate to shared participant risk bands (0–35)
  return getRiskBand(total);
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

/**
 * Gradient meter driven by TOTAL participant score:
 * - totalScore: 0–35 (7 criteria × 5)
 * - fill = totalScore / 35 (clamped 0–1)
 * - gradient compressed so red only appears toward the end
 */
function BehaviourMeter({ totalScore }: { totalScore?: number | null }) {
  const rawTotal = typeof totalScore === 'number' ? totalScore : 0;
  const maxScore = MAX_PARTICIPANT_SCORE; // 7 criteria × 5
  const fraction = Math.max(0, Math.min(1, rawTotal / maxScore));

  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useRef(new Animated.Value(fraction)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: fraction,
      duration: 350,
      useNativeDriver: false, // animating width
    }).start();
  }, [fraction, progress]);

  // Width of the grey "mask" that hides the right side of the gradient
  const maskWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [trackWidth, 0], // 0% score = full mask, 100% = no mask
  });

  return (
    <View
      style={styles.behaviourTrack}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && (
        <>
          {/* Full-range gradient: 0 → 35 */}
          <LinearGradient
            colors={RISK_GRADIENT_COLORS} // green → yellow → red (shared theme)
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Grey mask from the right, hiding the unfilled portion */}
          <Animated.View style={[styles.behaviourMask, { width: maskWidth }]} />
        </>
      )}
    </View>
  );
}

export default function EditParticipantsScreen() {
  const { width } = useWindowDimensions();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const [ratingMap, setRatingMap] = useState<
    Record<string, ParticipantRatingRow>
  >({});

  useEffect(() => {
    let isMounted = true;
    async function loadRatings() {
      const { data } = await supabase
        .from('participants')
        .select(
          'id, name, behaviours, personal_care, communication, sensory, social, community, safety',
        );
      if (!isMounted || !data) return;

      const map: Record<string, ParticipantRatingRow> = {};
      (data as any[]).forEach((row) => {
        if (!row || !row.name) return;
        const nameKey = `name:${String(row.name).toLowerCase()}`;
        map[nameKey] = row as ParticipantRatingRow;
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
    [participantsSource],
  );

  const attendingSet = useMemo(
    () => new Set<string>((attendingParticipants ?? []) as string[]),
    [attendingParticipants],
  );

  const attendingList = useMemo(
    () => allParts.filter((p) => attendingSet.has(p.id as ID)),
    [allParts, attendingSet],
  );

  const poolList = useMemo(
    () => allParts.filter((p) => !attendingSet.has(p.id as ID)),
    [allParts, attendingSet],
  );

  const outingParticipantSet = useMemo(
    () => new Set<string>(outingGroup?.participantIds ?? []),
    [outingGroup],
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
            Tap participants to mark who is attending at B2 today. Attending
            participants show up in Assignments, Floating, Pickups and Dropoffs
            screens.
          </Text>

          <Text style={styles.sectionTitle}>Attending</Text>
          {attendingList.length === 0 ? (
            <Text style={styles.empty}>
              No participants have been selected yet.
            </Text>
          ) : (
            <View style={styles.attendingGrid}>
              {attendingList.map((p) => {
                const isOutOnOuting = outingParticipantSet.has(p.id as ID);
                const mode = isOutOnOuting ? 'offsite' : 'onsite';

                const nameKey = `name:${String(p.name || '').toLowerCase()}`;
                const rating = ratingMap[nameKey];
                const total = rating ? getParticipantTotalScore(rating) : null;
                const level =
                  total !== null ? getParticipantScoreLevel(total) : null;
                const behaviourRisk = rating
                  ? getBehaviourRisk(rating.behaviours)
                  : null;

                const scoreStyles = [styles.scoreBubble];
                if (level === 'low') scoreStyles.push(styles.scoreBubbleLow);
                if (level === 'medium')
                  scoreStyles.push(styles.scoreBubbleMedium);
                if (level === 'high') scoreStyles.push(styles.scoreBubbleHigh);

                let riskLetter = '';
                let riskStyle = styles.riskBadgeNeutral;
                if (behaviourRisk === 'low') {
                  riskLetter = 'L';
                  riskStyle = styles.riskBadgeLow;
                } else if (behaviourRisk === 'medium') {
                  riskLetter = 'M';
                  riskStyle = styles.riskBadgeMedium;
                } else if (behaviourRisk === 'high') {
                  riskLetter = 'H';
                  riskStyle = styles.riskBadgeHigh;
                }

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

                        <View style={styles.rightHeaderRow}>
                          {behaviourRisk && (
                            <View style={[styles.riskBadge, riskStyle]}>
                              <Text style={styles.riskBadgeText}>
                                {riskLetter}
                              </Text>
                            </View>
                          )}
                          {total !== null && (
                            <View style={scoreStyles}>
                              <Text style={styles.scoreBubbleText}>{total}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.behaviourMeterContainer}>
                        <BehaviourMeter totalScore={total} />
                      </View>
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

          {/* Legend: onsite/outing, then behaviour risk + overall score bands */}
          <Text style={[styles.sectionTitle, { marginTop: 48 }]}>
            Legend
          </Text>

          <View style={[styles.legend, styles.legendCentered]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendOnsite]} />
              <Text style={styles.legendLabel}>On-site</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendOffsite]} />
              <Text style={styles.legendLabel}>On outing</Text>
            </View>
          </View>

          <View style={[styles.legend, styles.legendCentered, { marginTop: 12 }]}>
            <View style={styles.legendItem}>
              <View style={[styles.riskBadge, styles.riskBadgeLow]}>
                <Text style={styles.riskBadgeText}>L</Text>
              </View>
              <Text style={styles.legendLabel}>Low Risk Behaviour</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.riskBadge, styles.riskBadgeMedium]}>
                <Text style={styles.riskBadgeText}>M</Text>
              </View>
              <Text style={styles.legendLabel}>Medium Risk Behaviour</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.riskBadge, styles.riskBadgeHigh]}>
                <Text style={styles.riskBadgeText}>H</Text>
              </View>
              <Text style={styles.legendLabel}>High Risk Behaviour</Text>
            </View>
          </View>

          <View style={[styles.legend, styles.legendCentered, { marginTop: 12 }]}>
            <View style={styles.legendItem}>
              <View style={[styles.scoreBubble, styles.scoreBubbleLow]}>
                <Text style={styles.scoreBubbleText}>L</Text>
              </View>
              <Text style={styles.legendLabel}>
                Low Complexity
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.scoreBubble, styles.scoreBubbleMedium]}>
                <Text style={styles.scoreBubbleText}>M</Text>
              </View>
              <Text style={styles.legendLabel}>Moderate complexity</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.scoreBubble, styles.scoreBubbleHigh]}>
                <Text style={styles.scoreBubbleText}>H</Text>
              </View>
              <Text style={styles.legendLabel}>
                Highly complexity
              </Text>
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
    width: 150,
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
    flexDirection: 'column',
    marginLeft: 3,
  },
  attendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendingName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 6,
  },
  attendingNameOffsite: {
    color: '#F54FA5',
  },

  // Gradient behaviour meter inside pill
  behaviourMeterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  behaviourTrack: {
    width: 110,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  behaviourMask: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#E5E7EB',
  },

  // Score bubble on right of header
  scoreBubble: {
    width: 24,
    height: 24,
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e7dff2',
    backgroundColor: '#f8f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 6,
  },
  scoreBubbleLow: {
    backgroundColor: SCORE_BUBBLE_STYLES.low.bg,
    borderColor: SCORE_BUBBLE_STYLES.low.border,
  },
  scoreBubbleMedium: {
    backgroundColor: SCORE_BUBBLE_STYLES.medium.bg,
    borderColor: SCORE_BUBBLE_STYLES.medium.border,
  },
  scoreBubbleHigh: {
    backgroundColor: SCORE_BUBBLE_STYLES.high.bg,
    borderColor: SCORE_BUBBLE_STYLES.high.border,
  },
  scoreBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#332244',
  },

  // Behaviour risk dial (L / M / H)
  riskBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    marginBottom: 6,
  },
  riskBadgeNeutral: {
    backgroundColor: '#CBD5E1',
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

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
    flexWrap: 'wrap',
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
    lineHeight: 20,
  },
});
