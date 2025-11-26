import React, { useMemo } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSchedule } from '@/hooks/schedule-store';
import SaveExit from '@/components/SaveExit';
import { PARTICIPANTS, STAFF } from '@/constants/data';

type ID = string;
  
export default function EditOutingsScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);
  
  const {
    staff = [],
    participants = [],
    workingStaff = [],
    attendingParticipants = [],
    outingGroup = null,
    updateSchedule,
  } = useSchedule() as any;

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
  const partsOnOuting = new Set<string>((current.participantIds ?? []) as string[]);

  const applyChange = (patch: Partial<typeof current>) => {
    const next = { ...current, ...patch };
    updateSchedule?.({ outingGroup: next });
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

  const clearOuting = () => {
    updateSchedule?.({ outingGroup: null });
  };

  const workingStaffObjs = staffSource.filter((s) => workingSet.has(s.id));
  const attendingPartsObjs = partsSource.filter((p) => attendingSet.has(p.id));

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="drive/outing" />
        {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="sunny-outline"
          size={220}
          color="#FFD8A8"
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
            activity (e.g. swimming). Floating and Cleaning will only use staff
            who remain on-site.
          </Text>

          {/* Outing name */}
          <View style={styles.section}>
            <Text style={styles.label}>Outing name</Text>
            <TextInput
              placeholder="e.g. Swimming @ Local Pool"
              value={current.name ?? ''}
              onChangeText={(text) => applyChange({ name: text })}
              style={styles.input}
            />
          </View>

          {/* Times */}
          <View style={[styles.section, styles.row]}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.label}>Leave time</Text>
              <TextInput
                placeholder="11:00"
                value={current.startTime ?? ''}
                onChangeText={(text) => applyChange({ startTime: text })}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={styles.label}>Return time</Text>
              <TextInput
                placeholder="15:00"
                value={current.endTime ?? ''}
                onChangeText={(text) => applyChange({ endTime: text })}
                style={styles.input}
              />
            </View>
          </View>

          {/* Staff on outing */}
          <View style={styles.section}>
            <Text style={styles.label}>Staff on outing</Text>
            <Text style={styles.helper}>
              Only Dream Team staff can be selected here.
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
                      style={[
                        styles.chip,
                        selected && styles.chipSelected,
                      ]}
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
            <Text style={styles.label}>Participants on outing</Text>
            <Text style={styles.helper}>
              Only attending participants can be selected here.
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
                      style={[
                        styles.chip,
                        selected && styles.chipSelected,
                      ]}
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
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              placeholder="e.g. Bring swimmers, towels, sunscreen"
              value={current.notes ?? ''}
              onChangeText={(text) => applyChange({ notes: text })}
              style={[styles.input, { minHeight: 60 }]}
              multiline
            />
          </View>

          {/* Clear outing */}
          <View style={styles.section}>
            <TouchableOpacity
              onPress={clearOuting}
              activeOpacity={0.9}
              style={styles.clearBtn}
            >
              <Text style={styles.clearBtnText}>Clear outing for today</Text>
            </TouchableOpacity>
            <Text style={styles.clearHint}>
              This will remove all outing details and treat all staff as on-site
              again.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECFEFF', // light cyan
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
  },
  scroll: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 160,
  },
  wrap: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  subheading: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748B',
  },
  section: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  helper: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    borderColor: '#0369A1',
    backgroundColor: '#E0F2FE',
  },
  chipLabel: {
    fontSize: 13,
    color: '#0F172A',
  },
  chipLabelSelected: {
    fontWeight: '600',
    color: '#0F172A',
  },
  empty: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  clearBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F97373',
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B91C1C',
  },
  clearHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
});
