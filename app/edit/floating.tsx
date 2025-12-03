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
import NotificationToaster from '@/components/NotificationToaster';

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

const ROOM_PARTICIPANT_MAP: Partial<Record<ColKey, ID>> = (() => {
  const map: Partial<Record<ColKey, ID>> = {};
  const participants = ((Data as any).PARTICIPANTS || []) as any[];
  participants.forEach((p: any) => {
    const name = String(p?.name || '').toLowerCase();
    if (!map.frontRoom && name.includes('front') && name.includes('room')) {
      map.frontRoom = String(p.id);
    }
    if (!map.scotty && name.includes('scotty')) {
      map.scotty = String(p.id);
    }
    if (!map.twins && name.includes('twins')) {
      map.twins = String(p.id);
    }
  });
  return map;
})();

function slotLabel(slot: any): string {
  if (!slot) return '';
  const raw =
    slot.displayTime ||
    (slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : '');
  return String(raw).replace(/\s/g, '').toLowerCase();
}

function isFSOTwinsSlot(slot: any): boolean {
  const label = slotLabel(slot);
  if (!label) return false;

  // Allow for both 24-hour and "2:00pm-2:30pm" forms
  return (
    label.startsWith('11:45am-') ||
    label.startsWith('11:45-') ||
    label.includes('11:45am-12:15pm') ||
    label.includes('11:45-12:15')
  );
}

function isAfter2PM(slot: any): boolean {
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

function buildAutoAssignments(
  working: any[],
  timeSlots: any[],
  activeRooms: ColKey[] = ROOM_KEYS,
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

    activeRooms.forEach((col) => {
      let candidates = working.filter((s) => !thisSlotStaff.has(s.id));

      if (!candidates.length) return;

      if (col === 'twins' && fso) {
        const females = candidates.filter((s) => isFemale(s));
        if (females.length) {
          candidates = females;
        }
      }

      if (col === 'twins') {
        if (after2) {
          const antoinettes = candidates.filter((s) => isAntoinette(s));
          if (antoinettes.length) {
            candidates = antoinettes;
          }
        }
      }

      const filtered = candidates.filter((s) => !prevSlotStaff.has(s.id));
      if (filtered.length) {
        candidates = filtered;
      }

      candidates.sort((a, b) => {
        const ta = totalUsage[a.id] ?? 0;
        const tb = totalUsage[b.id] ?? 0;
        if (ta !== tb) return ta - tb;

        const ra = roomUsage[a.id]?.[col] ?? 0;
        const rb = roomUsage[b.id]?.[col] ?? 0;
        if (ra !== rb) return ra - rb;

        if (col === 'twins') {
          const wa = twinsUsage[a.id] ?? 0;
          const wb = twinsUsage[b.id] ?? 0;
          if (wa !== wb) return wa - wb;
        }

        return String(a.name || '').localeCompare(String(b.name || ''));
      });

      const minUsage = candidates.length
        ? totalUsage[candidates[0].id] ?? 0
        : 0;
      const best = candidates.filter(
        (s) => (totalUsage[s.id] ?? 0) === minUsage,
      );

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

  const outingParticipantSet = useMemo(
    () =>
      new Set<string>(
        ((outingGroup?.participantIds ?? []) as (string | number)[]).map((id) =>
          String(id),
        ),
      ),
    [outingGroup],
  );

  const offsiteRoomKeys = useMemo(
    () =>
      ROOM_KEYS.filter((col) => {
        const pid = ROOM_PARTICIPANT_MAP[col];
        return pid && outingParticipantSet.has(String(pid));
      }),
    [outingParticipantSet],
  );

  const activeRoomKeys = useMemo(
    () => ROOM_KEYS.filter((col) => !offsiteRoomKeys.includes(col)),
    [offsiteRoomKeys],
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

  // Automatically reshuffle floating assignments when an outing makes a room offsite
  useEffect(() => {
    if (!isAdmin) return;
    if (!onsiteWorking.length || !updateSchedule) return;
    if (!offsiteRoomKeys.length) return;
    if (!activeRoomKeys.length) return;

    const hasOffsiteAssignments = Object.values(floatingAssignments || {}).some(
      (row: any) =>
        row &&
        offsiteRoomKeys.some((col) => (row as any)[col]),
    );

    const hasAnyAssignments = Object.values(floatingAssignments || {}).some(
      (row: any) =>
        row &&
        ((row as any).frontRoom || (row as any).scotty || (row as any).twins),
    );

    // If there are already assignments but none in offsite rooms, don't override manual tweaks
    if (hasAnyAssignments && !hasOffsiteAssignments) {
      return;
    }

    const next = buildAutoAssignments(onsiteWorking, TIME_SLOTS, activeRoomKeys);
    updateSchedule({ floatingAssignments: next });
    push('Floating assignments updated for outing changes', 'floating');
  }, [
    isAdmin,
    onsiteWorking,
    updateSchedule,
    floatingAssignments,
    offsiteRoomKeys,
    activeRoomKeys,
    push,
  ]);

  useEffect(() => {
    // 🔥 Auto-build using *onsite* working staff only
    if (!hasFrontRoom && onsiteWorking.length && updateSchedule) {
      const next = buildAutoAssignments(onsiteWorking, TIME_SLOTS, activeRoomKeys);
      updateSchedule({ floatingAssignments: next });
      push('Floating assignments updated', 'floating');
    }
  }, [hasFrontRoom, onsiteWorking, updateSchedule, activeRoomKeys, push]);

  const handleShuffle = () => {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }
    if (!onsiteWorking.length || !updateSchedule) return;
    const next = buildAutoAssignments(onsiteWorking, TIME_SLOTS, activeRoomKeys);
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
      <NotificationToaster />
      <SaveExit touchKey="floating" />
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="arrow-back-circle"
          size={32}
          color="#6b21a8"
          style={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }}
          onPress={() => router.push('/edit')}
        />
      )}

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
            Automatically and fairly assign onsite Dream Team staff across Front Room, Scotty,
            and Twins. Staff on outings and the “Everyone” helper are excluded.
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
                    setFilterStaffId((prev) => (prev === s.id ? null : s.id))
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
                Front Room
              </Text>
            </View>
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
                Scotty
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 10,
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
                Twins
              </Text>
            </View>
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
              const isScottyOffsite = offsiteRoomKeys.includes('scotty');

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
                    style={{ flex: 1 }}
                    label={!filterStaffId ? (fr || 'Tap to assign') : fr}
                    gender={frStaff?.gender}
                    onPress={() => openPicker(slotId, 'frontRoom')}
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
                          ? (sc || 'Tap to assign')
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
                    ]}
                    label={
                      !filterStaffId
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
                    onPress={() => openPicker(slotId, 'twins')}
                    fsoTag={fso ? 'FSO Only' : undefined}
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
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#3730a3',
                }}
              >
                Shuffle onsite staff
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Print button */}
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
            <LegendPill color="#3b82f6" label="Twins / FSO" />
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
  const isEmpty = !label || label === 'Tap to assign' || label === 'Tap to assign (FSO)';

  const genderColor =
    gender && String(gender).toLowerCase() === 'female' ? '#ec4899' : '#3b82f6';

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
            color: isEmpty ? '#9ca3af' : '#111827',
          }}
        >
          {label}
        </Text>
      </View>
      {fsoTag && (
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
