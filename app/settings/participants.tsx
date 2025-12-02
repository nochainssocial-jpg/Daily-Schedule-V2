import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';

const MAX_WIDTH = 880;

type ParticipantRow = {
  id: string;
  name: string;
  is_active?: boolean | null;
  complexity_level?: number | null;
  behaviour_profile?: string | null; // CSV string
  support_needs?: string | null;
};

type Option<T = any> = {
  label: string;
  short: string;
  value: T;
};

export default function ParticipantsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);

  const [newName, setNewName] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const showWebBranding = Platform.OS === 'web';

  async function loadParticipants() {
    setLoading(true);
    const { data } = await supabase
      .from('participants')
      .select('*')
      .order('name', { ascending: true });

    if (data) setParticipants(data as ParticipantRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadParticipants();
  }, []);

  async function updateParticipant(
    id: string,
    field: keyof ParticipantRow,
    value: any,
  ) {
    await supabase.from('participants').update({ [field]: value }).eq('id', id);
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  async function addParticipant() {
    const name = newName.trim();
    if (!name) return;

    setSavingNew(true);
    const { data, error } = await supabase
      .from('participants')
      .insert({ name, is_active: true })
      .select()
      .single();

    setSavingNew(false);

    if (!error && data) {
      setParticipants(prev =>
        [...prev, data as ParticipantRow].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewName('');
    }
  }

  function confirmDeleteParticipant(p: ParticipantRow) {
    Alert.alert(
      'Remove participant',
      `Remove ${p.name} from the participants list? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('participants').delete().eq('id', p.id);
            setParticipants(prev => prev.filter(x => x.id !== p.id));
          },
        },
      ],
    );
  }

  // ----- Complexity: single-select (1–4) -----
  const complexityOptions: Option<number | null>[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Low support', short: 'Low', value: 1 },
    { label: 'Medium support', short: 'Med', value: 2 },
    { label: 'High support', short: 'High', value: 3 },
    { label: 'Very high / complex', short: 'Comp', value: 4 },
  ];

  // ----- Behaviour: MULTI-select -----
  const behaviourOptions: Option<string | null>[] = [
    { label: 'Clear all', short: '-', value: null },
    { label: 'Behavioural', short: 'Behav', value: 'behavioural' },
    { label: 'High anxiety', short: 'Anx', value: 'high_anxiety' },
    { label: 'Routine sensitive', short: 'Rout', value: 'routine_sensitive' },
    { label: 'Sensory / noise', short: 'Sens', value: 'sensory' },
    { label: 'Physical support', short: 'Phys', value: 'physical_support' },
  ];

  function parseBehaviour(value: string | null | undefined): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function behaviourToString(values: string[]): string | null {
    if (!values.length) return null;
    return values.join(',');
  }

  function renderComplexityPills(
    id: string,
    currentValue: number | null | undefined,
  ) {
    return (
      <View style={styles.pillRow}>
        {complexityOptions.map(opt => {
          const isSelected =
            (currentValue === null || currentValue === undefined)
              ? opt.value === null
              : currentValue === opt.value;
          const isMinus = opt.short === '-';

          const pillStyles = [styles.pill];
          if (isMinus) {
            pillStyles.push(styles.pillMinus);
          } else if (isSelected) {
            pillStyles.push(styles.pillActiveBlue);
          }

          const textStyles = [styles.pillText];
          if (isMinus) {
            textStyles.push(styles.pillMinusText);
          } else if (isSelected) {
            textStyles.push(styles.pillTextActive);
          }

          return (
            <TouchableOpacity
              key={`complexity-${id}-${opt.short}`}
              style={pillStyles}
              onPress={() =>
                updateParticipant(id, 'complexity_level', opt.value)
              }
              activeOpacity={0.8}
            >
              <Text style={textStyles}>{opt.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderBehaviourPills(
    id: string,
    currentValue: string | null | undefined,
  ) {
    const selected = parseBehaviour(currentValue);

    return (
      <View style={styles.pillRow}>
        {behaviourOptions.map(opt => {
          if (opt.value === null) {
            // "-" clear-all: always red pill
            return (
              <TouchableOpacity
                key={`behaviour-${id}-${opt.short}`}
                style={[styles.pill, styles.pillMinus]}
                onPress={() =>
                  updateParticipant(id, 'behaviour_profile', null)
                }
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, styles.pillMinusText]}>
                  {opt.short}
                </Text>
              </TouchableOpacity>
            );
          }

          const isSelected = selected.includes(opt.value);
          const pillStyles = [styles.pill];
          if (isSelected) pillStyles.push(styles.pillActiveBlue);

          const textStyles = [styles.pillText];
          if (isSelected) textStyles.push(styles.pillTextActive);

          return (
            <TouchableOpacity
              key={`behaviour-${id}-${opt.short}`}
              style={pillStyles}
              onPress={() => {
                let next: string[];
                if (isSelected) {
                  next = selected.filter(v => v !== opt.value);
                } else {
                  next = [...selected, opt.value];
                }
                updateParticipant(
                  id,
                  'behaviour_profile',
                  behaviourToString(next),
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={textStyles}>{opt.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {showWebBranding && (
        <Image
          source={require('@/assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          {/* Heading */}
          <Text style={styles.heading}>Participants Settings</Text>
          <Text style={styles.subHeading}>
            Set complexity and behaviour profiles for each participant. These
            values will help future automation match staff to participants safely.
          </Text>

          {/* Legend */}
          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>Legend</Text>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Complexity:</Text>
              <Text style={styles.legendText}>
                Low (Low), Medium (Med), High (High), Very high / complex
                (Comp)
              </Text>
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Behaviour:</Text>
              <Text style={styles.legendText}>
                Behavioural (Behav), High anxiety (Anx), Routine sensitive
                (Rout), Sensory/noise (Sens), Physical support (Phys). You can
                select more than one tag.
              </Text>
            </View>
          </View>

          {/* ADD NEW PARTICIPANT */}
          <View style={styles.addWrap}>
            <Text style={styles.addTitle}>Add new participant</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Participant name"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor="#b8a8d6"
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!newName.trim() || savingNew) && styles.addButtonDisabled,
                ]}
                onPress={addParticipant}
                disabled={!newName.trim() || savingNew}
                activeOpacity={0.85}
              >
                <Text style={styles.addButtonText}>
                  {savingNew ? 'Saving…' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addHint}>
              Only add participants who attend the day program.
            </Text>
          </View>

          {/* Participants list */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#c084fc"
              style={{ marginTop: 40 }}
            />
          ) : (
            <View style={styles.listWrap}>
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { width: 32 }]} />
                <Text style={[styles.headerCell, { flex: 1.4 }]}>
                  Participant
                </Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Complexity</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Behaviour</Text>
              </View>

              {participants.map(p => {
                const inactive = p.is_active === false;

                return (
                  <View
                    key={p.id}
                    style={[styles.row, inactive && styles.rowInactive]}
                  >
                    {/* Delete button – red X text only */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmDeleteParticipant(p)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.deleteButtonText}>x</Text>
                    </TouchableOpacity>

                    {/* Name + needs */}
                    <View style={[styles.participantInfoBlock, { flex: 1.4 }]}>
                      <View style={styles.colorBox} />
                      <View style={styles.info}>
                        <Text style={styles.name}>
                          {p.name}
                          {inactive ? ' (inactive)' : ''}
                        </Text>
                        {!!p.support_needs && (
                          <Text
                            style={styles.supportNeeds}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {p.support_needs}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Complexity */}
                    <View style={[styles.fieldBlock, { flex: 1 }]}>
                      {renderComplexityPills(p.id, p.complexity_level)}
                    </View>

                    {/* Behaviour (multi-select) */}
                    <View style={[styles.fieldBlock, { flex: 1 }]}>
                      {renderBehaviourPills(p.id, p.behaviour_profile)}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Footer />
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
    position: 'relative',
    overflow: 'hidden',
  },
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.08,
    left: -600,
    top: 0,
    pointerEvents: 'none',
  },
  scroll: {
    paddingBottom: 120,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#332244',
  },
  subHeading: {
    fontSize: 14,
    color: '#553a75',
    marginBottom: 16,
  },

  /* Legend styles */
  legendWrap: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#332244',
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#553a75',
    width: 90,
  },
  legendText: {
    fontSize: 13,
    color: '#6b5a7d',
    flex: 1,
  },

  /* Add new participant */
  addWrap: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  addTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#332244',
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    color: '#332244',
    backgroundColor: '#f8f4fb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e1d5f5',
    marginRight: 8,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  addHint: {
    fontSize: 12,
    color: '#7a678e',
  },

  listWrap: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7a678e',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 10,
    alignItems: 'center',
  },
  rowInactive: {
    opacity: 0.5,
  },

  // NEW: red X only
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },

  participantInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  colorBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#f973b7',
  },
  info: {
    flexShrink: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#332244',
  },
  supportNeeds: {
    fontSize: 12,
    color: '#6b5a7d',
    marginTop: 2,
  },
  fieldBlock: {
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7c7f0',
    backgroundColor: '#f6f1ff',
    marginRight: 4,
  },
  pillActiveBlue: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pillText: {
    fontSize: 11,
    color: '#5b4a76',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },

  // NEW: minus pill styling
  pillMinus: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  pillMinusText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
