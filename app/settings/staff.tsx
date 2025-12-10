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

type StaffRow = {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean | null;
  color?: string | null;
  gender?: 'male' | 'female' | null;
  experience_rating?: number | null;
  behaviour_rating?: number | null;
  personal_care_rating?: number | null;
  mobility_rating?: number | null;
  communication_rating?: number | null;
  reliability_rating?: number | null;
  supervisor_notes?: string | null;
};

type Option = {
  label: string;
  short: string;
  value: number | null;
};

export default function StaffSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [legendCollapsed, setLegendCollapsed] = useState(true);
  const [addCollapsed, setAddCollapsed] = useState(true);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newColor, setNewColor] = useState<'pink' | 'blue' | null>(null);
  const [newGender, setNewGender] = useState<'male' | 'female' | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');

  const showWebBranding = Platform.OS === 'web';

  async function loadStaff() {
    setLoading(true);
    const { data } = await supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setStaff(data as StaffRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  function getTotalScore(s: StaffRow): number | null {
    const values = [
      s.experience_rating,
      s.behaviour_rating,
      s.personal_care_rating,
      s.mobility_rating,
      s.communication_rating,
      s.reliability_rating,
    ].filter(v => typeof v === 'number') as number[];

    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }

  function getScoreLevel(total: number | null): 'low' | 'medium' | 'high' | null {
    if (total === null) return null;
    if (total <= 6) return 'low';
    if (total <= 12) return 'medium';
    return 'high';
  }

  async function updateStaffField(
    id: string,
    field:
      | 'experience_rating'
      | 'behaviour_rating'
      | 'personal_care_rating'
      | 'mobility_rating'
      | 'communication_rating'
      | 'reliability_rating'
      | 'supervisor_notes',
    value: any,
  ) {
    await supabase.from('staff').update({ [field]: value }).eq('id', id);
    setStaff(prev =>
      prev.map(s => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }

  async function addStaff() {
    const name = newName.trim();
    const phone = newPhone.trim();

    if (!name || !newColor || !newGender) return;

    const colorHex =
      newColor === 'pink'
        ? '#f973b7'
        : newColor === 'blue'
        ? '#60a5fa'
        : null;

    const genderValue = newGender;

    setSavingNew(true);
    const { data, error } = await supabase
      .from('staff')
      .insert({
        name,
        phone: phone || null,
        is_active: true,
        color: colorHex,
        gender: genderValue,
      })
      .select()
      .single();

    setSavingNew(false);

    if (!error && data) {
      setStaff(prev =>
        [...prev, data as StaffRow].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewName('');
      setNewPhone('');
      setNewColor(null);
      setNewGender(null);
    }
  }

  function confirmDeleteStaff(member: StaffRow) {
    Alert.alert(
      'Remove staff member',
      `Remove ${member.name} from the staff list? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('staff').delete().eq('id', member.id);
            setStaff(prev => prev.filter(s => s.id !== member.id));
          },
        },
      ],
    );
  }

  function startEdit(member: StaffRow) {
    setEditingId(member.id);
    setEditingName(member.name ?? '');
    setEditingPhone(member.phone ?? '');
    setExpandedId(null);
  }

  async function saveEdit() {
    if (!editingId) return;

    const name = editingName.trim();
    const phone = editingPhone.trim();

    if (!name) {
      setEditingId(null);
      setEditingName('');
      setEditingPhone('');
      return;
    }

    await supabase
      .from('staff')
      .update({ name, phone: phone || null })
      .eq('id', editingId);

    setStaff(prev =>
      prev.map(s =>
        s.id === editingId ? { ...s, name, phone: phone || null } : s,
      ),
    );

    setEditingId(null);
    setEditingName('');
    setEditingPhone('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
    setEditingPhone('');
  }

  const experienceOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1 - Beginner', short: '1 - Beginner', value: 1 },
    { label: '2 - Intermediate', short: '2 - Intermediate', value: 2 },
    { label: '3 - Senior', short: '3 - Senior', value: 3 },
  ];

  const behaviourOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1 - Low', short: '1 - Low', value: 1 },
    { label: '2 - Medium', short: '2 - Medium', value: 2 },
    { label: '3 - High', short: '3 - High', value: 3 },
  ];

  const reliabilityOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1 - Inconsistent', short: '1 - Inconsistent', value: 1 },
    { label: '2 - Moderate', short: '2 - Moderate', value: 2 },
    { label: '3 - Very reliable', short: '3 - Very reliable', value: 3 },
  ];

  const threeLevelOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1', short: '1', value: 1 },
    { label: '2', short: '2', value: 2 },
    { label: '3', short: '3', value: 3 },
  ];

  function renderPills(
    id: string,
    field:
      | 'experience_rating'
      | 'behaviour_rating'
      | 'personal_care_rating'
      | 'mobility_rating'
      | 'communication_rating'
      | 'reliability_rating',
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
              onPress={() => updateStaffField(id, field, opt.value)}
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

  function getLegendText(field: keyof StaffRow): string {
    switch (field) {
      case 'experience_rating':
        return 'Experience: 1 = Beginner, 2 = Intermediate, 3 = Senior.';
      case 'behaviour_rating':
        return 'Behaviour support: 1 = Low need, 2 = Moderate need, 3 = High need.';
      case 'personal_care_rating':
        return 'Personal care: 1 = Light, 2 = Moderate, 3 = Intensive support.';
      case 'mobility_rating':
        return 'Mobility: 1 = Independent, 2 = Some assistance, 3 = Full assistance.';
      case 'communication_rating':
        return 'Communication: 1 = Straightforward, 2 = Some adaptation, 3 = High adaptation.';
      case 'reliability_rating':
        return 'Reliability: 1 = Inconsistent, 2 = Moderate, 3 = Very reliable.';
      default:
        return '';
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  const canSaveNew =
    !!newName.trim() && !!newColor && !!newGender && !savingNew;

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
          source={require('@/assets/images/nochains-bg.png')}
          resizeMode="contain"
          style={styles.bgLogo}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <Text style={styles.heading}>Staff – skill & support ratings</Text>
          <Text style={styles.subHeading}>
            Use these ratings to match staff to participants fairly and safely.
            Higher totals indicate greater capacity for complex support.
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
                  <Text style={styles.legendLabel}>Experience</Text>
                  <Text style={styles.legendText}>
                    1 = Beginner • 2 = Intermediate • 3 = Senior
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Behaviour support</Text>
                  <Text style={styles.legendText}>
                    1 = Low need • 2 = Moderate • 3 = High
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Personal care</Text>
                  <Text style={styles.legendText}>
                    1 = Light • 2 = Moderate • 3 = Intensive
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Mobility</Text>
                  <Text style={styles.legendText}>
                    1 = Independent • 2 = Some assist • 3 = Full assist
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Communication</Text>
                  <Text style={styles.legendText}>
                    1 = Straightforward • 2 = Some adaptation • 3 = Highly
                    adapted
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Reliability</Text>
                  <Text style={styles.legendText}>
                    1 = Inconsistent • 2 = Moderate • 3 = Very reliable
                  </Text>
                </View>

                <View style={styles.legendNoteRow}>
                  <View style={styles.legendScoreKey}>
                    <View style={[styles.legendScorePill, styles.legendLow]} />
                    <Text style={styles.legendScoreText}>0–6 = Lower load</Text>
                  </View>
                  <View style={styles.legendScoreKey}>
                    <View
                      style={[styles.legendScorePill, styles.legendMedium]}
                    />
                    <Text style={styles.legendScoreText}>
                      7–12 = Medium load
                    </Text>
                  </View>
                  <View style={styles.legendScoreKey}>
                    <View style={[styles.legendScorePill, styles.legendHigh]} />
                    <Text style={styles.legendScoreText}>
                      13+ = Complex load
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Add new staff */}
          <View style={styles.addWrap}>
            <TouchableOpacity
              style={styles.addHeaderRow}
              onPress={() => setAddCollapsed(prev => !prev)}
              activeOpacity={0.85}
            >
              <View>
                <Text style={styles.addTitle}>Add staff member</Text>
                <Text style={styles.addHint}>
                  Name, colour (blue/pink), and gender are required.
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
                  <TextInput
                    style={styles.addInput}
                    value={newPhone}
                    onChangeText={setNewPhone}
                    placeholder="Phone (optional)"
                    keyboardType="phone-pad"
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
                          newGender === 'male' && styles.selectPillSelected,
                        ]}
                        onPress={() => setNewGender('male')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.selectPillText}>Male</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.selectPill,
                          newGender === 'female' && styles.selectPillSelected,
                        ]}
                        onPress={() => setNewGender('female')}
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
                    onPress={addStaff}
                    disabled={!canSaveNew}
                    activeOpacity={0.85}
                  >
                    {savingNew ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.addButtonText}>Add staff</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Existing staff list */}
          <View style={styles.listWrap}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.headerLabel}>Staff member</Text>
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

            {staff.map(s => {
              const inactive = s.is_active === false;
              const totalScore = getTotalScore(s);
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

              const isExpanded = expandedId === s.id;

              return (
                <View key={s.id} style={rowStyles}>
                  {/* Row header: delete + edit + staff info + score bubble */}
                  <View style={styles.rowHeader}>
                    <View style={styles.actionsColumn}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => confirmDeleteStaff(s)}
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
                        onPress={() => startEdit(s)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons
                          name="pencil"
                          size={20}
                          color="#22c55e"
                        />
                      </TouchableOpacity>
                    </View>

                    {editingId === s.id ? (
                      <View style={styles.editBlock}>
                        <View style={styles.editRow}>
                          <TextInput
                            style={[styles.addInput, { marginRight: 6 }]}
                            value={editingName}
                            onChangeText={setEditingName}
                            placeholder="Name"
                            placeholderTextColor="#b8a8d6"
                          />
                          <TextInput
                            style={styles.addInput}
                            value={editingPhone}
                            onChangeText={setEditingPhone}
                            placeholder="Phone (optional)"
                            keyboardType="phone-pad"
                            placeholderTextColor="#b8a8d6"
                          />
                        </View>
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
                          setExpandedId(prev => (prev === s.id ? null : s.id))
                        }
                        activeOpacity={0.85}
                      >
                        <View style={styles.staffInfoBlock}>
                          <View
                            style={[
                              styles.colorBox,
                              { backgroundColor: s.color || '#d4c4e8' },
                            ]}
                          />
                          <View style={styles.info}>
                            <Text style={styles.name}>
                              {s.name}
                              {inactive ? ' (inactive)' : ''}
                            </Text>
                            {!!s.phone && (
                              <Text style={styles.phone}>{s.phone}</Text>
                            )}
                          </View>
                        </View>

                        {totalScore !== null && (
                          <View style={scoreBubbleStyles}>
                            <Text style={styles.scoreBubbleText}>
                              {totalScore}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Expanded scoring panel */}
                  {isExpanded && (
                    <View style={styles.scorePanel}>
                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Experience</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            s.id,
                            'experience_rating',
                            s.experience_rating,
                            experienceOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>
                          Behaviour support
                        </Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            s.id,
                            'behaviour_rating',
                            s.behaviour_rating,
                            behaviourOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Personal care</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            s.id,
                            'personal_care_rating',
                            s.personal_care_rating,
                            threeLevelOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Mobility</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            s.id,
                            'mobility_rating',
                            s.mobility_rating,
                            threeLevelOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Communication</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            s.id,
                            'communication_rating',
                            s.communication_rating,
                            threeLevelOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryLabel}>Reliability</Text>
                        <View style={styles.categoryPills}>
                          {renderPills(
                            s.id,
                            'reliability_rating',
                            s.reliability_rating,
                            reliabilityOptions,
                          )}
                        </View>
                      </View>

                      <View style={styles.notesBlock}>
                        <Text style={styles.notesLabel}>Supervisor notes</Text>
                        <TextInput
                          style={styles.notesInput}
                          value={s.supervisor_notes ?? ''}
                          onChangeText={text =>
                            updateStaffField(
                              s.id,
                              'supervisor_notes',
                              text || null,
                            )
                          }
                          placeholder="Anything important about this staff member’s strengths, preferences, or support needs."
                          placeholderTextColor="#b8a8d6"
                          multiline
                          textAlignVertical="top"
                        />
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
    width: 130,
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

  /* Add new staff */
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
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7dff2',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  editButtonsRow: {
    flexDirection: 'row',
    marginTop: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    marginTop: -4,
  },
  sectionScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#553a75',
    marginRight: 25,
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
  staffInfoBlock: {
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
  phone: {
    fontSize: 12,
    color: '#6b5a7d',
  },
  fieldBlock: {
    marginHorizontal: 6,
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
  notesBlock: {
    marginTop: 10,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#553a75',
    marginBottom: 4,
    marginTop: 2,
  },
  notesInput: {
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e1d5f5',
    backgroundColor: '#fbf8ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#332244',
  },
});
