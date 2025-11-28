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
import { useIsAdmin } from '@/hooks/access-control';
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
        'B2 read-only mode: changes are disabled on this device',
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Drive</Text>
          </View>
          <Text style={styles.title}>Drive / Outings</Text>
        </View>
        <View style={styles.headerRight}>
          {Platform.OS === 'web' && (
            <View style={styles.webInfoBubble}>
              <Text style={styles.webInfoText}>
                This section is optional and used for planned outings / drives.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Big icon for web only */}
      {Platform.OS === 'web' && (
        <Ionicons
          name="car-sport-outline"
          size={180}
          color="rgba(0,0,0,0.04)"
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={[
            styles.inner,
            width >= 1024 && { maxWidth: 880, alignSelf: 'center' },
          ]}
        >
          {/* Outing name / basic info */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Outing details</Text>

            <View style={{ marginBottom: 10 }}>
              <Text style={styles.label}>Name of outing / destination</Text>
              <TextInput
                value={current.name}
                onChangeText={handleNameChange}
                placeholder="Eg. Cronulla beach picnic"
                style={styles.input}
              />
            </View>

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
                  placeholder="14:00"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          {/* Staff on outing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff on outing</Text>
            {workingStaffObjs.length === 0 ? (
              <Text style={styles.empty}>
                No staff assigned to today&apos;s schedule yet.
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
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes for outing</Text>
            <TextInput
              value={current.notes}
              onChangeText={handleNotesChange}
              placeholder="Eg. Bring beach towels, sunscreen, plenty of water and snacks."
              style={[styles.input, styles.notesInput]}
              multiline
            />
          </View>

          {/* Save & Exit */}
          <View style={{ marginTop: 16, marginBottom: 32 }}>
            <SaveExit touchKey="transport" />
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
    right: -40,
    top: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FED7AA',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    color: '#7C2D12',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7C2D12',
  },
  headerRight: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  webInfoBubble: {
    maxWidth: 280,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  webInfoText: {
    fontSize: 12,
    color: '#7C2D12',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  inner: {
    paddingVertical: 12,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C2D12',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C2D12',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF7ED',
    fontSize: 14,
    color: '#7C2D12',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  chipSelected: {
    backgroundColor: '#FDBA74',
    borderColor: '#FB923C',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C2D12',
  },
  chipLabelSelected: {
    color: '#7C2D12',
  },
  empty: {
    fontSize: 13,
    color: '#7C2D12',
    opacity: 0.8,
  },
});
