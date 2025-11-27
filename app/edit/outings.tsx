// app/edit/outings.tsx
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
  const { width } = useWindowDimensions();

  // Sources fallback
  const staffSource = staff?.length ? staff : STAFF;
  const partsSource = participants?.length ? participants : PARTICIPANTS;

  const workingSet = useMemo(() => new Set(workingStaff), [workingStaff]);
  const attendingSet = useMemo(() => new Set(attendingParticipants), [attendingParticipants]);

  const current = outingGroup ?? {
    id: `outing-${Date.now()}`,
    name: '',
    staffIds: [] as ID[],
    participantIds: [] as ID[],
    startTime: '',
    endTime: '',
    notes: '',
  };

  const staffOnOuting = new Set(current.staffIds);
  const partsOnOuting = new Set(current.participantIds);

  const applyChange = (patch: Partial<typeof current>) => {
    updateSchedule?.({ outingGroup: { ...current, ...patch } });
    push?.('Drive / Outings updated', 'outings');
  };

  const toggleStaff = (id: ID) => {
    const next = new Set(staffOnOuting);
    next.has(id) ? next.delete(id) : next.add(id);
    applyChange({ staffIds: [...next] });
  };

  const toggleParticipant = (id: ID) => {
    const next = new Set(partsOnOuting);
    next.has(id) ? next.delete(id) : next.add(id);
    applyChange({ participantIds: [...next] });
  };

  const workingObjs = staffSource.filter((s) => workingSet.has(s.id));
  const attendingObjs = partsSource.filter((p) => attendingSet.has(p.id));

  return (
    <View style={styles.screen}>
      {/* Standard SaveExit header */}
      <SaveExit touchKey="outings" />

      {/* Web hero icon */}
      {Platform.OS === 'web' && width >= 900 && (
        <Ionicons
          name="car-outline"
          size={220}
          color="#f5a623"
          style={styles.heroIcon}
        />
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.wrap}>
          {/* TITLE */}
          <Text style={styles.heading}>Drive / Outings</Text>
          <Text style={styles.subheading}>
            Use this screen when some staff and participants are out on an excursion or appointment.
            On-site logic in other screens automatically respects who is on an outing.
          </Text>

          {/* Outing details */}
          <View style={styles.section}>
            <Text style={styles.label}>Outing name</Text>
            <TextInput
              value={current.name}
              onChangeText={(v) => applyChange({ name: v })}
              placeholder="e.g. Shopping with Shatha"
              style={styles.input}
              placeholderTextColor="#888"
            />

            <View style={[styles.row, { marginTop: 8 }]}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.label}>Start time</Text>
                <TextInput
                  value={current.startTime}
                  onChangeText={(v) => applyChange({ startTime: v })}
                  placeholder="11:00"
                  style={styles.input}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.label}>End time</Text>
                <TextInput
                  value={current.endTime}
                  onChangeText={(v) => applyChange({ endTime: v })}
                  placeholder="15:00"
                  style={styles.input}
                  placeholderTextColor="#888"
                />
              </View>
            </View>
          </View>

          {/* Staff on outing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff on outing</Text>
            <Text style={styles.sectionSub}>Only staff currently working at B2 can be added.</Text>

            {workingObjs.length === 0 ? (
              <Text style={styles.empty}>No working staff set for today.</Text>
            ) : (
              <View style={styles.chipGrid}>
                {workingObjs.map((st) => {
                  const selected = staffOnOuting.has(st.id);
                  return (
                    <TouchableOpacity
                      key={st.id}
                      onPress={() => toggleStaff(st.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
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
            <Text style={styles.sectionSub}>Only attending participants can be added.</Text>

            {attendingObjs.length === 0 ? (
              <Text style={styles.empty}>No attending participants set for today.</Text>
            ) : (
              <View style={styles.chipGrid}>
                {attendingObjs.map((p) => {
                  const selected = partsOnOuting.has(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => toggleParticipant(p.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
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
              onChangeText={(v) => applyChange({ notes: v })}
              placeholder="Anything important about this outing..."
              placeholderTextColor="#888"
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
    backgroundColor: '#FFE4CC', // pastel peach (unchanged)
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 0.4,
  },
  scroll: { flex: 1 },
  wrap: {
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  // HEADER AREA
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4b164c', // Dream Team purple
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#2d2d2d',
    marginBottom: 20,
  },

  // TEXT + INPUTS
  section: { marginTop: 18 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cfcfcf',
    backgroundColor: '#fff',   // WHITE input fields
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#000',              // BLACK text
  },
  notesInput: {
    height: 90,
    textAlignVertical: 'top',
  },

  // SECTION HEADINGS
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  sectionSub: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
  },

  // CHIPS
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  chipSelected: {
    backgroundColor: '#F54FA5',    // pink
    borderColor: '#F54FA5',
  },
  chipLabel: {
    color: '#333',
    fontSize: 13,
  },
  chipLabelSelected: {
    color: '#fff',
    fontWeight: '700',
  },

  empty: {
    fontSize: 13,
    color: '#555',
  },
});
