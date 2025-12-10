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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import { supabase } from '@/lib/supabase';
import Chip from '@/components/Chip';
import * as Data from '@/constants/data';
import {
  getRiskBand,
  MAX_PARTICIPANT_SCORE,
  RISK_GRADIENT_COLORS,
  SCORE_BUBBLE_STYLES,
} from '@/constants/ratingsTheme';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';

type ID = string;
type ColKey = 'frontRoom' | 'scotty' | 'twins';

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
}> = Array.isArray((Data as any).TIME_SLOTS) ? (Data as any).TIME_SLOTS : [];

const ROOM_KEYS: ColKey[] = ['frontRoom', 'scotty', 'twins'];

// Participant groups for each floating room
const PARTICIPANTS: any[] = Array.isArray((Data as any).PARTICIPANTS)
  ? ((Data as any).PARTICIPANTS as any[])
  : [];

function findParticipantIdByName(name: string): string | null {
  const lower = name.trim().toLowerCase();
  const found = PARTICIPANTS.find((p) =>
    String(p?.name || '').trim().toLowerCase() === lower,
  );
  return found ? String(found.id) : null;
}

const FRONT_ROOM_GROUP: string[] = [];
['Paul', 'Jessica', 'Naveed', 'Tiffany', 'Sumera', 'Jacob'].forEach((n) => {
  const id = findParticipantIdByName(n);
  if (id) FRONT_ROOM_GROUP.push(id);
});

const SCOTTY_GROUP: string[] = [];
['Scott'].forEach((n) => {
  const id = findParticipantIdByName(n);
  if (id) SCOTTY_GROUP.push(id);
});

const TWINS_GROUP: string[] = [];
['Zara', 'Zoya'].forEach((n) => {
  const id = findParticipantIdByName(n);
  if (id) TWINS_GROUP.push(id);
});

function getParticipantGroupForRoom(col: ColKey): string[] {
  switch (col) {
    case 'frontRoom':
      return FRONT_ROOM_GROUP;
    case 'scotty':
      return SCOTTY_GROUP;
    case 'twins':
      return TWINS_GROUP;
    default:
      return [];
  }
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
    label === '13:00-13:30'
  );
}

function isAfter2PM(slot?: any): boolean {
  const label = slotLabel(slot);
  if (!label) return false;
  return (
    label.startsWith('2:00pm-') ||
    label.startsWith('14:00-') ||
    label.includes('2:00pm-2:30pm') ||
    label.includes('14:00-14:30')
  );
}

function isFemale(staff: any): boolean {
  return staff && String(staff.gender || '').toLowerCase() === 'female';
}

function isAntoinette(staff: any): boolean {
  if (!staff) return false;
  const name = String(staff.name || '').toLowerCase();
  return name.includes('antoinette');
}

// 🔹 NEW: helper to exclude the "Everyone" pseudo-staff
function isEveryone(staff: any): boolean {
  const name = String(staff?.name || '').trim().toLowerCase();
  return name === 'everyone';
}

// ---- Participant ratings + behaviour helpers (for legend pills) ----

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

type ParticipantRating = ParticipantRatingRow | null | undefined;

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

type ParticipantScoreLevel = 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh';

function getParticipantScoreLevel(total: number): ParticipantScoreLevel {
  if (total <= 5) return 'veryLow';
  if (total <= 10) return 'low';
  if (total <= 15) return 'medium';
  if (total <= 20) return 'high';
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

  // Width of the grey mask that hides the right side of the gradient
  const maskWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [trackWidth, 0], // 0% score = full mask, 100% = no mask
  });

  return (
    <View
      style={{
        width: 120,
        height: 10,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
      }}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && (
        <>
          <LinearGradient
            colors={RISK_GRADIENT_COLORS} // green → yellow → red (shared theme)
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: '#E5E7EB',
              width: maskWidth,
            }}
          />
        </>
      )}
    </View>
  );
}

type LegendPerson = { name: string; female: boolean };

function LegendParticipantPill({
  person,
  rating,
}: {
  person: LegendPerson;
  rating?: ParticipantRatingRow;
}) {
  const total = rating ? getParticipantTotalScore(rating) : null;
  const level = total !== null ? getParticipantScoreLevel(total) : null;
  const behaviourRisk = rating ? getBehaviourRisk(rating.behaviours) : null;

  const riskLetter =
    behaviourRisk === 'high'
      ? 'H'
      : behaviourRisk === 'medium'
      ? 'M'
      : behaviourRisk === 'low'
      ? 'L'
      : null;

  let riskColor = '#CBD5E1';
  if (behaviourRisk === 'low') riskColor = '#22C55E';
  if (behaviourRisk === 'medium') riskColor = '#F97316';
  if (behaviourRisk === 'high') riskColor = '#EF4444';

  let scoreBg = '#f8f2ff';
  let scoreBorder = '#e7dff2';
  if (level === 'veryLow') {
    scoreBg = '#ecfdf3';
    scoreBorder = '#22C55E';
  } else if (level === 'low') {
    scoreBg = '#fefce8';
    scoreBorder = '#EAB308';
  } else if (level === 'medium') {
    scoreBg = '#fff7ed';
    scoreBorder = '#F97316';
  } else if (level === 'high') {
    scoreBg = '#fee2e2';
    scoreBorder = '#FB7185';
  } else if (level === 'veryHigh') {
    scoreBg = '#fee2e2';
    scoreBorder = '#EF4444';
  }

  return (
    <View
      key={person.name}
      style={{
        borderWidth: 1,
        borderColor: '#111827',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        flexBasis: '31%',
        maxWidth: '31%',
        minWidth: 0,
      }}
    >
      {/* Header row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: total !== null ? 6 : 0,
        }}
      >
        {/* Left: gender dot + name */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 1,
            minWidth: 0,
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
              fontWeight: '600',
              color: '#111827',
            }}
            numberOfLines={1}
          >
            {person.name}
          </Text>
        </View>

        {/* Right: behaviour risk + score */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 8,
          }}
        >
          {behaviourRisk && riskLetter && (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: riskColor,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
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
                minWidth: 26,
                height: 24,
                paddingHorizontal: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: scoreBorder,
                backgroundColor: scoreBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#111827',
                }}
              >
                {total}
              </Text>
            </View>
          )}
        </View>
      </View>

      {total !== null && (
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <BehaviourMeter totalScore={total} />
        </View>
      )}
    </View>
  );
}

function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  let t = String(time).trim().toLowerCase();

  if (t.includes('-')) {
    t = t.split('-')[0].trim();
  }

  const m = t.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const suffix = m[3];

  if (suffix === 'am') {
    if (hour === 12) hour = 0;
  } else if (suffix === 'pm') {
    if (hour !== 12) hour += 12;
  } else {
    if (hour <= 6) {
      hour += 12;
    }
  }

  return hour * 60 + minute;
}

function getSlotWindowMinutes(slot: any): { start: number | null; end: number | null } {
  if (!slot) return { start: null, end: null };

  const start =
    parseTimeToMinutes(slot.startTime) ||
    (slot.displayTime ? parseTimeToMinutes(slot.displayTime.split('-')[0]) : null);

  const end =
    parseTimeToMinutes(slot.endTime) ||
    (slot.displayTime && slot.displayTime.includes('-')
      ? parseTimeToMinutes(slot.displayTime.split('-')[1])
      : null);

  return { start, end };
}

function getOutingWindowMinutes(outingGroup: any): {
  start: number | null;
  end: number | null;
} {
  if (!outingGroup) return { start: null, end: null };
  const start = parseTimeToMinutes(outingGroup.startTime);
  const end = parseTimeToMinutes(outingGroup.endTime);
  if (start == null || end == null) {
    return { start: null, end: null };
  }
  if (end <= start) {
    return { start: null, end: null };
  }
  return { start, end };
}

function timesOverlap(
  s1: number | null,
  e1: number | null,
  s2: number | null,
  e2: number | null,
): boolean {
  if (s1 == null || e1 == null) return false;
  if (s2 == null || e2 == null) return false;
  return s1 < e2 && s2 < e1;
}

// For a given slot + room, is that room's participant group on outing at that time?
function isRoomOffsiteForSlot(
  col: ColKey,
  slot: any,
  outingGroup: any,
): boolean {
  if (!outingGroup) return false;

  const groupIds = getParticipantGroupForRoom(col);
  if (!groupIds.length) return false;

  const outingIds = new Set(
    ((outingGroup.participantIds ?? []) as (string | number)[]).map((id) =>
      String(id),
    ),
  );

  const anyOnOuting = groupIds.some((id) => outingIds.has(String(id)));
  if (!anyOnOuting) return false;

  const slotWindow = getSlotWindowMinutes(slot);
  const outingWindow = getOutingWindowMinutes(outingGroup);

  if (outingWindow.start == null || outingWindow.end == null) {
    return true;
  }

  return timesOverlap(
    slotWindow.start,
    slotWindow.end,
    outingWindow.start,
    outingWindow.end,
  );
}

function buildAutoAssignments(
  working: any[],
  timeSlots: any[],
  getActiveRoomsForSlot?: (slot: any) => ColKey[],
): Record<string, { [K in ColKey]?: ID }> {
  if (!Array.isArray(working) || working.length === 0) return {};

  const totalUsage: Record<string, number> = {};
  const roomUsage: Record<string, Record<ColKey, number>> = {};
  const twinsUsage: Record<string, number> = {};

  working.forEach((s) => {
    totalUsage[s.id] = 0;
    roomUsage[s.id] = {
      frontRoom: 0,
      scotty: 0,
      twins: 0,
    };
    twinsUsage[s.id] = 0;
  });

  const result: Record<string, { [K in ColKey]?: ID }> = {};
  let prevSlotStaff = new Set<string>();

  (timeSlots || []).forEach((slot, index) => {
    const slotId = String(slot.id ?? index);
    const row: { [K in ColKey]?: ID } = {};
    const thisSlotStaff = new Set<string>();
    const fso = isFSOTwinsSlot(slot);
    const after2 = isAfter2PM(slot);

    const roomOrder: ColKey[] = getActiveRoomsForSlot
      ? getActiveRoomsForSlot(slot)
      : ROOM_KEYS;

    roomOrder.forEach((col) => {
      let candidates = working.filter((s) => !thisSlotStaff.has(s.id));

      if (!candidates.length) return;

      if (col === 'twins' && fso) {
        const females = candidates.filter((s) => isFemale(s));
        if (females.length) {
          candidates = females;
        }
      }

      // Respect Antoinette-after-2pm rule
      candidates = candidates.filter((s) => !isAntoinette(s) || after2);

      // Twins fairness: max 2 total per staff where possible
      if (col === 'twins') {
        const underCap = candidates.filter((s) => (twinsUsage[s.id] ?? 0) < 2);
        if (underCap.length) {
          candidates = underCap;
        }
      }

      // Cooldown across slots – prefer staff who were not used in previous slot
      const cooled = candidates.filter((s) => !prevSlotStaff.has(s.id));
      if (cooled.length) {
        candidates = cooled;
      }

      if (!candidates.length) return;

      // 1) Global fairness: minimise total assignments
      let minTotal = Infinity;
      candidates.forEach((s) => {
        const c = totalUsage[s.id] ?? 0;
        if (c < minTotal) minTotal = c;
      });
      let best = candidates.filter((s) => (totalUsage[s.id] ?? 0) === minTotal);

      // 2) Room fairness: minimise assignments in this specific room
      let minRoom = Infinity;
      best.forEach((s) => {
        const c = roomUsage[s.id]?.[col] ?? 0;
        if (c < minRoom) minRoom = c;
      });
      best = best.filter((s) => (roomUsage[s.id]?.[col] ?? 0) === minRoom);

      // 3) Tie-breaker: random between equally good options
      const chosen = best[Math.floor(Math.random() * best.length)];
      if (!chosen) return;

      row[col] = chosen.id;
      thisSlotStaff.add(chosen.id);

      totalUsage[chosen.id] = (totalUsage[chosen.id] ?? 0) + 1;
      roomUsage[chosen.id][col] = (roomUsage[chosen.id]?.[col] ?? 0) + 1;
      if (col === 'twins') {
        twinsUsage[chosen.id] = (twinsUsage[chosen.id] ?? 0) + 1;
      }
    });

    result[slotId] = row;
    prevSlotStaff = thisSlotStaff;
  });

  return result;
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
      m[s.id] = s;
    });
    return m;
  }, [staff]);

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

  const [filterStaffId, setFilterStaffId] = useState<string | null>(null);

  const workingSet = useMemo(
    () => new Set<string>((workingStaff || []).map((id: any) => String(id))),
    [workingStaff],
  );

  const outingStaffSet = useMemo(
    () =>
      new Set<string>(
        ((outingGroup?.staffIds ?? []) as (string | number)[]).map((id) =>
          String(id),
        ),
      ),
    [outingGroup],
  );

  // 🔹 Only real onsite Dream Team staff – exclude "Everyone"
  const onsiteWorking = useMemo(
    () => {
      const hasTimedOuting =
        !!outingGroup &&
        typeof outingGroup.startTime === 'string' &&
        outingGroup.startTime.trim().length > 0 &&
        typeof outingGroup.endTime === 'string' &&
        outingGroup.endTime.trim().length > 0;

      return (staff || []).filter((s: any) => {
        const id = String(s.id);

        // Never include the "Everyone" pseudo-staff
        if (isEveryone(s)) return false;

        // Must be in the working staff list
        if (!workingSet.has(id)) return false;

        // Staff are fully offsite only when outing has NO specific time window
        const isAllDayOutingStaff =
          !!outingGroup && !hasTimedOuting && outingStaffSet.has(id);

        // For timed outings, outing staff stay onsite overall
        return !isAllDayOutingStaff;
      });
    },
    [staff, workingSet, outingStaffSet, outingGroup],
  );

  const sortedWorking = useMemo(
    () =>
      (onsiteWorking || [])
        .filter((s: any) => !isEveryone(s))
        .slice()
        .sort((a: any, b: any) =>
          String(a.name || '').localeCompare(String(b.name || '')),
        ),
    [onsiteWorking],
  );

  // 🔹 Attendance-based room availability (Not attending)
  const participantsAttendingSet = useMemo(
    () =>
      new Set<string>(
        ((attendingParticipants as any[]) || []).map((id) => String(id)),
      ),
    [attendingParticipants],
  );

  const roomNotAttending = useMemo(
    () => ({
      frontRoom: FRONT_ROOM_GROUP.length
        ? FRONT_ROOM_GROUP.every(
            (id) => !participantsAttendingSet.has(String(id)),
          )
        : false,
      scotty: SCOTTY_GROUP.length
        ? SCOTTY_GROUP.every(
            (id) => !participantsAttendingSet.has(String(id)),
          )
        : false,
      twins: TWINS_GROUP.length
        ? TWINS_GROUP.every(
            (id) => !participantsAttendingSet.has(String(id)),
          )
        : false,
    }),
    [participantsAttendingSet],
  );

  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<{
    slotId?: string;
    col?: ColKey;
    fso?: boolean;
  } | null>(null);

  const getRow = (slotId: string) =>
    (floatingAssignments as any)[slotId] || {};

  const nameOf = (id?: string) => (id ? staffById[id]?.name ?? '' : '');

  const openPicker = (slotId: string, col: ColKey) => {
    const slot = (TIME_SLOTS || []).find(
      (s) => String(s.id) === String(slotId),
    );
    setPick({
      slotId,
      col,
      fso: col === 'twins' && isFSOTwinsSlot(slot),
    });
    setOpen(true);
  };

  const choose = (id: string) => {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    if (!pick?.slotId || !pick.col) return;
    const next = { ...(floatingAssignments || {}) } as any;
    next[pick.slotId] = {
      ...(next[pick.slotId] || {}),
      [pick.col]: id,
    };
    updateSchedule?.({ floatingAssignments: next });
    touch?.();
    setOpen(false);
  };

  const clearCell = () => {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    if (!pick?.slotId || !pick.col) return;
    const next = { ...(floatingAssignments || {}) } as any;
    if (next[pick.slotId]) {
      delete next[pick.slotId][pick.col];
    }
    updateSchedule?.({ floatingAssignments: next });
    touch?.();
    setOpen(false);
  };

  const hasFrontRoom = useMemo(
    () =>
      Object.values(floatingAssignments || {}).some(
        (row: any) => row && row.frontRoom,
      ),
    [floatingAssignments],
  );

  const activeRoomsForSlot = (slot: any): ColKey[] => {
    const offsite: ColKey[] = outingGroup
      ? ROOM_KEYS.filter((col) => isRoomOffsiteForSlot(col, slot, outingGroup))
      : [];

    const inactiveAttendance: ColKey[] = ROOM_KEYS.filter((col) => {
      if (col === 'frontRoom') return roomNotAttending.frontRoom;
      if (col === 'scotty') return roomNotAttending.scotty;
      if (col === 'twins') return roomNotAttending.twins;
      return false;
    });

    const disabled = new Set<ColKey>([...offsite, ...inactiveAttendance]);
    const active = ROOM_KEYS.filter((col) => !disabled.has(col));

    // If somehow everything is disabled, fall back to all rooms
    return active.length ? active : ROOM_KEYS;
  };

  useEffect(() => {
    // 🔥 Auto-build using *onsite* working staff only
    if (!hasFrontRoom && onsiteWorking.length && updateSchedule) {
      const next = buildAutoAssignments(onsiteWorking, TIME_SLOTS, activeRoomsForSlot);
      updateSchedule({ floatingAssignments: next });
      push('Floating assignments updated', 'floating');
    }
  }, [hasFrontRoom, onsiteWorking, updateSchedule]);

  const handleShuffle = () => {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    if (!onsiteWorking.length || !updateSchedule) return;
    const next = buildAutoAssignments(onsiteWorking, TIME_SLOTS, activeRoomsForSlot);
    updateSchedule({ floatingAssignments: next });
    push('Floating assignments updated', 'floating');
  };

  // 🔹 Print handler — navigate to /print-floating with staff + date
  const handlePrintFloating = () => {
    const staffParam = filterStaffId || 'ALL';
    let dateParam = '';

    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        dateParam = d.toISOString().slice(0, 10); // YYYY-MM-DD
      }
    }

    router.push({
      pathname: '/print-floating',
      params: { staff: staffParam, date: dateParam },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FDF2FF' }}>
      <SaveExit touchKey="floating" />
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="refresh-circle-outline"
          size={220}
          color="#F6C1FF"
          style={{
            position: 'absolute',
            top: '25%',
            left: '10%',
            opacity: 1,
            zIndex: 0,
          }}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={WRAP as any}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              marginTop: 40,
              marginBottom: 10,
            }}
          >
            Floating Assignments
          </Text>
          <Text style={{ color: '#64748b', marginBottom: 12 }}>
            Tap a cell to assign a staff member. Twins FSO slots require a
            female staff.
          </Text>

          <View
            style={{
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                marginBottom: 6,
              }}
            >
              Filter by staff
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Chip
                label="Show all"
                selected={!filterStaffId}
                onPress={() => setFilterStaffId(null)}
              />
              {(sortedWorking || []).map((s: any) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={filterStaffId === s.id}
                  onPress={() => setFilterStaffId(s.id)}
                />
              ))}
            </View>
            {filterStaffId && (
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: '#64748b',
                }}
              >
                Showing floating assignments for{' '}
                {(sortedWorking || []).find((s: any) => s.id === filterStaffId)
                  ?.name || 'selected staff'}
                . Tap "Show all" to clear.
              </Text>
            )}
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            {/* Header row */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#f9fafb',
                borderBottomWidth: 1,
                borderBottomColor: '#e5e7eb',
              }}
            >
              <HeaderCell label="Time" flex={1.1} />
              <HeaderCell label="Front Room" />
              <HeaderCell label="Scotty" />
              <HeaderCell label="Twins" />
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
              const isFrontOffsite = isRoomOffsiteForSlot('frontRoom', slot, outingGroup);
              const isScottyOffsite = isRoomOffsiteForSlot('scotty', slot, outingGroup);
              const isTwinsOffsite = isRoomOffsiteForSlot('twins', slot, outingGroup);
              const isFrontNotAttending = roomNotAttending.frontRoom;
              const isScottyNotAttending = roomNotAttending.scotty;
              const isTwinsNotAttending = roomNotAttending.twins;

              if (!filterStaffId) {
                fr = frStaff?.name ?? '';
                sc = scStaff?.name ?? '';
                tw = twStaff?.name ?? '';
              } else {
                const matchId = filterStaffId;
                if (frStaff && frStaff.id === matchId) fr = frStaff.name ?? '';
                if (scStaff && scStaff.id === matchId) sc = scStaff.name ?? '';
                if (twStaff && twStaff.id === matchId) tw = twStaff.name ?? '';
              }

              const baseRowStyle =
                idx % 2 === 0
                  ? { backgroundColor: '#ffffff' }
                  : { backgroundColor: '#f9fafb' };

              return (
                <View
                  key={slotId}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'stretch',
                      borderBottomWidth: 1,
                      borderBottomColor: '#e5e7eb',
                    },
                    baseRowStyle,
                  ]}
                >
                  {/* Time cell */}
                  <View
                    style={{
                      flex: 1.1,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRightWidth: 1,
                      borderRightColor: '#e5e7eb',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: '#0f172a',
                      }}
                    >
                      {slot.displayTime ||
                        `${slot.startTime ?? ''} - ${slot.endTime ?? ''}`}
                    </Text>
                  </View>

                  {/* Front Room */}
                  <CellButton
                    style={[
                      { flex: 1 },
                      isFrontOffsite
                        ? { opacity: 0.6, backgroundColor: '#fee2e2' }
                        : null,
                      isFrontNotAttending
                        ? { opacity: 0.7, backgroundColor: '#e5e7eb' }
                        : null,
                    ]}
                    label={
                      isFrontOffsite
                        ? 'Outing (offsite)'
                        : isFrontNotAttending
                        ? 'Not attending'
                        : !filterStaffId
                        ? fr || 'Tap to assign'
                        : fr
                    }
                    gender={
                      isFrontOffsite || isFrontNotAttending ? undefined : frStaff?.gender
                    }
                    onPress={() => {
                      if (isFrontOffsite || isFrontNotAttending) return;
                      openPicker(slotId, 'frontRoom');
                    }}
                  />

                  {/* Scotty */}
                  <CellButton
                    style={[
                      { flex: 1 },
                      isScottyOffsite
                        ? { opacity: 0.6, backgroundColor: '#fee2e2' }
                        : null,
                      isScottyNotAttending
                        ? { opacity: 0.7, backgroundColor: '#e5e7eb' }
                        : null,
                    ]}
                    label={
                      isScottyOffsite
                        ? 'Outing (offsite)'
                        : isScottyNotAttending
                        ? 'Not attending'
                        : !filterStaffId
                        ? sc || 'Tap to assign'
                        : sc
                    }
                    gender={
                      isScottyOffsite || isScottyNotAttending ? undefined : scStaff?.gender
                    }
                    onPress={() => {
                      if (isScottyOffsite || isScottyNotAttending) return;
                      openPicker(slotId, 'scotty');
                    }}
                  />

                  {/* Twins */}
                  <CellButton
                    style={[
                      { flex: 1 },
                      fso ? { backgroundColor: '#fef2f2' } : null,
                      isTwinsOffsite
                        ? { opacity: 0.6, backgroundColor: '#fee2e2' }
                        : null,
                      isTwinsNotAttending
                        ? { opacity: 0.7, backgroundColor: '#e5e7eb' }
                        : null,
                    ]}
                    label={
                      isTwinsOffsite
                        ? 'Outing (offsite)'
                        : isTwinsNotAttending
                        ? 'Not attending'
                        : !filterStaffId
                        ? tw
                          ? fso
                            ? `${tw} (FSO)`
                            : tw
                          : fso
                          ? 'Tap to assign (FSO)'
                          : 'Tap to assign'
                        : tw
                        ? fso
                          ? `${tw} (FSO)`
                          : tw
                        : ''
                    }
                    gender={
                      isTwinsOffsite || isTwinsNotAttending ? undefined : twStaff?.gender
                    }
                    fsoTag={fso && !isTwinsOffsite && !isTwinsNotAttending}
                    onPress={() => {
                      if (isTwinsOffsite || isTwinsNotAttending) return;
                      openPicker(slotId, 'twins');
                    }}
                  />
                </View>
              );
            })}
          </View>

          {/* Shuffle button */}
          <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
            <TouchableOpacity
              onPress={handleShuffle}
              activeOpacity={0.9}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#4f46e5',
                backgroundColor: '#eef2ff',
              }}
            >
              <Text
                style={{
                  color: '#4f46e5',
                  fontWeight: '600',
                }}
              >
                Shuffle all assignments
              </Text>
            </TouchableOpacity>
          </View>

          {/* Print Floating Assignment – web only, right-aligned like Edit Hub */}
          {Platform.OS === 'web' && (
            <View
              style={{
                marginTop: 28,
                width: '100%',
                alignItems: 'flex-end',
              }}
            >
              <TouchableOpacity
                onPress={handlePrintFloating}
                activeOpacity={0.85}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 4,
                }}
              >
                <Ionicons
                  name="print-outline"
                  size={42}
                  color="#00A86A"
                  style={{ marginBottom: 6 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#3c234c',
                    textAlign: 'center',
                  }}
                >
                  Print Floating Assignment
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Legend */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#000000',
                marginBottom: 8,
              }}
            >
              Legend
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {/* Front Room row */}
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
                  ].map((p) => {
                    const nameKey = `name:${String(p.name).toLowerCase()}`;
                    const rating = ratingMap[nameKey];
                    return (
                      <LegendParticipantPill
                        key={p.name}
                        person={p}
                        rating={rating}
                      />
                    );
                  })}
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
                  {[{ name: 'Scott', female: false }].map((p) => {
                    const nameKey = `name:${String(p.name).toLowerCase()}`;
                    const rating = ratingMap[nameKey];
                    return (
                      <LegendParticipantPill
                        key={p.name}
                        person={p}
                        rating={rating}
                      />
                    );
                  })}
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
                  ].map((p) => {
                    const nameKey = `name:${String(p.name).toLowerCase()}`;
                    const rating = ratingMap[nameKey];
                    return (
                      <LegendParticipantPill
                        key={p.name}
                        person={p}
                        rating={rating}
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Staff picker modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.25)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: 720,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                marginBottom: 10,
              }}
            >
              Assign Staff
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(onsiteWorking || [])
                .filter(
                  (s: any) =>
                    !pick?.fso ||
                    String(s.gender || '').toLowerCase() === 'female',
                )
                .map((s: any) => (
                  <Chip key={s.id} label={s.name} onPress={() => choose(s.id)} />
                ))}
            </View>

            {pick?.fso &&
              (onsiteWorking || []).every(
                (s: any) =>
                  String(s.gender || '').toLowerCase() !== 'female',
              ) && (
                <View
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#fecaca',
                    backgroundColor: '#fef2f2',
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: '#b91c1c',
                      fontWeight: '600',
                    }}
                  >
                    No eligible female staff on the Dream Team for this slot.
                  </Text>
                </View>
              )}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 16,
              }}
            >
              <TouchableOpacity onPress={clearCell}>
                <Text
                  style={{
                    color: '#ef4444',
                    fontWeight: '600',
                  }}
                >
                  Clear this cell
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                }}
              >
                <Text style={{ fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HeaderCell({ label, flex = 1 }: { label: string; flex?: number }) {
  return (
    <View
      style={{
        flex,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: '#0f172a',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

type CellProps = {
  label: string;
  onPress: () => void;
  style?: any;
  gender?: string;
  fsoTag?: boolean;
};

function CellButton({ label, onPress, style, gender, fsoTag }: CellProps) {
  const lower = label.toLowerCase();
  const isEmpty = lower.startsWith('tap to assign');
  const isOffsite = lower === 'outing (offsite)';

  const genderColor =
    String(gender || '').toLowerCase() === 'female'
      ? '#fb7185' // pink
      : String(gender || '').toLowerCase() === 'male'
      ? '#60a5fa' // blue
      : '#cbd5e1'; // neutral grey

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        {
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderLeftWidth: 1,
          borderLeftColor: '#e5e7eb',
          justifyContent: 'center',
          position: 'relative',
        },
        style,
      ]}
    >
      {isEmpty ? (
        <Text
          style={{
            color: '#64748b',
            fontWeight: '400' as any,
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: '#f1f5f9',
            gap: 8,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: genderColor,
            }}
          />
          <Text
            style={{
              color: '#0f172a',
              fontWeight: '600' as any,
              fontSize: 13,
            }}
          >
            {label}
          </Text>
        </View>
      )}

      {fsoTag && (
        <View
          style={{
            position: 'absolute',
            right: 8,
            bottom: 6,
          }}
        >
          <Tag>FSO</Tag>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 2,
        paddingHorizontal: 6,
        backgroundColor: '#fce7f3',
        borderRadius: 999,
      }}
    >
      <Text
        style={{
          color: '#be185d',
          fontSize: 11,
          fontWeight: '700',
        }}
      >
        {children as any}
      </Text>
    </View>
  );
}
