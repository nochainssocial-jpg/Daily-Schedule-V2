import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import SaveExit from '@/components/SaveExit';
import Chip from '@/components/Chip';
import * as Data from '@/constants/data';

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

// Twins slots that are FSO (Female Staff Only)
function isFSOTwinsSlot(slot?: any): boolean {
  if (!slot) return false;
  const label = String(
    slot.displayTime || `${slot.startTime ?? ''}-${slot.endTime ?? ''}`,
  ).toLowerCase();
  // 11:00–11:30 and 13:00–13:30
  return (
    label.includes('11:00') ||
    label.includes('11.00') ||
    label.includes('13:00') ||
    label.includes('13.00')
  );
}

// Helper: is this slot at or after 2:00pm (for Antoinette rule)
function isAfter2PM(slot?: any): boolean {
  if (!slot) return false;
  const label = String(
    slot.displayTime || `${slot.startTime ?? ''}-${slot.endTime ?? ''}`,
  ).toLowerCase();
  return label.includes('2:00') || label.includes('14:00');
}

export default function FloatingScreen() {
  const {
    staff = [],
    workingStaff = [],
    floatingAssignments = {},
    updateSchedule,
    touch,
  } = useSchedule() as any;

  const staffById = useMemo(() => {
    const m: Record<string, any> = {};
    (staff || []).forEach((s: any) => {
      m[s.id] = s;
    });
    return m;
  }, [staff]);

  const working = useMemo(
    () => (staff || []).filter((s: any) => (workingStaff || []).includes(s.id)),
    [staff, workingStaff],
  );

  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<{
    slotId?: string;
    col?: ColKey;
    fso?: boolean;
  } | null>(null);

  const [autoDone, setAutoDone] = useState(false);

  const getRow = (slotId: string) =>
    (floatingAssignments || {})[slotId] || {};
  const nameOf = (id?: string) => (id ? staffById[id]?.name ?? '' : '');

  const openPicker = (slotId: string, col: ColKey) => {
    const slot = (TIME_SLOTS || []).find(
      s => String(s.id) === String(slotId),
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
    touch?.('floating', 'FloatingScreen');
    setOpen(false);
  };

  const clearCell = () => {
    if (!pick?.slotId || !pick.col) return;
    const next = { ...(floatingAssignments || {}) } as any;
    if (next[pick.slotId]) {
      delete next[pick.slotId][pick.col];
    }
    updateSchedule?.({ floatingAssignments: next });
    touch?.('floating', 'FloatingScreen');
    setOpen(false);
  };

  // 🔁 Auto / shuffle logic
  const autoAssignAll = useCallback(() => {
    const list = working || [];
    if (!list.length) return;

    const usage: Record<string, number> = {};
    list.forEach((s: any) => {
      usage[s.id] = 0;
    });

    const next: Record<string, any> = {};

    const chooseFor = (slot: any, col: ColKey, taken: Set<string>): string | undefined => {
      let candidates = list.filter((s: any) => !taken.has(s.id));

      // Twins FSO: only female staff
      if (col === 'twins' && isFSOTwinsSlot(slot)) {
        candidates = candidates.filter(
          (s: any) => String(s.gender || '').toLowerCase() === 'female',
        );
      }

      // Antoinette rule: only after 2:00pm
      const after2 = isAfter2PM(slot);
      candidates = candidates.filter((s: any) => {
        const name = String(s.name || '').toLowerCase();
        const isAntoinette = name.includes('antoinette');
        if (isAntoinette && !after2) return false;
        return true;
      });

      if (!candidates.length) return undefined;

      // Fair usage: pick amongst least-used, randomly
      let minCount = Infinity;
      candidates.forEach((s: any) => {
        const c = usage[s.id] ?? 0;
        if (c < minCount) minCount = c;
      });

      const leastUsed = candidates.filter(
        (s: any) => (usage[s.id] ?? 0) === minCount,
      );
      const chosen =
        leastUsed[Math.floor(Math.random() * leastUsed.length)];

      usage[chosen.id] = (usage[chosen.id] ?? 0) + 1;
      return chosen.id;
    };

    (TIME_SLOTS || []).forEach((slot: any, idx: number) => {
      const slotId = String(slot.id ?? idx);
      const taken = new Set<string>();
      const row: any = {};

      // Front Room
      const frId = chooseFor(slot, 'frontRoom', taken);
      if (frId) {
        row.frontRoom = frId;
        taken.add(frId);
      }

      // Scotty
      const scId = chooseFor(slot, 'scotty', taken);
      if (scId) {
        row.scotty = scId;
        taken.add(scId);
      }

      // Twins
      const twId = chooseFor(slot, 'twins', taken);
      if (twId) {
        row.twins = twId;
        taken.add(twId);
      }

      if (Object.keys(row).length) {
        next[slotId] = row;
      }
    });

    updateSchedule?.({ floatingAssignments: next });
    touch?.('floating', 'FloatingScreen');
  }, [working, updateSchedule, touch]);

  // First-time auto-populate if there are working staff but no assignments yet
  useEffect(() => {
    if (autoDone) return;
    const hasAny =
      floatingAssignments &&
      Object.keys(floatingAssignments).length > 0;

    if (!hasAny && (working || []).length > 0) {
      autoAssignAll();
      setAutoDone(true);
    }
  }, [autoDone, floatingAssignments, working, autoAssignAll]);

  return (
    <View style={{ flex: 1 }}>
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
              const fr = frStaff?.name ?? '';
              const sc = scStaff?.name ?? '';
              const tw = twStaff?.name ?? '';
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
                        `${slot.startTime ?? ''} - ${slot.endTime ?? ''}`}
                    </Text>
                  </View>

                  {/* Front Room */}
                  <CellButton
                    style={{ flex: 1 }}
                    label={fr || 'Tap to assign'}
                    gender={frStaff?.gender}
                    onPress={() => openPicker(slotId, 'frontRoom')}
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

      {/* Save / Exit bar */}
      <View style={[WRAP as any, { marginTop: 8, marginBottom: 16 }]}>
        <SaveExit touchKey="floating" />
      </View>

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
              {(working || [])
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
              (working || []).every(
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
