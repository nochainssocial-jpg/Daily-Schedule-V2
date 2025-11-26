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

function buildAutoAssignments(
  working: any[],
  timeSlots: any[],
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

    ROOM_KEYS.forEach((col) => {
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

  // All working staff (Dream Team)
  const working = useMemo(
    () => (staff || []).filter((s: any) => (workingStaff || []).includes(s.id)),
    [staff, workingStaff],
  );

  // ⭐ Onsite working staff = working staff NOT on outing
  const onsiteWorking = useMemo(() => {
    if (!outingGroup || !Array.isArray(working)) return working || [];
    const excluded = new Set<string>((outingGroup.staffIds ?? []) as string[]);
    return (working || []).filter((s: any) => !excluded.has(s.id));
  }, [working, outingGroup]);

  const [filterStaffId, setFilterStaffId] = useState<string | null>(null);

  const sortedWorking = useMemo(
    () =>
      (onsiteWorking || [])
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

  const choose = (id: string) => {
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

  useEffect(() => {
    // 🔥 Auto-build using *onsite* working staff only
    if (!hasFrontRoom && onsiteWorking.length && updateSchedule) {
      const next = buildAutoAssignments(onsiteWorking, TIME_SLOTS);
      updateSchedule({ floatingAssignments: next });
      push('Floating assignments updated', 'floating');
    }
  }, [hasFrontRoom, onsiteWorking, updateSchedule]);

  const handleShuffle = () => {
    if (!onsiteWorking.length || !updateSchedule) return;
    const next = buildAutoAssignments(onsiteWorking, TIME_SLOTS);
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
    <View style={{ flex: 1, backgroundColor: '#EFF6FF' }}>
      <SaveExit touchKey="floating" />
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="shuffle-outline"
          size={220}
          color="#93C5FD"
          style={{
            position: 'absolute',
            top: '25%',
            left: '10%',
            opacity: 1,
            zIndex: 0,
          }}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={WRAP as any}>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '800',
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
                    style={{ flex: 1 }}
                    label={!filterStaffId ? (fr || 'Tap to assign') : fr}
                    gender={frStaff?.gender}
                    onPress={() => openPicker(slotId, 'frontRoom')}
                  />

                  {/* Scotty */}
                  <CellButton
                    style={{ flex: 1 }}
                    label={!filterStaffId ? (sc || 'Tap to assign') : sc}
                    gender={scStaff?.gender}
                    onPress={() => openPicker(slotId, 'scotty')}
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
                    fsoTag={fso}
                    onPress={() => openPicker(slotId, 'twins')}
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
                  color="#OOA86A"
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
  const isEmpty = label.toLowerCase().startsWith('tap to assign');

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
