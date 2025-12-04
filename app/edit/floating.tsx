import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import Chip from '@/components/Chip';
import * as Data from '@/constants/data';
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

function slotLabel(slot?: any): string {
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

function isEveryone(staff: any): boolean {
  const name = String(staff?.name || '').trim().toLowerCase();
  return name === 'everyone';
}

// ─────────────────────────────────────────────────────────────
// Room → participant mapping (Front Room / Scotty / Twins)
// We look at PARTICIPANTS and match by name.
// Include a small tweak so "Scott" counts as Scotty.
// ─────────────────────────────────────────────────────────────

const ROOM_PARTICIPANT_MAP: Partial<Record<ColKey, ID>> = (() => {
  const map: Partial<Record<ColKey, ID>> = {};
  const participants = ((Data as any).PARTICIPANTS || []) as any[];

  participants.forEach((p: any) => {
    const name = String(p?.name || '').toLowerCase();

    if (!map.frontRoom && name.includes('front') && name.includes('room')) {
      map.frontRoom = String(p.id);
    }
    if (
      !map.scotty &&
      (name.includes('scotty') || name === 'scott')
    ) {
      map.scotty = String(p.id);
    }
    if (!map.twins && name.includes('twins')) {
      map.twins = String(p.id);
    }
  });

  return map;
})();

// ─────────────────────────────────────────────────────────────
// Time helpers – convert strings like "10:30", "10:30am" to minutes
// ─────────────────────────────────────────────────────────────

function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  let t = String(time).trim().toLowerCase();

  // If we accidentally get something like "10:00am - 10:30am", take first half
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
    // No am/pm – assume 24h-ish. For our day program:
    // 8–18 = daytime, 1–6 → afternoon (13–18)
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
    // No times entered → treat as "all day" offsite where applicable
    return { start: null, end: null };
  }
  if (end <= start) {
    // Weird input, just bail out
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

// For a given slot + room, is that room's participant on outing at that time?
function isRoomOffsiteForSlot(
  col: ColKey,
  slot: any,
  outingGroup: any,
): boolean {
  if (!outingGroup) return false;

  const participantId = ROOM_PARTICIPANT_MAP[col];
  if (!participantId) return false;

  const participantIds = new Set(
    ((outingGroup.participantIds ?? []) as (string | number)[]).map((id) =>
      String(id),
    ),
  );

  if (!participantIds.has(String(participantId))) {
    // This room's participant is not on this outing
    return false;
  }

  const slotWindow = getSlotWindowMinutes(slot);
  const outingWindow = getOutingWindowMinutes(outingGroup);

  // If outing has no meaningful times, treat as "off all day"
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

// ─────────────────────────────────────────────────────────────
// Auto-assignment logic (Shuffle)
// Now accepts a per-slot "which rooms are active" function.
// ─────────────────────────────────────────────────────────────

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

      // FSO slots → Twins must be female where possible
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
      roomUsage[chosen.id][col] = (roomUsage[chosen.id][col] ?? 0) + 1;
      if (col === 'twins') {
        twinsUsage[chosen.id] = (twinsUsage[chosen.id] ?? 0) + 1;
      }
    });

    result[slotId] = row;
    prevSlotStaff = thisSlotStaff;
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function FloatingScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' &&
      /iPhone|Android/i.test(navigator.userAgent)) ||
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
  } = useSchedule() as any;

  const staffById = useMemo(() => {
    const m: Record<string, any> = {};
    (staff || []).forEach((s: any) => {
      m[s.id] = s;
    });
    return m;
  }, [staff]);

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

  // Only real onsite Dream Team staff – exclude "Everyone" & staff on outing
  const onsiteWorking = useMemo(
    () =>
      (staff || []).filter(
        (s: any) =>
          !isEveryone(s) &&
          workingSet.has(String(s.id)) &&
          !outingStaffSet.has(String(s.id)),
      ),
    [staff, workingSet, outingStaffSet],
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

  const closePicker = () => {
    setOpen(false);
    setPick(null);
  };

  const handleSelect = (staffId: string) => {
    if (!pick || !updateSchedule) return;
    const base = (floatingAssignments || {}) as Record<
      string,
      { [K in ColKey]?: ID }
    >;
    const next = { ...base };
    const row = { ...(next[pick.slotId!] || {}) };

    if (pick.col) {
      row[pick.col] = staffId;
    }

    next[pick.slotId!] = row;
    updateSchedule({ floatingAssignments: next });
    touch?.();
    setOpen(false);
  };

  const handleClear = () => {
    if (!pick || !updateSchedule) return;
    const base = (floatingAssignments || {}) as Record<
      string,
      { [K in ColKey]?: ID }
    >;
    const next = { ...base };

    if (pick.slotId && pick.col && next[pick.slotId]) {
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

  // Per-slot active rooms based on outing window
  const activeRoomsForSlot = (slot: any): ColKey[] => {
    if (!outingGroup) return ROOM_KEYS;

    const offsite: ColKey[] = ROOM_KEYS.filter((col) =>
      isRoomOffsiteForSlot(col, slot, outingGroup),
    );
    const active = ROOM_KEYS.filter((col) => !offsite.includes(col));

    // If everything somehow got marked offsite, fall back to all rooms
    return active.length ? active : ROOM_KEYS;
  };

  // Auto-build floating assignments once, respecting outings
  useEffect(() => {
    if (!hasFrontRoom && onsiteWorking.length && updateSchedule) {
      const next = buildAutoAssignments(
        onsiteWorking,
        TIME_SLOTS,
        activeRoomsForSlot,
      );
      updateSchedule({ floatingAssignments: next });
      push('Floating assignments updated', 'floating');
    }
  }, [hasFrontRoom, onsiteWorking, updateSchedule, push, outingGroup]);

  const handleShuffle = () => {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    if (!onsiteWorking.length || !updateSchedule) return;
    const next = buildAutoAssignments(
      onsiteWorking,
      TIME_SLOTS,
      activeRoomsForSlot,
    );
    updateSchedule({ floatingAssignments: next });
    push('Floating assignments updated', 'floating');
  };

  // Print handler — navigate to /print-floating with staff + date
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
      <SaveExit touchKey="Floating" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: isMobileWeb ? 12 : 24 }}
      >
        <View style={[WRAP, { marginBottom: 24 }]}>
          <Text
            style={{
              fontSize: isMobileWeb ? 22 : 26,
              fontWeight: '800',
              letterSpacing: 0.5,
              color: '#111827',
              marginBottom: 4,
            }}
          >
            Floating assignments
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#4b5563',
              marginBottom: 16,
            }}
          >
            Automatically and fairly assign onsite Dream Team staff across Front
            Room, Scotty, and Twins. Staff on outings and the “Everyone” helper
            are excluded.
          </Text>

          {/* Filter chips */}
          <View style={{ marginTop: 4 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#6b21a8',
                marginBottom: 8,
              }}
            >
              Filter by staff (optional)
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
                  onPress={() =>
                    setFilterStaffId((prev) =>
                      prev === s.id ? null : s.id,
                    )
                  }
                />
              ))}
            </View>
          </View>
        </View>

        {/* Main table */}
        <View style={[WRAP, { marginBottom: 24 }]}>
          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              backgroundColor: '#f9fafb',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              overflow: 'hidden',
            }}
          >
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
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: '#4b5563',
                }}
              >
                Time
              </Text>
            </View>
            <HeaderCell label="Front Room" />
            <HeaderCell label="Scotty" />
            <HeaderCell label="Twins" />
          </View>

          {/* Data rows */}
          <View
            style={{
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderColor: '#e5e7eb',
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              overflow: 'hidden',
            }}
          >
            {(TIME_SLOTS || []).map((slot, index) => {
              const slotId = String(slot.id ?? index);
              const row = getRow(slotId);

              const frStaff = row.frontRoom ? staffById[row.frontRoom] : undefined;
              const scStaff = row.scotty ? staffById[row.scotty] : undefined;
              const twStaff = row.twins ? staffById[row.twins] : undefined;

              let fr = '';
              let sc = '';
              let tw = '';

              const fso = isFSOTwinsSlot(slot);
              const isFrontOffsite = isRoomOffsiteForSlot(
                'frontRoom',
                slot,
                outingGroup,
              );
              const isScottyOffsite = isRoomOffsiteForSlot(
                'scotty',
                slot,
                outingGroup,
              );
              const isTwinsOffsite = isRoomOffsiteForSlot(
                'twins',
                slot,
                outingGroup,
              );

              if (!filterStaffId) {
                fr = frStaff?.name ?? '';
                sc = scStaff?.name ?? '';
                tw = twStaff?.name ?? '';
              } else {
                if (frStaff?.id === filterStaffId) fr = frStaff.name;
                if (scStaff?.id === filterStaffId) sc = scStaff.name;
                if (twStaff?.id === filterStaffId) tw = twStaff.name;
              }

              const isEven = index % 2 === 0;
              const baseRowStyle = isEven
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
                    ]}
                    label={
                      isFrontOffsite
                        ? 'Outing (offsite)'
                        : !filterStaffId
                        ? fr || 'Tap to assign'
                        : fr
                    }
                    gender={frStaff?.gender}
                    onPress={() => {
                      if (isFrontOffsite) return;
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
                    ]}
                    label={
                      isScottyOffsite
                        ? 'Outing (offsite)'
                        : !filterStaffId
                        ? sc || 'Tap to assign'
                        : sc
                    }
                    gender={scStaff?.gender}
                    onPress={() => {
                      if (isScottyOffsite) return;
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
                    ]}
                    label={
                      isTwinsOffsite
                        ? 'Outing (offsite)'
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
                    gender={twStaff?.gender}
                    fsoTag={fso && !isTwinsOffsite ? 'FSO Only' : undefined}
                    onPress={() => {
                      if (isTwinsOffsite) return;
                      openPicker(slotId, 'twins');
                    }}
                  />
                </View>
              );
            })}
          </View>

          {/* Shuffle + Print buttons stacked, right-aligned */}
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
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#3730a3',
                }}
              >
                Shuffle onsite staff
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
            <TouchableOpacity
              onPress={handlePrintFloating}
              activeOpacity={0.85}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ec4899',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons
                  name="print-outline"
                  size={18}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  Print Floating Assignments
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legend */}
        <View style={[WRAP, { marginTop: 24, marginBottom: 32 }]}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: '#6b21a8',
              marginBottom: 8,
            }}
          >
            Legend
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <LegendPill color="#f97316" label="Front Room" />
            <LegendPill color="#22c55e" label="Scotty" />
            {/* Twins / FSO in purple so blue stays "male staff" only */}
            <LegendPill color="#a855f7" label="Twins / FSO" />
            <LegendPill color="#64748b" label="Filtered by staff" />
          </View>
        </View>
      </ScrollView>

      {/* Picker modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.45)',
            justifyContent: 'center',
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 16,
              maxHeight: '80%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#0f172a',
                  flex: 1,
                }}
              >
                Select staff member
              </Text>
              <TouchableOpacity onPress={closePicker} hitSlop={8}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {pick?.fso && (
              <View
                style={{
                  marginBottom: 8,
                  padding: 8,
                  backgroundColor: '#fef2f2',
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: '#b91c1c',
                    fontWeight: '500',
                  }}
                >
                  FSO slot: Female staff only will show here.
                </Text>
              </View>
            )}

            <ScrollView>
              {(onsiteWorking || []).map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => handleSelect(s.id)}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e7eb',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#111827',
                    }}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <TouchableOpacity
                onPress={handleClear}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#6b7280',
                  }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={closePicker}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: '#f97316',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#ffffff',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────

function HeaderCell({ label }: { label: string }) {
  return (
    <View
      style={{
        flex: 1,
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
          fontWeight: '700',
          textTransform: 'uppercase',
          color: '#4b5563',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
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
          backgroundColor: color,
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
  );
}

function CellButton({
  style,
  label,
  gender,
  onPress,
  fsoTag,
}: {
  style?: any;
  label: string;
  gender?: string;
  onPress?: () => void;
  fsoTag?: string;
}) {
  const isEmpty =
    !label ||
    label === 'Tap to assign' ||
    label === 'Tap to assign (FSO)' ||
    label === 'Outing (offsite)';

  const genderColor =
    gender && String(gender).toLowerCase() === 'female'
      ? '#ec4899'
      : '#3b82f6';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        {
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderRightWidth: 1,
          borderRightColor: '#e5e7eb',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {!isEmpty && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: genderColor,
            }}
          />
        )}
        <Text
          style={{
            fontSize: 13,
            color:
              label === 'Outing (offsite)'
                ? '#b91c1c'
                : isEmpty
                ? '#9ca3af'
                : '#111827',
          }}
        >
          {label}
        </Text>
      </View>
      {fsoTag && label !== 'Outing (offsite)' && (
        <View style={{ marginTop: 4 }}>
          <FSOBadge>{fsoTag}</FSOBadge>
        </View>
      )}
    </TouchableOpacity>
  );
}

function FSOBadge({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: '#fef2f2',
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
