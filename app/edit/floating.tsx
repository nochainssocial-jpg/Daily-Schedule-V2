// app/edit/floating.tsx
import React, { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { FLOATING_ROOMS, TIME_SLOTS, STAFF as STATIC_STAFF } from '@/constants/data';

type ID = string;

const MAX_WIDTH = 880;

const makeKey = (slotId: string, roomId: string) => `${slotId}|${roomId}`;

const isFSOSlotId = (slotId: string) =>
  slotId === '11:00-11:30' || slotId === '13:00-13:30';

export default function EditFloatingScreen() {
  const {
    staff: scheduleStaff,
    workingStaff,
    floatingAssignments,
    updateSchedule,
  } = useSchedule();

  // Prefer staff from the schedule (after create), fallback to static constants
  const staff = (scheduleStaff && scheduleStaff.length ? scheduleStaff : STATIC_STAFF) as typeof STATIC_STAFF;

  // Use the Dream Team as the pool if set, otherwise all staff
  const staffPool = useMemo(
    () => (workingStaff && workingStaff.length ? staff.filter(s => workingStaff.includes(s.id)) : staff),
    [staff, workingStaff],
  );

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const handleCycleCell = (slotId: string, roomId: string) => {
    if (!staffPool.length) return;

    const isTwins = roomId === 'twins';
    const fsoSlot = isTwins && isFSOSlotId(slotId);

    // Eligible pool for this cell
    let eligible = staffPool;
    if (fsoSlot) {
      eligible = staffPool.filter((s) => s.gender === 'female');
      if (!eligible.length) {
        // Nothing valid to assign here
        return;
      }
    }

    const key = makeKey(slotId, roomId);
    const current = floatingAssignments || {};
    const currentId = current[key] as ID | undefined;

    // Build per‑slot assignments so we can enforce "no double‑shift" rule
    const slotAssignments: Record<string, ID | undefined> = {};
    for (const room of FLOATING_ROOMS) {
      const k = makeKey(slotId, room.id);
      const sid = current[k] as ID | undefined;
      if (sid) slotAssignments[room.id] = sid;
    }

    const usedElsewhere = new Set(
      Object.entries(slotAssignments)
        .filter(([rid, sid]) => rid !== roomId && sid)
        .map(([_, sid]) => sid as ID),
    );

    // We treat the sequence as: eligible staff in order, then "none"
    const ordered = [...eligible];
    const currentIdx = currentId ? ordered.findIndex((s) => s.id === currentId) : -1;

    let nextId: ID | undefined = undefined;

    // Try to find the next eligible staff member who isn't already used in this slot
    for (let step = 1; step <= ordered.length; step++) {
      const idx = (currentIdx + step) % ordered.length;
      const candidate = ordered[idx];
      if (!usedElsewhere.has(candidate.id as ID)) {
        nextId = candidate.id as ID;
        break;
      }
    }

    // If we didn't find a non‑conflicting candidate, we toggle to "unassigned"
    const nextAssignments = { ...current };

    if (nextId) {
      nextAssignments[key] = nextId;
    } else {
      delete nextAssignments[key];
    }

    updateSchedule({ floatingAssignments: nextAssignments });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Floating Assignments</Text>
          <Text style={styles.subtitle}>
            Each row is a time slot; each column is a room. Tap a cell to rotate through eligible staff.
            Twins has FSO (Female Staff Only) at 11:00–11:30 and 13:00–13:30.
          </Text>

          <View style={styles.tableWrapper}>
            <View style={styles.table}>
              {/* Header row */}
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.cell, styles.timeCellHeader]}>Time</Text>
                {FLOATING_ROOMS.map((room) => (
                  <View key={room.id} style={[styles.cell, styles.headerCell]}>
                    <Text style={styles.headerLabel}>{room.label}</Text>
                    {room.id === 'twins' && (
                      <Text style={styles.fsoHeaderTag}>FSO at 11:00 & 13:00</Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Body rows */}
              {TIME_SLOTS.map((slot) => (
                <View key={slot.id} style={styles.row}>
                  <View style={[styles.cell, styles.timeCell]}>
                    <Text style={styles.timeLabel}>{slot.label}</Text>
                  </View>

                  {FLOATING_ROOMS.map((room) => {
                    const key = makeKey(slot.id, room.id);
                    const staffId = floatingAssignments?.[key] as ID | undefined;
                    const st = staffId ? staffById.get(staffId) : null;
                    const fsoSlot = room.id === 'twins' && isFSOSlotId(slot.id);

                    return (
                      <TouchableOpacity
                        key={room.id}
                        style={[
                          styles.cell,
                          styles.staffCell,
                          fsoSlot && styles.fsoCell,
                          !st && styles.staffCellEmpty,
                        ]}
                        onPress={() => handleCycleCell(slot.id, room.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.staffName}>
                          {st ? st.name : 'Tap to assign'}
                        </Text>
                        {fsoSlot && (
                          <Text style={styles.fsoTag}>FSO</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
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
    backgroundColor: '#faf7fb',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3c234c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#5e4b72',
    marginBottom: 16,
  },
  tableWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5d9f2',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1e8ff',
  },
  headerRow: {
    backgroundColor: '#f7f0ff',
  },
  cell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  timeCellHeader: {
    flex: 0.9,
  },
  timeCell: {
    flex: 0.9,
    borderRightWidth: 1,
    borderRightColor: '#f1e8ff',
    backgroundColor: '#faf7ff',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3c234c',
  },
  headerCell: {
    borderLeftWidth: 1,
    borderLeftColor: '#f1e8ff',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3c234c',
  },
  fsoHeaderTag: {
    marginTop: 2,
    fontSize: 11,
    color: '#c62828',
    fontWeight: '600',
  },
  staffCell: {
    borderLeftWidth: 1,
    borderLeftColor: '#f1e8ff',
    backgroundColor: '#ffffff',
  },
  staffCellEmpty: {
    backgroundColor: '#faf7ff',
  },
  fsoCell: {
    borderTopWidth: 1,
    borderTopColor: '#f8cdd5',
    borderBottomWidth: 1,
    borderBottomColor: '#f8cdd5',
  },
  staffName: {
    fontSize: 13,
    color: '#3c234c',
  },
  fsoTag: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#c62828',
  },
});
