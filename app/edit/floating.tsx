import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import Chip from '@/components/Chip';
import * as Data from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

type ID = string;
type ColKey = 'frontRoom' | 'scotty' | 'twins';

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
  if (total >= 16) return 'high';
  if (total >= 10) return 'medium';
  return 'low';
}

function getBehaviourRisk(
  behaviours?: number | null,
): 'low' | 'medium' | 'high' | null {
  if (typeof behaviours !== 'number') return null;
  if (behaviours <= 1) return 'low';
  if (behaviours === 2) return 'medium';
  if (behaviours >= 3) return 'high';
  return null;
}

function BehaviourMeter({ totalScore }: { totalScore?: number | null }) {
  const rawTotal = typeof totalScore === 'number' ? totalScore : 0;
  const maxScore = 35;
  const fraction = Math.max(0, Math.min(1, rawTotal / maxScore));

  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useRef(new Animated.Value(fraction)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: fraction,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [fraction, progress]);

  const maskWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [trackWidth, 0],
  });

  return (
    <View
      style={{
        width: 72,
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
      }}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && (
        <>
          <LinearGradient
            colors={['#22c55e', '#eab308', '#ef4444']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: maskWidth,
              backgroundColor: '#E5E7EB',
            }}
          />
        </>
      )}
    </View>
  );
}

type LegendPerson = { name: string; female: boolean };

function LegendParticipantChip({
  person,
  ratingMap,
}: {
  person: LegendPerson;
  ratingMap: Record<string, ParticipantRatingRow>;
}) {
  const nameKey = `name:${String(person.name).toLowerCase()}`;
  const rating = ratingMap[nameKey];
  const total = rating ? getParticipantTotalScore(rating) : null;
  const behaviourRisk = rating ? getBehaviourRisk(rating.behaviours) : null;
  const level = total !== null ? getParticipantScoreLevel(total) : null;

  let riskLetter = '';
  let riskBg = '#CBD5E1';

  if (behaviourRisk === 'low') {
    riskLetter = 'L';
    riskBg = '#22C55E';
  } else if (behaviourRisk === 'medium') {
    riskLetter = 'M';
    riskBg = '#F97316';
  } else if (behaviourRisk === 'high') {
    riskLetter = 'H';
    riskBg = '#EF4444';
  }

  const scoreBg =
    level === 'low'
      ? '#dcfce7'
      : level === 'medium'
      ? '#fef9c3'
      : level === 'high'
      ? '#fee2e2'
      : '#f8f2ff';

  return (
    <View
      key={person.name}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#000000',
        backgroundColor: 'rgba(255,255,255,0.75)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 2,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 1,
            marginRight: 6,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: person.female ? '#ec4899' : '#3b82f6',
              marginRight: 6,
            }}
          />
          <Text
            style={{
              fontSize: 13,
              color: '#111827',
              fontWeight: '500',
            }}
            numberOfLines={1}
          >
            {person.name}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {behaviourRisk && (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: '#FFFFFF',
                backgroundColor: riskBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#FFFFFF',
                }}
              >
                {riskLetter}
              </Text>
            </View>
          )}
          {total !== null && (
            <View
              style={{
                minWidth: 24,
                height: 20,
                paddingHorizontal: 4,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#e7dff2',
                backgroundColor: scoreBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#332244',
                }}
              >
                {total}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        style={{
          marginTop: 2,
        }}
      >
        <BehaviourMeter totalScore={total ?? undefined} />
      </View>
    </View>
  );
}

const WRAP = {
  width: '100%',
  maxWidth: 880,
  alignSelf: 'center',
  paddingHorizontal: 12,
};

const TIME_SLOTS: Array<{
  id: string;
  startTime?: string;
  endTime?: string;
  displayTime?: string;
}> = Array.isArray((Data as any).TIME_SLOTS)
  ? ((Data as any).TIME_SLOTS as any[])
  : [];

const FRONT_ROOM_LABEL = 'Front Room';
const SCOTTY_LABEL = 'Scotty';
const TWINS_LABEL = 'Twins';
const FSO_LABEL = 'FSO';

const GROUPS: ColKey[] = ['frontRoom', 'scotty', 'twins'];

function groupLabel(key: ColKey): string {
  switch (key) {
    case 'frontRoom':
      return FRONT_ROOM_LABEL;
    case 'scotty':
      return SCOTTY_LABEL;
    case 'twins':
      return TWINS_LABEL;
    default:
      return key;
  }
}

function isFrontRoomSlot(slot: any): boolean {
  // most slots apply to Front Room; we special-case for FSO/Twins logic via isFSOTwinsSlot
  return true;
}

function displayTimeLabel(slot: any): string {
  if (!slot) return '';
  if (slot.displayTime) return String(slot.displayTime);
  if (slot.startTime && slot.endTime) return `${slot.startTime} - ${slot.endTime}`;
  return '';
}

function slotLabel(slot: any): string {
  if (!slot) return '';
  const raw =
    slot.displayTime ||
    (slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : '');
  return String(raw).replace(/\s/g, '').toLowerCase();
}

function isFSOTwinsSlot(slot?: any): boolean {
  const label = slotLabel(slot);
  if (!label) return false;
  return (
    label === '11:00am-11:30am' ||
    label === '11:00-11:30' ||
    label === '1:00pm-1:30pm' ||
    label === '1:00-1:30' ||
    label === '2:00pm-2:30pm' ||
    label === '2:00-2:30'
  );
}

function isFSOSlotOnly(slot?: any): boolean {
  const label = slotLabel(slot);
  if (!label) return false;
  return label === '11:00am-11:30am' || label === '11:00-11:30';
}

function isTwinsOnlySlot(slot?: any): boolean {
  const label = slotLabel(slot);
  if (!label) return false;
  return (
    label === '1:00pm-1:30pm' ||
    label === '1:00-1:30' ||
    label === '2:00pm-2:30pm' ||
    label === '2:00-2:30'
  );
}

function getInitialAssignments(): Record<
  string,
  {
    frontRoom?: ID;
    scotty?: ID;
    twins?: ID;
  }
> {
  const map: Record<
    string,
    {
      frontRoom?: ID;
      scotty?: ID;
      twins?: ID;
    }
  > = {};
  (TIME_SLOTS || []).forEach((slot: any, idx: number) => {
    const slotId = String(slot.id ?? idx);
    map[slotId] = {};
  });
  return map;
}

function cleanAssignments(assignments: any): any {
  if (!assignments || typeof assignments !== 'object') {
    return getInitialAssignments();
  }
  const result: Record<string, any> = {};
  (TIME_SLOTS || []).forEach((slot: any, idx: number) => {
    const slotId = String(slot.id ?? idx);
    const row = assignments[slotId] || {};
    result[slotId] = {
      frontRoom: row.frontRoom ?? undefined,
      scotty: row.scotty ?? undefined,
      twins: row.twins ?? undefined,
    };
  });
  return result;
}

function HeaderCell({ label }: { label: string }) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 8,
        backgroundColor: '#f9fafb',
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: '#000000',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function AssignmentCell({
  staffName,
  onPress,
  isFSOTwins,
}: {
  staffName?: string;
  onPress?: () => void;
  isFSOTwins?: boolean;
}) {
  const isEmpty = !staffName;
  const badgeColor = isFSOTwins ? '#0f766e' : '#1d4ed8';
  const badgeLabel = isFSOTwins ? 'FSO / Twins' : 'Front Room';

  if (isEmpty) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        style={{
          flex: 1,
          paddingVertical: 6,
          paddingHorizontal: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: '#9ca3af',
          }}
        >
          Tap to assign staff
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          color: '#111827',
          fontWeight: '600',
        }}
        numberOfLines={1}
      >
        {staffName}
      </Text>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: badgeColor,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            color: '#ffffff',
            fontWeight: '600',
          }}
        >
          {badgeLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function FloatingScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const [ratingMap, setRatingMap] = useState<Record<string, ParticipantRatingRow>>({});

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
    staff = [],
    workingStaff = [],
    floatingAssignments = {},
    outingGroup = null,
    updateSchedule,
    touch,
    selectedDate,
    attendingParticipants = [],
  } = useSchedule() as any;

  const staffById = useMemo(() => {
    const m: Record<string, any> = {};
    (staff || []).forEach((s: any) => {
      if (s && s.id) {
        m[s.id] = s;
      }
    });
    return m;
  }, [staff]);

  const workingStaffIds = useMemo(
    () => new Set<string>((workingStaff || []).map((s: any) => String(s.id))),
    [workingStaff],
  );

  const attendingSet = useMemo(
    () => new Set<string>((attendingParticipants ?? []) as string[]),
    [attendingParticipants],
  );

  const assignments = useMemo(
    () => cleanAssignments(floatingAssignments),
    [floatingAssignments],
  );

  function getRow(slotId: string) {
    return assignments[slotId] || {};
  }

  function setRow(slotId: string, row: any) {
    const next = {
      ...assignments,
      [slotId]: row,
    };
    updateSchedule?.({
      floatingAssignments: next,
    });
  }

  function openStaffPicker(slotId: string, col: ColKey) {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    router.push({
      pathname: '/edit/floating-pick-staff',
      params: {
        slotId,
        col,
      },
    });
  }

  function clearStaff(slotId: string, col: ColKey) {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    const row = getRow(slotId);
    const nextRow = { ...row, [col]: undefined };
    setRow(slotId, nextRow);
  }

  const [open, setOpen] = useState(false);

  const contentWidth = Math.min(width - 24, 880);

  const heroIconSize = isMobileWeb ? 160 : 220;
  const heroIconOpacity = isMobileWeb ? 0.9 : 1;

  const outingParticipantSet = useMemo(
    () => new Set<string>(outingGroup?.participantIds ?? []),
    [outingGroup],
  );

  const isFrontRoomOffsite = !!outingGroup?.frontRoomOffsite;
  const isScottyOffsite = !!outingGroup?.scottyOffsite;
  const isTwinsOffsite = !!outingGroup?.twinsOffsite;

  function roomOffsiteLabel(col: ColKey): string | null {
    if (col === 'frontRoom' && isFrontRoomOffsite) return 'Offsite (Front Room)';
    if (col === 'scotty' && isScottyOffsite) return 'Offsite (Scotty)';
    if (col === 'twins' && isTwinsOffsite) return 'Offsite (Twins / FSO)';
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#E0F2FE',
      }}
    >
      <SaveExit touchKey="floating" />

      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="sparkles-outline"
          size={heroIconSize}
          color="#5DBBFA"
          style={{
            position: 'absolute',
            top: '20%',
            left: '8%',
            opacity: heroIconOpacity,
            zIndex: 0,
          }}
        />
      )}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 24,
          paddingBottom: 160,
        }}
      >
        <View
          style={{
            ...WRAP,
            width: contentWidth,
          }}
        >
          <View
            style={{
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: '#0F172A',
                  marginBottom: 4,
                }}
              >
                Floating Assignments
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#6B7280',
                }}
              >
                Assign staff to Front Room, Scotty and Twins / FSO across the day.
                This helps keep drives, outings and onsite support balanced.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setOpen(true)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#ffffff',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Ionicons name="help-circle-outline" size={18} color="#0F172A" />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#0F172A',
                }}
              >
                View Legend
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#f3f4f6',
                borderBottomWidth: 1,
                borderBottomColor: '#e5e7eb',
              }}
            >
              <View
                style={{
                  width: '24%',
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  borderRightWidth: 1,
                  borderRightColor: '#e5e7eb',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#000000',
                  }}
                >
                  Time
                </Text>
              </View>
              <HeaderCell label={FRONT_ROOM_LABEL} />
              <HeaderCell label={SCOTTY_LABEL} />
              <HeaderCell label={TWINS_LABEL} />
            </View>

            {(TIME_SLOTS || []).map((slot: any, idx: number) => {
              const slotId = String(slot.id ?? idx);
              const row = getRow(slotId);

              const frStaff = row.frontRoom ? staffById[row.frontRoom] : undefined;
              const scStaff = row.scotty ? staffById[row.scotty] : undefined;
              const twStaff = row.twins ? staffById[row.twins] : undefined;

              let fr = '';
              let sc = '';
              let tw = '';

              const fso = isFSOTwinsSlot(slot);
              const isFrontOffsite = isRoomOffsite('frontRoom', slot, outingGroup);
              const isScottyOffsite = isRoomOffsite('scotty', slot, outingGroup);
              const isTwinsOffsite = isRoomOffsite('twins', slot, outingGroup);

              if (frStaff) {
                fr = String(frStaff.name || '');
              }
              if (scStaff) {
                sc = String(scStaff.name || '');
              }
              if (twStaff) {
                tw = String(twStaff.name || '');
              }

              const showTwinsFSOBadge = fso;

              return (
                <View
                  key={slotId}
                  style={{
                    flexDirection: 'row',
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: '#e5e7eb',
                  }}
                >
                  <View
                    style={{
                      width: '24%',
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      justifyContent: 'center',
                      backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: '#111827',
                      }}
                    >
                      {displayTimeLabel(slot)}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                    }}
                  >
                    <AssignmentCell
                      staffName={fr}
                      onPress={
                        isFrontOffsite
                          ? undefined
                          : () => openStaffPicker(slotId, 'frontRoom')
                      }
                      isFSOTwins={false}
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                    }}
                  >
                    <AssignmentCell
                      staffName={sc}
                      onPress={
                        isScottyOffsite ? undefined : () => openStaffPicker(slotId, 'scotty')
                      }
                      isFSOTwins={false}
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                    }}
                  >
                    <AssignmentCell
                      staffName={tw}
                      onPress={
                        isTwinsOffsite ? undefined : () => openStaffPicker(slotId, 'twins')
                      }
                      isFSOTwins={showTwinsFSOBadge}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <View
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#eff6ff',
              borderWidth: 1,
              borderColor: '#bfdbfe',
              gap: 6,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#1d4ed8',
              }}
            >
              Tip: use Floating Assignments after building the main schedule.
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: '#1e293b',
              }}
            >
              This screen is designed to help you keep drives, outings and onsite support
              balanced across Front Room, Scotty and Twins / FSO throughout the day.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Legend modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: Math.min(contentWidth, 520),
              maxWidth: '100%',
              borderRadius: 24,
              backgroundColor: '#ffffff',
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#111827',
                }}
              >
                Floating legend
              </Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: height * 0.6 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: '#4b5563',
                  marginBottom: 12,
                }}
              >
                This legend shows how the floating assignments interact with Front Room, Scotty
                and Twins / FSO, including who is offsite on outings and how participant groups
                are handled across the day.
              </Text>

              {/* Group status */}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  marginBottom: 16,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e7eb',
                  }}
                >
                  <View
                    style={{
                      width: '50%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: '#111827',
                      }}
                    >
                      Room status
                    </Text>
                  </View>
                  <View
                    style={{
                      width: '50%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: '#111827',
                      }}
                    >
                      Meaning
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e7eb',
                  }}
                >
                  <View
                    style={{
                      width: '50%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#111827',
                      }}
                    >
                      Front Room / Scotty / Twins normal
                    </Text>
                  </View>
                  <View
                    style={{
                      width: '50%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: '#4b5563',
                      }}
                    >
                      Room is operating as normal at B2. Staff assigned here are counted as onsite
                      support.
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                  }}
                >
                  <View
                    style={{
                      width: '50%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#111827',
                      }}
                    >
                      Offsite room (drives / outings)
                    </Text>
                  </View>
                  <View
                    style={{
                      width: '50%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: '#4b5563',
                      }}
                    >
                      Room is offsite for an outing or drive. Floating assignments for that room
                      are disabled during the offsite window.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Front Room participants row */}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  marginBottom: 16,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e7eb',
                  }}
                >
                  <View
                    style={{
                      width: '32%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      justifyContent: 'center',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#000000',
                      }}
                    >
                      Front Room
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    {[
                      { name: 'Paul', female: false },
                      { name: 'Jessica', female: true },
                      { name: 'Naveed', female: false },
                      { name: 'Tiffany', female: true },
                      { name: 'Sumera', female: true },
                      { name: 'Jacob', female: false },
                    ].map((p) => (
                      <LegendParticipantChip key={p.name} person={p} ratingMap={ratingMap} />
                    ))}
                  </View>
                </View>

                {/* Scotty row */}
                <View
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e7eb',
                  }}
                >
                  <View
                    style={{
                      width: '32%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      justifyContent: 'center',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#000000',
                      }}
                    >
                      Scotty
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: '#f1f5f9',
                        gap: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: '#3b82f6', // Scott = male
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          color: '#111827',
                          fontWeight: '500',
                        }}
                      >
                        Scott (staff floating here)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Twins / FSO row */}
                <View
                  style={{
                    flexDirection: 'row',
                  }}
                >
                  <View
                    style={{
                      width: '32%',
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      justifyContent: 'center',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#000000',
                      }}
                    >
                      Twins / FSO
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    {[
                      { name: 'Zara', female: true },
                      { name: 'Zoya', female: true },
                    ].map((p) => (
                      <LegendParticipantChip key={p.name} person={p} ratingMap={ratingMap} />
                    ))}
                  </View>
                </View>
              </View>

              {/* Key for colours */}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  padding: 12,
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: 4,
                  }}
                >
                  Colours and icons
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#111827',
                    }}
                  >
                    Male participant
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: '#ec4899',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#111827',
                    }}
                  >
                    Female participant
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                      backgroundColor: '#22C55E',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: '#FFFFFF',
                      }}
                    >
                      L
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#111827',
                    }}
                  >
                    Behaviour risk: L = Low, M = Medium, H = High
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 8,
                      borderRadius: 999,
                      overflow: 'hidden',
                      backgroundColor: '#E5E7EB',
                    }}
                  >
                    <LinearGradient
                      colors={['#22c55e', '#eab308', '#ef4444']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#111827',
                      flex: 1,
                    }}
                  >
                    Gradient meter shows overall participant complexity from green (low support) to
                    yellow (medium) to red (high support).
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function isRoomOffsite(
  col: ColKey,
  slot: any,
  outingGroup: any,
): boolean {
  if (!outingGroup) return false;
  const isFSO = isFSOSlotOnly(slot);
  const isTwOnly = isTwinsOnlySlot(slot);

  if (col === 'frontRoom') {
    return !!outingGroup.frontRoomOffsite;
  }
  if (col === 'scotty') {
    return !!outingGroup.scottyOffsite;
  }
  if (col === 'twins') {
    if (isFSO) return !!outingGroup.twinsOffsite;
    if (isTwOnly) return !!outingGroup.twinsOffsite;
    return !!outingGroup.twinsOffsite;
  }
  return false;
}
