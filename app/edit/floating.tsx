// @ts-nocheck
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import Chip from '@/components/Chip';
import { TIME_SLOTS } from '@/constants/data';

const WRAP = {
  width: '100%',
  maxWidth: 880,
  alignSelf: 'center',
  paddingHorizontal: 12,
};

const ROOM_IDS = {
  frontRoom: 'frontRoom',
  scotty: 'scotty',
  twins: 'twins',
};

const ROOM_KEYS = ['frontRoom', 'scotty', 'twins'] as const;

function keyOf(slotId, col) {
  return `${slotId}|${ROOM_IDS[col]}`;
}

function slotLabel(slot) {
  if (!slot) return '';
  const raw =
    slot.displayTime ||
    (slot.startTime && slot.endTime
      ? `${slot.startTime} - ${slot.endTime}`
      : '');
  return String(raw).replace(/\s/g, '').toLowerCase();
}

// Exactly these are FSO slots for Twins
function isFSOTwinsSlot(slot) {
  const lbl = slotLabel(slot);
  if (!lbl) return false;
  return (
    lbl === '11:00am-11:30am' ||
    lbl === '11:00-11:30' ||
    lbl === '1:00pm-1:30pm' ||
    lbl === '13:00-13:30'
  );
}

function isAfter2PM(slot) {
  const lbl = slotLabel(slot);
  if (!lbl) return false;
  return (
    lbl.startsWith('2:00pm-') ||
    lbl.startsWith('14:00-') ||
    lbl.includes('2:00pm-2:30pm') ||
    lbl.includes('14:00-14:30')
  );
}

function isFemale(staff) {
  return (
    staff &&
    String(staff.gender || '').toLowerCase() === 'female'
  );
}

function isAntoinette(staff) {
  if (!staff) return false;
  const name = String(staff.name || '').toLowerCase();
  return name.includes('antoinette');
}

// Build a full floating schedule for all slots/rooms
function buildAutoAssignments(working, timeSlots) {
  if (!working || !working.length) return {};

  const next = {};
  const usage = {};
  working.forEach((s) => {
    usage[s.id] = 0;
  });

  let prevSlotStaff = new Set();

  (timeSlots || []).forEach((slot, idx) => {
    const slotId = String(slot.id ?? idx);
    const taken = new Set();
    const thisSlotStaff = new Set();

    ROOM_KEYS.forEach((col) => {
      let candidates = working.filter((s) => !taken.has(s.id));

      // FSO filter on Twins
      if (col === 'twins' && isFSOTwinsSlot(slot)) {
        candidates = candidates.filter(isFemale);
      }

      // Antoinette only after 2pm
      const after2 = isAfter2PM(slot);
      candidates = candidates.filter(
        (s) => !isAntoinette(s) || after2,
      );

      if (!candidates.length) return;

      // Try to avoid back-to-back slots
      const cooled = candidates.filter(
        (s) => !prevSlotStaff.has(s.id),
      );
      if (cooled.length) {
        candidates = cooled;
      }

      // Fair usage: pick among least used, then random
      let minCount = Infinity;
      candidates.forEach((s) => {
        const c = usage[s.id] ?? 0;
        if (c < minCount) minCount = c;
      });
      const leastUsed = candidates.filter(
        (s) => (usage[s.id] ?? 0) === minCount,
      );
      const chosen =
        leastUsed[
          Math.floor(Math.random() * leastUsed.length)
        ];

      usage[chosen.id] = (usage[chosen.id] ?? 0) + 1;
      next[keyOf(slotId, col)] = chosen.id;
      taken.add(chosen.id);
      thisSlotStaff.add(chosen.id);
    });

    prevSlotStaff = thisSlotStaff;
  });

  return next;
}

export default function FloatingScreen() {
  const {
    staff = [],
    workingStaff = [],
    floatingAssignments = {},
    updateSchedule,
  } = useSchedule();

  const staffById = useMemo(() => {
    const m = {};
    (staff || []).forEach((s) => {
      m[s.id] = s;
    });
    return m;
  }, [staff]);

  const working = useMemo(
    () =>
      (staff || []).filter((s) =>
        (workingStaff || []).includes(s.id),
      ),
    [staff, workingStaff],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pick, setPick] = useState(null); // { slotId, col, fso }

  const [autoDone, setAutoDone] = useState(false);

  const getCellStaffId = (slotId, col) =>
    floatingAssignments?.[keyOf(slotId, col)];

  const nameOf = (id) =>
    id ? staffById[id]?.name ?? '' : '';

  const openPicker = (slotId, col) => {
    const slot = (TIME_SLOTS || []).find(
      (s) => String(s.id) === String(slotId),
    );
    setPick({
      slotId,
      col,
      fso: col === 'twins' && isFSOTwinsSlot(slot),
    });
    setPickerOpen(true);
  };

  const choose = (id) => {
    if (!pick || !pick.slotId || !pick.col) return;
    const key = keyOf(pick.slotId, pick.col);
    const next = { ...(floatingAssignments || {}) };
    next[key] = id;
    updateSchedule?.({ floatingAssignments: next });
    setPickerOpen(false);
  };

  const clearCell = () => {
    if (!pick || !pick.slotId || !pick.col) return;
    const key = keyOf(pick.slotId, pick.col);
    const next = { ...(floatingAssignments || {}) };
    delete next[key];
    updateSchedule?.({ floatingAssignments: next });
    setPickerOpen(false);
  };

  const autoAssignAll = useCallback(() => {
    const next = buildAutoAssignments(working, TIME_SLOTS);
    updateSchedule?.({ floatingAssignments: next });
  }, [working, updateSchedule]);

  // First visit after create: if Front Room is completely empty,
  // auto-assign everything once.
  useEffect(() => {
    if (autoDone) return;

    const hasFrontRoom = Object.keys(
      floatingAssignments || {},
    ).some((k) => k.endsWith('|frontRoom'));

    if (!hasFrontRoom && working.length) {
      autoAssignAll();
      setAutoDone(true);
    }
  }, [autoDone, floatingAssignments, working, autoAssignAll]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={WRAP}>
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
          <Text
            style={{ color: '#64748b', marginBottom: 12 }}
          >
            Tap a cell to assign a staff member. Twins FSO slots
            require a female staff.
          </Text>

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

            {(TIME_SLOTS || []).map((slot, idx) => {
              const slotId = String(slot.id ?? idx);

              const frId = getCellStaffId(slotId, 'frontRoom');
              const scId = getCellStaffId(slotId, 'scotty');
              const twId = getCellStaffId(slotId, 'twins');

              const frStaff = staffById[frId];
              const scStaff = staffById[scId];
              const twStaff = staffById[twId];

              const fr = nameOf(frId);
              const sc = nameOf(scId);
              const tw = nameOf(twId);

              const fso = isFSOTwinsSlot(slot);

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
                        `${slot.startTime ?? ''} - ${
                          slot.endTime ?? ''
                        }`}
                    </Text>
                  </View>

                  {/* Front Room */}
                  <CellButton
                    style={{ flex: 1 }}
                    label={fr || 'Tap to assign'}
                    gender={frStaff?.gender}
                    onPress={() =>
                      openPicker(slotId, 'frontRoom')
                    }
                  />

                  {/* Scotty */}
                  <CellButton
                    style={{ flex: 1 }}
                    label={sc || 'Tap to assign'}
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
                      tw
                        ? fso
                          ? `${tw} (FSO)`
                          : tw
                        : fso
                        ? 'Tap to assign (FSO)'
                        : 'Tap to assign'
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
          <View
            style={{
              marginTop: 12,
              alignItems: 'flex-end',
            }}
          >
            <TouchableOpacity
              onPress={autoAssignAll}
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
        </View>
      </ScrollView>

      {/* Staff picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
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

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {(working || [])
                .filter(
                  (s) =>
                    !pick?.fso || isFemale(s),
                )
                .map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    onPress={() => choose(s.id)}
                  />
                ))}
            </View>

            {pick?.fso &&
              (working || []).every((s) => !isFemale(s)) && (
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
                    No eligible female staff on the Dream Team
                    for this slot.
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
                onPress={() => setPickerOpen(false)}
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

function HeaderCell({ label, flex = 1 }) {
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

function CellButton({ label, onPress, style, gender, fsoTag }) {
  const isEmpty =
    String(label).toLowerCase().startsWith('tap to assign');

  const genderColor =
    String(gender || '').toLowerCase() === 'female'
      ? '#fb7185' // pink
      : String(gender || '').toLowerCase() === 'male'
      ? '#60a5fa' // blue
      : '#cbd5e1'; // neutral

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
            fontWeight: '400',
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
              fontWeight: '600',
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

function Tag({ children }) {
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
        {children}
      </Text>
    </View>
  );
}
