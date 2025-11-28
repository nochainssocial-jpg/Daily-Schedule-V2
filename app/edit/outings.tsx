import React, { useMemo } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSchedule } from '@/hooks/schedule-store';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';
import { PARTICIPANTS, STAFF } from '@/constants/data';

type ID = string;

export default function OutingsScreen() {
  const {
    staff,
    participants,
    workingStaff = [],
    attendingParticipants = [],
    outingGroup = null,
    updateSchedule,
  } = useSchedule() as any;

  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;
  const { width } = useWindowDimensions();

  // Fallback to constants if schedule hasn’t customised staff/participants yet
  const staffSource = (staff && staff.length ? staff : STAFF) as typeof STAFF;
  const partsSource = (participants && participants.length
    ? participants
    : PARTICIPANTS) as typeof PARTICIPANTS;

  const workingSet = useMemo(
    () => new Set<string>(workingStaff || []),
    [workingStaff],
  );
  const attendingSet = useMemo(
    () => new Set<string>(attendingParticipants || []),
    [attendingParticipants],
  );

  const current = outingGroup ?? {
    id: `outing-${Date.now()}`,
    name: '',
    staffIds: [] as ID[],
    participantIds: [] as ID[],
    startTime: '',
    endTime: '',
    notes: '',
  };

  const staffOnOuting = new Set<string>((current.staffIds ?? []) as string[]);
  const partsOnOuting = new Set<string>(
    (current.participantIds ?? []) as string[],
  );

  const applyChange = (patch: Partial<typeof current>) => {
    if (readOnly) {
      push?.(
        'B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)',
        'general',
      );
      return;
    }

    const next = { ...current, ...patch };
    updateSchedule?.({ outingGroup: next });
    // 🔔 Toast for Drive / Outings changes
    push?.('Drive / Outings updated', 'outings');
  };

  const toggleStaff = (id: ID) => {
    const next = new Set(staffOnOuting);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    applyChange({ staffIds: Array.from(next) });
  };

  const toggleParticipant = (id: ID) => {
    const next = new Set(partsOnOuting);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    applyChange({ participantIds: Array.from(next) });
  };

  const handleNameChange = (value: string) => {
    applyChange({ name: value });
  };

  const handleTimeChange = (key: 'startTime' | 'endTime', value: string) => {
    applyChange({ [key]: value });
  };

  const handleNotesChange = (value: string) => {
    applyChange({ notes: value });
  };

  const workingStaffObjs = staffSource.filter((s) => workingSet.has(s.id));
  const attendingPartsObjs = partsSource.filter((p) =>
    attendingSet.has(p.id),
  );

  return (
    <View style={styles.screen}>
      {/* Header bar + Save & Exit */}
      <SaveExit touchKey="Drive / Outings" />

      {/* Desktop-only hero icon */}
      {Platform.OS === 'web' && width >= 900 && (
        <Ionicons
          name="car-outline"
          size={220}
          color="#FF8F2E"
          style={styles.heroIcon}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrap}>
          <Text style={styles.heading}>Drive / Outings</Text>
          <Text style={styles.subheading}>
            Use this screen when some staff and participants are out on an
            excursion or appointment. Onsite-only logic in other screens will
            automatically respect who is on outing.
          </Text>

          {/* Outing title + time */}
          <View style={styles.section}>
            <Text style={styles.label}>Outing name</Text>
            <TextInput
              value={current.name}
              onChangeText={handleNameChange}
              placeholder="e.g. Shopping with Shatha"
              style={styles.input}
            />
            <View style={[styles.row, { marginTop: 8 }]}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.label}>Start time</Text>
                <TextInput
                  value={current.startTime}
                  onChangeText={(v) => handleTimeChange('startTime', v)}
                  placeholder="11:00"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.label}>End time</Text>
                <TextInput
                  value={current.endTime}
                  onChangeText={(v) => handleTimeChange('endTime', v)}
                  placeholder="15:00"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          {/* Staff on outing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff on outing</Text>
            <Text style={styles.sectionSub}>
              Only staff currently working at B2 can be added to this outing.
            </Text>

            {workingStaffObjs.length === 0 ? (
              <Text style={styles.empty}>
                No working staff set for this schedule yet.
              </Text>
            ) : (
              <View style={styles.chipGrid}>
                {workingStaffObjs.map((st) => {
                  const selected = staffOnOuting.has(st.id);
                  return (
                    <TouchableOpacity
                      key={st.id}
                      onPress={() => toggleStaff(st.id)}
                      activeOpacity={0.85}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          selected && styles.chipLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {st.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Participants on outing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants on outing</Text>
            <Text style={styles.sectionSub}>
              Only attending participants can be added to this outing.
            </Text>

            {attendingPartsObjs.length === 0 ? (
              <Text style={styles.empty}>
                No attending participants set for this schedule yet.
              </Text>
            ) : (
              <View style={styles.chipGrid}>
                {attendingPartsObjs.map((p) => {
                  const selected = partsOnOuting.has(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => toggleParticipant(p.id)}
                      activeOpacity={0.85}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          selected && styles.chipLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (optional)</Text>
            <TextInput
              value={current.notes}
              onChangeText={handleNotesChange}
              placeholder="Anything important about this outing..."
              style={[styles.input, styles.notesInput]}
              multiline
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFE4CC', // keep original peach background
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
  },
  scroll: {
    flex: 1,
  },
  wrap: {
    flex: 1,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4B164C', // match Dream Team purple
  },
  subheading: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000', // black labels
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB', // neutral border
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF', // white fields
    fontSize: 14,
    color: '#000', // black text
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000', // black section titles
  },
  sectionSub: {
    fontSize: 12,
    color: '#111827',
    marginTop: 4,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FED7AA', // keep original chip border colour
    backgroundColor: '#FFF',
  },
  chipSelected: {
    backgroundColor: '#FDBA74',
    borderColor: '#FB923C',
  },
  chipLabel: {
    fontSize: 13,
    color: '#000', // black chip text
  },
  chipLabelSelected: {
    fontWeight: '600',
    color: '#000', // black chip text even when selected
  },
  empty: {
    fontSize: 13,
    color: '#111827',
  },
});
