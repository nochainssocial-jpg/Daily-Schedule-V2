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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';

type ParticipantRow = {
  id: string;
  name: string;
  color?: string | null;
  gender?: string | null;
  is_active?: boolean | null;
  support_needs?: string | null;

  // New scoring fields (1–3 or null)
  behaviours?: number | null;
  personal_care?: number | null;
  communication?: number | null;
  sensory?: number | null;
  social?: number | null;
  community?: number | null;
  safety?: number | null;
};

type Option = {
  label: string;
  short: string;
  value: number | null;
};

export default function ParticipantsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [legendCollapsed, setLegendCollapsed] = useState(true);
  const [addCollapsed, setAddCollapsed] = useState(true);

  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'Male' | 'Female' | ''>('');
  const [newColor, setNewColor] = useState<'blue' | 'pink' | ''>('');
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
      .insert({
        name,
        is_active: true,
        gender: newGender || null,
        color: newColor || null,
      })
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
      setNewGender('');
      setNewColor('');
    }
  }

  function confirmDeleteParticipant(p: ParticipantRow) {
    Alert.alert(
      'Delete participant',
      `Are you sure you want to remove ${p.name} from the list? This will not delete them from past schedules.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteParticipant(p.id),
        },
      ],
    );
  }

  async function deleteParticipant(id: string) {
    await supabase.from('participants').delete().eq('id', id);
    setParticipants(prev => prev.filter(p => p.id !== id));
  }

  function renderScorePills(
    participantId: string,
    field: keyof ParticipantRow,
    currentValue: number | null | undefined,
    options: Option[],
  ) {
    return (
      <View style={styles.pillRow}>
        {options.map(opt => {
          const isSelected =
            currentValue === null || currentValue === undefined
              ? opt.value === null
              : currentValue === opt.value;
          const isMinus = opt.short === '-';

          const pillStyles = [styles.pill];
          if (isMinus) {
            pillStyles.push(styles.pillMinus);
          } else if (isSelected && typeof opt.value === 'number') {
            if (opt.value === 1) {
              pillStyles.push(styles.pillSelectedLow);
            } else if (opt.value === 2) {
              pillStyles.push(styles.pillSelectedMedium);
            } else if (opt.value === 3) {
              pillStyles.push(styles.pillSelectedHigh);
            }
          } else if (!isSelected && typeof opt.value === 'number') {
            pillStyles.push(styles.pillNeutral);
          }

          const textStyles = [styles.pillText];
          if (isMinus) {
            textStyles.push(styles.pillMinusText);
          } else if (isSelected) {
            textStyles.push(styles.pillTextActive);
          }

          return (
            <TouchableOpacity
              key={`${field}-${participantId}-${opt.short}`}
              style={pillStyles}
              onPress={() => updateParticipant(participantId, field, opt.value)}
              activeOpacity={0.8}
            >
              <Text style={textStyles}>{opt.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function getTotalScore(p: ParticipantRow): number | null {
    const values = [
      p.behaviours,
      p.personal_care,
      p.communication,
      p.sensory,
      p.social,
      p.community,
      p.safety,
    ].filter((v): v is number => typeof v === 'number');

    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }

  const optionsBehaviour: Option[] = [
    { label: '-', short: '-', value: null },
    { label: '1 – Low', short: '1', value: 1 },
    { label: '2 – Medium', short: '2', value: 2 },
    { label: '3 – High', short: '3', value: 3 },
  ];

  const optionsStandard: Option[] = [
    { label: '-', short: '-', value: null },
    { label: '1 – Low', short: '1', value: 1 },
    { label: '2 – Medium', short: '2', value: 2 },
    { label: '3 – High', short: '3', value: 3 },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
      >
        <View style={styles.screenInner}>
          {/* Header */}
          <View style={styles.headerRowTop}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Participants</Text>
              <Text style={styles.subtitle}>
                Rate each participant for support complexity. This helps with
                fair, safe staff matching when we build future automations.
              </Text>
            </View>
            {showWebBranding && (
              <View style={styles.logoWrap}>
                <Image
                  source={require('@/assets/images/no-chains-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Why this matters</Text>
            <Text style={styles.infoBody}>
              Some participants have higher behaviours, sensory needs, or
              require more intensive personal care. This screen lets us capture
              that complexity in a simple scoring system (1–3) for each area.
            </Text>
            <Text style={styles.infoBody}>
              Over time, this will help us match more experienced staff with
              participants who need that support, and make sure everyone gets a
              fair, safe and consistent experience.
            </Text>
          </View>

          {/* LEGEND */}
          <View style={styles.legendWrap}>
            <View className="legend-header-row" style={styles.legendHeaderRow}>
              <Text style={styles.legendTitle}>Legend</Text>
              <TouchableOpacity
                onPress={() => setLegendCollapsed(prev => !prev)}
                style={styles.legendToggle}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={legendCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={22}
                  color="#4B164C"
                />
              </TouchableOpacity>
            </View>

            {!legendCollapsed && (
              <>
                <Text style={styles.legendHint}>
                  Each category is scored from 1–3. Higher totals indicate more
                  complex support needs.
                </Text>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Behaviours:</Text>
                  <Text style={styles.legendText}>
                    Frequency and intensity of behaviours of concern, and level
                    of support required to keep everyone safe.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Personal care:</Text>
                  <Text style={styles.legendText}>
                    Level of support required for toileting, showering,
                    dressing, hygiene and other personal care tasks.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Communication:</Text>
                  <Text style={styles.legendText}>
                    How the participant communicates, how much support they need
                    to understand information and express their needs.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Sensory:</Text>
                  <Text style={styles.legendText}>
                    Sensory sensitivities (noise, light, touch, etc.) and the
                    level of support required to help them regulate.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Social:</Text>
                  <Text style={styles.legendText}>
                    How they engage in group situations, peer interactions and
                    social environments.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Community:</Text>
                  <Text style={styles.legendText}>
                    Level of support required when out in the community (public
                    spaces, transport, shopping, appointments).
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Safety:</Text>
                  <Text style={styles.legendText}>
                    Overall safety risks (absconding, stranger danger,
                    self-harm risks, supervision level required).
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* ADD NEW PARTICIPANT */}
          <View style={styles.addWrap}>
            <View style={styles.addHeaderRow}>
              <Text style={styles.addTitle}>Add new participant</Text>
              <TouchableOpacity
                onPress={() => setAddCollapsed(prev => !prev)}
                style={styles.addToggle}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={addCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={22}
                  color="#4B164C"
                />
              </TouchableOpacity>
            </View>

            {!addCollapsed && (
              <>
                <View style={styles.addRow}>
                  {/* Name */}
                  <TextInput
                    style={styles.addInput}
                    placeholder="Participant name"
                    value={newName}
                    onChangeText={setNewName}
                    placeholderTextColor="#b8a8d6"
                  />

                  {/* Gender (Male / Female) */}
                  <View style={styles.inlineSelectGroup}>
                    <TouchableOpacity
                      style={[
                        styles.inlineSelectPill,
                        newGender === 'Male' && styles.inlineSelectPillActive,
                      ]}
                      onPress={() => setNewGender('Male')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.inlineSelectText,
                          newGender === 'Male' && styles.inlineSelectTextActive,
                        ]}
                      >
                        M
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.inlineSelectPill,
                        newGender === 'Female' &&
                          styles.inlineSelectPillActive,
                      ]}
                      onPress={() => setNewGender('Female')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.inlineSelectText,
                          newGender === 'Female' &&
                            styles.inlineSelectTextActive,
                        ]}
                      >
                        F
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Colour (Blue / Pink) */}
                  <View style={styles.inlineSelectGroup}>
                    <TouchableOpacity
                      style={[
                        styles.inlineSelectPill,
                        newColor === 'blue' && styles.inlineSelectPillActive,
                      ]}
                      onPress={() => setNewColor('blue')}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.inlineColorDot,
                          { backgroundColor: '#3b82f6' },
                        ]}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.inlineSelectPill,
                        newColor === 'pink' && styles.inlineSelectPillActive,
                      ]}
                      onPress={() => setNewColor('pink')}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.inlineColorDot,
                          { backgroundColor: '#ec4899' },
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Add button */}
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      (!newName.trim() ||
                        !newGender ||
                        !newColor ||
                        savingNew) &&
                        styles.addButtonDisabled,
                    ]}
                    onPress={addParticipant}
                    disabled={
                      !newName.trim() || !newGender || !newColor || savingNew
                    }
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
              </>
            )}
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
                <Text
                  style={[
                    styles.headerCell,
                    styles.headerName,
                    { minWidth: 160 },
                  ]}
                >
                  Participant
                </Text>
                <Text style={[styles.headerCell, styles.headerTotal]}>
                  Total
                </Text>
                <Text style={[styles.headerCell, styles.headerCategory]}>
                  Behaviours
                </Text>
                <Text style={[styles.headerCell, styles.headerCategory]}>
                  Personal care
                </Text>
                <Text style={[styles.headerCell, styles.headerCategory]}>
                  Communication
                </Text>
                <Text style={[styles.headerCell, styles.headerCategory]}>
                  Sensory
                </Text>
                <Text style={[styles.headerCell, styles.headerCategory]}>
                  Social
                </Text>
                <Text style={[styles.headerCell, styles.headerCategory]}>
                  Community
                </Text>
                <Text style={[styles.headerCell, styles.headerCategory]}>
                  Safety
                </Text>
              </View>

              {participants.map(p => {
                const isExpanded = expandedId === p.id;
                const total = getTotalScore(p);

                return (
                  <View key={p.id} style={styles.rowOuter}>
                    <TouchableOpacity
                      style={styles.rowTouchable}
                      activeOpacity={0.9}
                      onPress={() =>
                        setExpandedId(prev => (prev === p.id ? null : p.id))
                      }
                    >
                      <View style={styles.rowInner}>
                        <View style={styles.rowChevronCell}>
                          <MaterialCommunityIcons
                            name={
                              isExpanded ? 'chevron-up' : 'chevron-down'
                            }
                            size={18}
                            color="#6b5a7d"
                          />
                        </View>

                        <View style={styles.rowNameCell}>
                          <View
                            style={[
                              styles.participantDot,
                              {
                                backgroundColor:
                                  p.color === 'pink'
                                    ? '#f472b6'
                                    : '#60a5fa',
                              },
                            ]}
                          />
                          <Text style={styles.participantName}>{p.name}</Text>
                        </View>

                        <View style={styles.rowTotalCell}>
                          <View
                            style={[
                              styles.totalBadge,
                              total === null && styles.totalBadgeEmpty,
                              total !== null &&
                                total <= 7 &&
                                styles.totalBadgeLow,
                              total !== null &&
                                total >= 8 &&
                                total <= 12 &&
                                styles.totalBadgeMedium,
                              total !== null &&
                                total >= 13 &&
                                styles.totalBadgeHigh,
                            ]}
                          >
                            <Text
                              style={[
                                styles.totalBadgeText,
                                total === null &&
                                  styles.totalBadgeTextEmpty,
                              ]}
                            >
                              {total === null ? '-' : total}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.rowCategoryCell}>
                          <Text style={styles.cellLabel}>Behaviours</Text>
                          {renderScorePills(
                            p.id,
                            'behaviours',
                            p.behaviours ?? null,
                            optionsBehaviour,
                          )}
                        </View>

                        <View style={styles.rowCategoryCell}>
                          <Text style={styles.cellLabel}>Personal care</Text>
                          {renderScorePills(
                            p.id,
                            'personal_care',
                            p.personal_care ?? null,
                            optionsStandard,
                          )}
                        </View>

                        <View style={styles.rowCategoryCell}>
                          <Text style={styles.cellLabel}>Communication</Text>
                          {renderScorePills(
                            p.id,
                            'communication',
                            p.communication ?? null,
                            optionsStandard,
                          )}
                        </View>

                        <View style={styles.rowCategoryCell}>
                          <Text style={styles.cellLabel}>Sensory</Text>
                          {renderScorePills(
                            p.id,
                            'sensory',
                            p.sensory ?? null,
                            optionsStandard,
                          )}
                        </View>

                        <View style={styles.rowCategoryCell}>
                          <Text style={styles.cellLabel}>Social</Text>
                          {renderScorePills(
                            p.id,
                            'social',
                            p.social ?? null,
                            optionsStandard,
                          )}
                        </View>

                        <View style={styles.rowCategoryCell}>
                          <Text style={styles.cellLabel}>Community</Text>
                          {renderScorePills(
                            p.id,
                            'community',
                            p.community ?? null,
                            optionsStandard,
                          )}
                        </View>

                        <View style={styles.rowCategoryCell}>
                          <Text style={styles.cellLabel}>Safety</Text>
                          {renderScorePills(
                            p.id,
                            'safety',
                            p.safety ?? null,
                            optionsStandard,
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedFooter}>
                        <View style={styles.footerLeft}>
                          <Text style={styles.footerLabel}>Notes</Text>
                          <TextInput
                            style={styles.footerInput}
                            placeholder="Optional notes about this participant’s support needs…"
                            placeholderTextColor="#b8a8d6"
                            value={p.support_needs ?? ''}
                            onChangeText={text =>
                              updateParticipant(p.id, 'support_needs', text)
                            }
                            multiline
                          />
                        </View>
                        <View style={styles.footerRight}>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => confirmDeleteParticipant(p)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={18}
                              color="#b91c1c"
                            />
                            <Text style={styles.deleteButtonText}>
                              Remove participant
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f3eefe',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  screenInner: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  headerRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2b133e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b3a60',
  },
  logoWrap: {
    width: 120,
    height: 120,
    marginLeft: 8,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  logo: {
    width: '80%',
    height: '80%',
  },

  infoCard: {
    backgroundColor: '#fdfbff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e4d9fb',
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#352049',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 13,
    color: '#4b3a60',
    marginBottom: 4,
  },

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
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#332244',
  },
  legendToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e7dff2',
    backgroundColor: '#f8f2ff',
  },
  legendToggleText: {
    fontSize: 11,
    color: '#6b5a7d',
    fontWeight: '600',
  },
  legendHint: {
    fontSize: 12,
    color: '#6b5a7d',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#553a75',
    width: 110,
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    color: '#4b3a60',
  },

  addWrap: {
    backgroundColor: '#fdfbff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 18,
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
  addHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  addToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e7dff2',
    backgroundColor: '#f8f2ff',
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
  inlineSelectGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  inlineSelectPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e1d5f5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 4,
    backgroundColor: '#f8f4fb',
  },
  inlineSelectPillActive: {
    backgroundColor: '#e9d5ff',
    borderColor: '#c4b5fd',
  },
  inlineSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b164c',
  },
  inlineSelectTextActive: {
    color: '#1f2937',
  },
  inlineColorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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
    alignItems: 'flex-start',
    marginLeft: 40,
    marginTop: -6,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b5a7d',
    marginBottom: 6,
  },
  headerName: {
    marginRight: 16,
  },
  headerTotal: {
    width: 60,
    textAlign: 'center',
    marginRight: 12,
  },
  headerCategory: {
    flex: 1,
    textAlign: 'left',
    marginRight: 8,
  },

  rowOuter: {
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#fdfbff',
    borderWidth: 1,
    borderColor: '#e4d9fb',
    overflow: 'hidden',
  },
  rowTouchable: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowChevronCell: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  rowNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 160,
    marginRight: 14,
    paddingTop: 4,
  },
  participantDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b133e',
  },
  rowTotalCell: {
    width: 60,
    alignItems: 'center',
    paddingTop: 6,
    marginRight: 12,
  },
  totalBadge: {
    minWidth: 32,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadgeEmpty: {
    backgroundColor: '#f3e8ff',
  },
  totalBadgeLow: {
    backgroundColor: '#dcfce7',
  },
  totalBadgeMedium: {
    backgroundColor: '#fef9c3',
  },
  totalBadgeHigh: {
    backgroundColor: '#fee2e2',
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  totalBadgeTextEmpty: {
    color: '#6b5a7d',
  },

  rowCategoryCell: {
    flex: 1,
    paddingTop: 4,
    paddingRight: 6,
  },
  cellLabel: {
    fontSize: 11,
    color: '#6b5a7d',
    marginBottom: 2,
  },

  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  pill: {
    minWidth: 26,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5defa',
    backgroundColor: '#f8f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillNeutral: {
    backgroundColor: '#f9fafb',
  },
  pillMinus: {
    borderStyle: 'dashed',
    borderColor: '#e5defa',
  },
  pillSelectedLow: {
    backgroundColor: '#dcfce7',
    borderColor: '#4ade80',
  },
  pillSelectedMedium: {
    backgroundColor: '#fef9c3',
    borderColor: '#eab308',
  },
  pillSelectedHigh: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  pillText: {
    fontSize: 11,
    color: '#4b3a60',
  },
  pillTextActive: {
    fontWeight: '700',
  },
  pillMinusText: {
    color: '#9ca3af',
  },

  expandedFooter: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 10,
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    justifyContent: 'flex-end',
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b5a7d',
    marginBottom: 4,
  },
  footerInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5defa',
    backgroundColor: '#f8f4ff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    minHeight: 40,
    textAlignVertical: 'top',
    color: '#332244',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 999,
  },
  deleteButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#7f1d1d',
  },
});