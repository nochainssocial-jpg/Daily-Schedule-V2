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

const MAX_WIDTH = 880;

type ParticipantRow = {
  id: string;
  name: string;
  is_active: boolean | null;
  color?: string | null;
  gender?: 'Male' | 'Female' | null;
  support_needs?: string | null;
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const showWebBranding = Platform.OS === 'web';

  async function loadParticipants() {
    setLoading(true);
    const { data } = await supabase
      .from('participants')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setParticipants(data as ParticipantRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadParticipants();
  }, []);

  function getTotalScore(p: ParticipantRow): number | null {
    const values = [
      p.behaviours,
      p.personal_care,
      p.communication,
      p.sensory,
      p.social,
      p.community,
      p.safety,
    ].filter(v => typeof v === 'number') as number[];

    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }

  function getScoreLevel(total: number | null): 'low' | 'medium' | 'high' | null {
    if (total === null) return null;
    if (total <= 7) return 'low';
    if (total <= 14) return 'medium';
    return 'high';
  }

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
    if (!name || !newGender || !newColor) return;

    const colorHex =
      newColor === 'blue'
        ? '#60a5fa'
        : newColor === 'pink'
        ? '#f973b7'
        : null;

    const genderValue: 'Male' | 'Female' | null =
      newGender === 'Male' || newGender === 'Female' ? newGender : null;

    setSavingNew(true);
    const { data, error } = await supabase
      .from('participants')
      .insert({
        name,
        is_active: true,
        color: colorHex,
        gender: genderValue,
      })
      .select()
      .single();

  const threeLevelOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1', short: '1', value: 1 },
    { label: '2', short: '2', value: 2 },
    { label: '3', short: '3', value: 3 },
  ];

  const behaviourOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1 - Low', short: '1 - Low', value: 1 },
    { label: '2 - Medium', short: '2 - Medium', value: 2 },
    { label: '3 - High', short: '3 - High', value: 3 },
  ];

  const safetyOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1 - Low risk', short: '1 - Low', value: 1 },
    { label: '2 - Medium', short: '2 - Medium', value: 2 },
    { label: '3 - High risk', short: '3 - High', value: 3 },
  ];

  function renderPills(
    id: string,
    field:
      | 'behaviours'
      | 'personal_care'
      | 'communication'
      | 'sensory'
      | 'social'
      | 'community'
      | 'safety',
    current: number | null | undefined,
    options: Option[],
  ) {
    return (
      <View style={styles.pillRow}>
        {options.map(opt => {
          const active = current === opt.value;
          return (
            <TouchableOpacity
              key={opt.short}
              style={[
                styles.pill,
                active && styles.pillActive,
                opt.value === null && styles.pillUnset,
              ]}
              onPress={() => updateParticipant(id, field, opt.value)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.pillText,
                  active && styles.pillTextActive,
                  opt.value === null && styles.pillTextUnset,
                ]}
              >
                {opt.short}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function getLegendText(field: keyof ParticipantRow): string {
    switch (field) {
      case 'behaviours':
        return 'Behaviours: 1 = Low, 2 = Medium, 3 = High support needs.';
      case 'personal_care':
        return 'Personal care: 1 = Light, 2 = Moderate, 3 = Intensive support.';
      case 'communication':
        return 'Communication: 1 = Straightforward, 2 = Some adaptation, 3 = High adaptation.';
      case 'sensory':
        return 'Sensory: 1 = Low impact, 2 = Moderate, 3 = Very sensitive.';
      case 'social':
        return 'Social: 1 = Easy group fit, 2 = Some support, 3 = High support.';
      case 'community':
        return 'Community access: 1 = Simple, 2 = Moderate, 3 = Complex support.';
      case 'safety':
        return 'Safety: 1 = Low risk, 2 = Medium, 3 = High risk.';
      default:
        return '';
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

  function startEdit(p: ParticipantRow) {
    setEditingId(p.id);
    setEditingName(p.name ?? '');
    setExpandedId(null);
  }

  async function saveEdit() {
    if (!editingId) return;

    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      setEditingName('');
      return;
    }

    await updateParticipant(editingId, 'name', trimmed);
    setEditingId(null);
    setEditingName('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  if (savingNew) {
    // just to keep the linter happy if you want; real loading state handled via `loading`
  }

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  const canSaveNew =
    !!newName.trim() && !!newGender && !!newColor && !savingNew;

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom || 16,
        },
      ]}
    >
      {showWebBranding && (
        <Image
          source={require('@/assets/no-chains-bg-logo.png')}
          resizeMode="contain"
          style={styles.bgLogo}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <Text style={styles.heading}>
            Participants – support complexity ratings
          </Text>
          <Text style={styles.subHeading}>
            Use these ratings to match staff fairly and safely when building the
            daily schedule.
          </Text>

          {/* Legend */}
          <View style={styles.legendWrap}>
            <TouchableOpacity
              style={styles.legendHeader}
              onPress={() => setLegendCollapsed(prev => !prev)}
              activeOpacity={0.85}
            >
              <View>
                <Text style={styles.legendTitle}>How the ratings work</Text>
                <Text style={styles.legendHint}>
                  Tap to {legendCollapsed ? 'show' : 'hide'} rating guidelines
                </Text>
              </View>

              <MaterialCommunityIcons
                name={legendCollapsed ? 'chevron-down' : 'chevron-up'}
                size={22}
                color="#553a75"
              />
            </TouchableOpacity>

            {!legendCollapsed && (
              <View style={styles.legendBody}>
                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Behaviours</Text>
                  <Text style={styles.legendText}>
                    1 = Low support • 2 = Medium • 3 = High support.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Personal care</Text>
                  <Text style={styles.legendText}>
                    1 = Light • 2 = Moderate • 3 = Intensive support.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Communication</Text>
                  <Text style={styles.legendText}>
                    1 = Straightforward • 2 = Some adaptation • 3 = High
                    adaptation.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Sensory</Text>
                  <Text style={styles.legendText}>
                    1 = Low impact • 2 = Moderate • 3 = Very sensitive.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Social</Text>
                  <Text style={styles.legendText}>
                    1 = Easy group fit • 2 = Some support • 3 = High support.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Community</Text>
                  <Text style={styles.legendText}>
                    1 = Simple outings • 2 = Moderate • 3 = Complex support.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Safety</Text>
                  <Text style={styles.legendText}>
                    1 = Low risk • 2 = Medium risk • 3 = High risk.
                  </Text>
                </View>

                <View style={styles.legendNoteRow}>
                  <View style={styles.legendScoreKey}>
                    <View style={[styles.legendScorePill, styles.legendLow]} />
                    <Text style={styles.legendScoreText}>
                      0–7 = Lower complexity
                    </Text>
                  </View>
                  <View style={styles.legendScoreKey}>
                    <View
                      style={[styles.legendScorePill, styles.legendMedium]}
                    />
                    <Text style={styles.legendScoreText}>
                      8–14 = Medium complexity
                    </Text>
                  </View>
                  <View style={styles.legendScoreKey}>
                    <View style={[styles.legendScorePill, styles.legendHigh]} />
                    <Text style={styles.legendScoreText}>
                      15+ = High complexity
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Add new participant */}
          <View style={styles.addWrap}>
            <TouchableOpacity
              style={styles.addHeaderRow}
              onPress={() => setAddCollapsed(prev => !prev)}
              activeOpacity={0.85}
            >
              <View>
                <Text style={styles.addTitle}>Add participant</Text>
                <Text style={styles.addHint}>
                  Name, colour (blue/pink) and gender are required.
                </Text>
              </View>

              <MaterialCommunityIcons
                name={addCollapsed ? 'chevron-down' : 'chevron-up'}
                size={22}
                color="#553a75"
              />
            </TouchableOpacity>

            {!addCollapsed && (
              <View style={styles.addBody}>
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Full name"
                    placeholderTextColor="#b8a8d6"
                  />
                </View>

                <View style={styles.addRow}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.addLabel}>Colour (for schedule)</Text>
                    <View style={styles.selectRow}>
                      <TouchableOpacity
                        style={[
                          styles.selectPill,
                          newColor === 'blue' && styles.selectPillSelected,
                        ]}
                        onPress={() => setNewColor('blue')}
                        activeOpacity={0.85}
                      >
                        <View
                          style={[
                            styles.selectColourDot,
                            { backgroundColor: '#60a5fa' },
                          ]}
                        />
                        <Text style={styles.selectPillText}>Blue (male)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.selectPill,
                          newColor === 'pink' && styles.selectPillSelected,
                        ]}
                        onPress={() => setNewColor('pink')}
                        activeOpacity={0.85}
                      >
                        <View
                          style={[
                            styles.selectColourDot,
                            { backgroundColor: '#f973b7' },
                          ]}
                        />
                        <Text style={styles.selectPillText}>Pink (female)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.addLabel}>Gender</Text>
                    <View style={styles.selectRow}>
                      <TouchableOpacity
                        style={[
                          styles.selectPill,
                          newGender === 'Male' && styles.selectPillSelected,
                        ]}
                        onPress={() => setNewGender('Male')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.selectPillText}>Male</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.selectPill,
                          newGender === 'Female' && styles.selectPillSelected,
                        ]}
                        onPress={() => setNewGender('Female')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.selectPillText}>Female</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.addButtonRow}>
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      !canSaveNew && styles.addButtonDisabled,
                    ]}
                    onPress={addParticipant}
                    disabled={!canSaveNew}
                    activeOpacity={0.85}
                  >
                    {savingNew ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.addButtonText}>Add participant</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Participants list */}
          <View style={styles.listWrap}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.headerLabel}>Participant</Text>
              <Text
                style={[
                  styles.headerLabel,
                  {
                    width: 70,
                    textAlign: 'right',
                    marginRight: 30,
                    marginTop: -8,
                    marginBottom: 4,
                  },
                ]}
              >
                Score
              </Text>
            </View>

            {participants.map(p => {
              const inactive = p.is_active === false;
              const totalScore = getTotalScore(p);
              const scoreLevel =
                totalScore === null ? null : getScoreLevel(totalScore);

              const rowStyles = [styles.row];
              if (inactive) rowStyles.push(styles.rowInactive);

              const scoreBubbleStyles = [styles.scoreBubble];
              if (scoreLevel === 'low')
                scoreBubbleStyles.push(styles.scoreBubbleLow);
              if (scoreLevel === 'medium')
                scoreBubbleStyles.push(styles.scoreBubbleMedium);
              if (scoreLevel === 'high')
                scoreBubbleStyles.push(styles.scoreBubbleHigh);

              const isExpanded = expandedId === p.id;

              return (
                <View key={p.id} style={rowStyles}>
                  {/* Row header: delete + edit + participant info + score bubble */}
                  <View style={styles.rowHeader}>
                    <View style={styles.actionsColumn}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => confirmDeleteParticipant(p)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={20}
                          color="#ef4444"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => startEdit(p)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons
                          name="pencil"
                          size={20}
                          color="#22c55e"
                        />
                      </TouchableOpacity>
                    </View>

                    {editingId === p.id ? (
                      <View style={styles.editBlock}>
                        <TextInput
                          style={styles.editInput}
                          value={editingName}
                          onChangeText={setEditingName}
                          placeholder="Participant name"
                          placeholderTextColor="#b8a8d6"
                        />
                        <View style={styles.editButtonsRow}>
                          <TouchableOpacity
                            style={styles.smallButton}
                            onPress={saveEdit}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.smallButtonText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.smallButton,
                              styles.smallButtonSecondary,
                            ]}
                            onPress={cancelEdit}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.smallButtonSecondaryText}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.rowHeaderMain}
                        onPress={() =>
                          setExpandedId(prev => (prev === p.id ? null : p.id))
                        }
                        activeOpacity={0.85}
                      >
                        <View style={styles.participantInfoBlock}>
                          <View
                            style={[
                              styles.colorBox,
                              {
                                // Pink for girls / blue for boys comes from Supabase `color`
                                backgroundColor: p.color || '#f973b7',
                              },
                            ]}
                          />
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

                        {totalScore !== null && (
                          <View style={scoreBubbleStyles}>
                            <Text style={styles.scoreBubbleText}>{totalScore}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Expanded scoring panel */}
                  {isExpanded && (
                    <View style={styles.scorePanel}>
                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Behaviours</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            p.id,
                            'behaviours',
                            p.behaviours,
                            behaviourOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Personal care</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            p.id,
                            'personal_care',
                            p.personal_care,
                            threeLevelOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Communication</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            p.id,
                            'communication',
                            p.communication,
                            threeLevelOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Sensory</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            p.id,
                            'sensory',
                            p.sensory,
                            threeLevelOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Social</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            p.id,
                            'social',
                            p.social,
                            threeLevelOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Community</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            p.id,
                            'community',
                            p.community,
                            threeLevelOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Safety</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            p.id,
                            'safety',
                            p.safety,
                            safetyOptions,
                          )}
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
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
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 160,
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
    color: '#6b5a7d',
    marginTop: 6,
    marginBottom: 16,
  },

  /* Legend */
  legendWrap: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#332244',
  },
  legendHint: {
    fontSize: 12,
    color: '#6b5a7d',
    marginBottom: 8,
  },
  legendBody: {
    marginTop: 10,
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
    fontSize: 13,
    color: '#4b3a62',
    flex: 1,
  },
  legendNoteRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendScoreKey: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendScorePill: {
    width: 18,
    height: 18,
    borderRadius: 999,
    marginRight: 6,
  },
  legendScoreText: {
    fontSize: 12,
    color: '#4b3a62',
    fontWeight: '600',
  },
  legendLow: {
    backgroundColor: '#bbf7d0',
  },
  legendMedium: {
    backgroundColor: '#facc15',
  },
  legendHigh: {
    backgroundColor: '#fecaca',
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
  addHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#332244',
  },
  addHint: {
    fontSize: 12,
    color: '#6b5a7d',
    marginTop: 2,
  },
  addBody: {
    marginTop: 12,
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
    marginRight: 6,
  },
  addLabel: {
    fontSize: 12,
    color: '#6b5a7d',
    marginBottom: 4,
  },
  addButtonRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f472b6',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e1d5f5',
    backgroundColor: '#f8f4fb',
  },
  selectPillSelected: {
    backgroundColor: '#e5d4ff',
    borderColor: '#c4b0f5',
  },
  selectColourDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 6,
  },
  selectPillText: {
    fontSize: 12,
    color: '#332244',
    fontWeight: '600',
  },

  listWrap: {
    width: '100%',
    marginBottom: 60,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#553a75',
  },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#efe3ff',
    backgroundColor: '#fdfbff',
    padding: 10,
    marginBottom: 8,
  },
  rowInactive: {
    opacity: 0.55,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    width: 48,
    justifyContent: 'flex-start',
  },
  editButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  editBlock: {
    flex: 1,
    marginLeft: 4,
  },
  editInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d7c7f0',
    backgroundColor: '#f8f4ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#332244',
    marginTop: 4,
  },
  editButtonsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  smallButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  smallButtonSecondary: {
    backgroundColor: '#e5e7eb',
  },
  smallButtonSecondaryText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },

  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 4,
  },
  participantInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  colorBox: {
    width: 32,
    height: 32,
    borderRadius: 999,
    marginRight: 8,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#332244',
  },
  supportNeeds: {
    fontSize: 12,
    color: '#6b5a7d',
  },
  scoreBubble: {
    Width: 80,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  scoreBubbleLow: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  scoreBubbleMedium: {
    backgroundColor: '#fef9c3',
    borderColor: '#eab308',
  },
  scoreBubbleHigh: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  scoreBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#332244',
  },
  scorePanel: {
    marginTop: 12,
    paddingTop: 10,
    marginLeft: 60,
    borderTopWidth: 1,
    borderTopColor: '#f1e9ff',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingLeft: 0,
  },
  categoryLabel: {
    width: 130,
    fontSize: 13,
    fontWeight: '600',
    color: '#553a75',
    marginRight: 4,
  },
  categoryPills: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    minWidth: 120,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#5b5b5b',
    backgroundColor: '#dadada',
    marginRight: 6,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: '#008aff',
    borderColor: '#008aff',
  },
  pillUnset: {
    backgroundColor: '#f4f4f5',
    borderColor: '#e4e4e7',
  },
  pillText: {
    fontSize: 12,
    color: '#3e3e3e',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pillTextUnset: {
    color: '#71717a',
  },
});
