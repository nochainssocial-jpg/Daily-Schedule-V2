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
import {
  getScoreLevel,
  getBandForScoreLevel,
  SCORE_BUBBLE_STYLES,
} from '@/constants/ratingsTheme';
import Footer from '@/components/Footer';

const MAX_WIDTH = 880;

type StaffRow = {
  id: string;
  name: string;
  phone?: string | null;
  color?: string | null;
  gender?: 'male' | 'female' | null;
  is_active?: boolean | null;

  // Rating fields (1–3 or null)
  experience_rating?: number | null;
  behaviour_support_rating?: number | null;
  personal_care_rating?: number | null;
  mobility_assistance_rating?: number | null;
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
      .select(
        `
        id,
        name,
        phone,
        color,
        gender,
        is_active,
        experience_rating,
        behaviour_support_rating,
        personal_care_rating,
        mobility_assistance_rating,
        communication_rating,
        reliability_rating,
        supervisor_notes
      `,
      )
      .order('name', { ascending: true });

    if (data) {
      setStaff(data as StaffRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function updateStaffField(
    id: string,
    field: keyof StaffRow,
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
        color: colorHex,
        gender: genderValue,
        is_active: true,
      })
      .select()
      .single();

    setSavingNew(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    if (data) {
      setStaff(prev =>
        [...prev, data as StaffRow].sort((a, b) =>
          (a.name || '').localeCompare(b.name || ''),
        ),
      );
      setNewName('');
      setNewPhone('');
      setNewColor(null);
      setNewGender(null);
    }
  }

  function startEdit(member: StaffRow) {
    setEditingId(member.id);
    setEditingName(member.name ?? '');
    setEditingPhone(member.phone ?? '');
  }

  async function saveEdit() {
    if (!editingId) return;
    const trimmedName = editingName.trim();
    const trimmedPhone = editingPhone.trim();

    if (!trimmedName) {
      setEditingId(null);
      setEditingName('');
      setEditingPhone('');
      return;
    }

    await supabase
      .from('staff')
      .update({ name: trimmedName, phone: trimmedPhone || null })
      .eq('id', editingId);

    setStaff(prev =>
      prev.map(s =>
        s.id === editingId
          ? { ...s, name: trimmedName, phone: trimmedPhone || null }
          : s,
      ),
    );

    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
    setEditingPhone('');
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

  const threeLevelOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1 - Low', short: '1 - Low', value: 1 },
    { label: '2 - Medium', short: '2 - Medium', value: 2 },
    { label: '3 - High', short: '3 - High', value: 3 },
  ];

  function renderPills(
    staffId: string,
    field: keyof StaffRow,
    currentValue: number | null | undefined,
    options: Option[],
  ) {
    return (
      <View style={styles.pillRow}>
        {options.map(opt => {
          const isSelected = currentValue === opt.value;
          const isMinus = opt.value === null && opt.short === '–';

          const pillStyles = [styles.pill];
          if (isMinus) {
            pillStyles.push(styles.pillMinus);
          } else if (isSelected) {
            pillStyles.push(styles.pillActive);
          }

          const textStyles = [styles.pillText];
          if (isMinus) {
            textStyles.push(styles.pillMinusText);
          } else if (isSelected) {
            textStyles.push(styles.pillTextActive);
          }

          return (
            <TouchableOpacity
              key={`${field}-${staffId}-${opt.short}`}
              style={pillStyles}
              onPress={() => updateStaffField(staffId, field, opt.value)}
              activeOpacity={0.8}
            >
              <Text style={textStyles}>{opt.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function getTotalScore(s: StaffRow): number | null {
    const values = [
      s.experience_rating,
      s.behaviour_support_rating,
      s.personal_care_rating,
      s.mobility_assistance_rating,
      s.communication_rating,
      s.reliability_rating,
    ].filter(v => v !== null && v !== undefined) as number[];

    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.headingRow}>
            <View style={styles.headingLeft}>
              <Image
                source={require('@/assets/images/nochains-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.heading}>Staff ratings &amp; profiles</Text>
                <Text style={styles.subHeading}>
                  Use this screen to manage the staff list and record skills and
                  experience levels.
                </Text>
              </View>
            </View>

            {showWebBranding && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Admin</Text>
              </View>
            )}
          </View>

          {/* Legend */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Legend</Text>
                <Text style={styles.sectionSubtitle}>
                  Each category is scored from 1–3. Higher totals indicate
                  stronger capability for complex participants.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLegendCollapsed(prev => !prev)}
                style={styles.chevronButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={legendCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={18}
                  color="#6b5a7d"
                />
              </TouchableOpacity>
            </View>

            {!legendCollapsed && (
              <>
                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Experience:</Text>
                  <Text style={styles.legendText}>
                    Overall community/disability support experience and years in
                    the sector.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Behaviour support:</Text>
                  <Text style={styles.legendText}>
                    Confidence and competence in working with behaviours of
                    concern and following BSPs.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Personal care:</Text>
                  <Text style={styles.legendText}>
                    Skills in hoisting, transfers, showering, toileting, and
                    mealtime supports.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Mobility assistance:</Text>
                  <Text style={styles.legendText}>
                    Experience with wheelchairs, walkers, and manual handling
                    techniques.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Communication:</Text>
                  <Text style={styles.legendText}>
                    Ability to communicate clearly with participants,
                    families/guardians, and team members.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Reliability:</Text>
                  <Text style={styles.legendText}>
                    Punctuality, attendance, and consistency in following
                    routines and plans.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Total score:</Text>
                  <Text style={styles.legendText}>
                    Combined total across all categories. Used in the Daily
                    Schedule to balance staff skill mix for complex days.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Colour coding:</Text>
                  <Text style={styles.legendText}>
                    Purple scores are lower, amber are mid-range, and green
                    scores indicate high capability.
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Add staff */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Add staff</Text>
              <TouchableOpacity
                onPress={() => setAddCollapsed(prev => !prev)}
                style={styles.chevronButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={addCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={18}
                  color="#6b5a7d"
                />
              </TouchableOpacity>
            </View>

            {!addCollapsed && (
              <>
                <Text style={styles.addHint}>
                  Add staff members who work at B2. Use the rating fields below
                  to record skills and experience levels.
                </Text>

                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Staff name"
                    value={newName}
                    onChangeText={setNewName}
                    placeholderTextColor="#b8a8d6"
                  />
                </View>

                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Phone number (optional)"
                    value={newPhone}
                    onChangeText={setNewPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor="#b8a8d6"
                  />
                </View>

                <View style={styles.addRow}>
                  <View style={styles.addInlineGroup}>
                    <TouchableOpacity
                      style={[
                        styles.addInlinePill,
                        newGender === 'male' && styles.addInlinePillActive,
                      ]}
                      onPress={() => setNewGender('male')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.addInlineText,
                          newGender === 'male' && styles.addInlineTextActive,
                        ]}
                      >
                        M
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addInlinePill,
                        newGender === 'female' && styles.addInlinePillActive,
                      ]}
                      onPress={() => setNewGender('female')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.addInlineText,
                          newGender === 'female' && styles.addInlineTextActive,
                        ]}
                      >
                        F
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.addInlineGroup}>
                    <TouchableOpacity
                      style={[
                        styles.addInlinePill,
                        newColor === 'blue' && styles.addInlinePillActive,
                      ]}
                      onPress={() => setNewColor('blue')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.addInlineText,
                          newColor === 'blue' && styles.addInlineTextActive,
                        ]}
                      >
                        Blue
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addInlinePill,
                        newColor === 'pink' && styles.addInlinePillActive,
                      ]}
                      onPress={() => setNewColor('pink')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.addInlineText,
                          newColor === 'pink' && styles.addInlineTextActive,
                        ]}
                      >
                        Pink
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      (!newName.trim() ||
                        !newColor ||
                        !newGender ||
                        savingNew) && styles.addButtonDisabled,
                    ]}
                    onPress={addStaff}
                    disabled={
                      !newName.trim() || !newColor || !newGender || savingNew
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addButtonText}>
                      {savingNew ? 'Saving…' : 'Add staff'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Staff list */}
          {loading ? (
            <ActivityIndicator size="large" color="#c084fc" />
          ) : (
            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <Text style={[styles.listHeaderText, { flex: 1 }]}>
                  Staff member
                </Text>
                <Text style={[styles.listHeaderText, { width: 80 }]}>
                  Total
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
                const isEditing = editingId === s.id;

                return (
                  <View key={s.id} style={rowStyles}>
                    {/* Row header: delete + staff info + score bubble */}
                    <View style={styles.rowHeader}>
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

                      <TouchableOpacity
                        style={styles.rowHeaderMain}
                        onPress={
                          isEditing
                            ? undefined
                            : () =>
                                setExpandedId(prev =>
                                  prev === s.id ? null : s.id,
                                )
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
                            {isEditing ? (
                              <>
                                <TextInput
                                  style={styles.nameEditInput}
                                  value={editingName}
                                  onChangeText={setEditingName}
                                  placeholder="Name"
                                  placeholderTextColor="#b8a8d6"
                                  autoFocus
                                />
                                <TextInput
                                  style={styles.phoneEditInput}
                                  value={editingPhone}
                                  onChangeText={setEditingPhone}
                                  placeholder="Phone (optional)"
                                  keyboardType="phone-pad"
                                  placeholderTextColor="#b8a8d6"
                                />
                                <View style={styles.editButtonsRow}>
                                  <TouchableOpacity
                                    style={styles.smallButton}
                                    onPress={saveEdit}
                                    activeOpacity={0.85}
                                  >
                                    <Text style={styles.smallButtonText}>
                                      Save
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      styles.smallButton,
                                      styles.smallButtonSecondary,
                                    ]}
                                    onPress={cancelEdit}
                                    activeOpacity={0.85}
                                  >
                                    <Text
                                      style={styles.smallButtonSecondaryText}
                                    >
                                      Cancel
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </>
                            ) : (
                              <>
                                <Text style={styles.name}>
                                  {s.name}
                                  {inactive ? ' (inactive)' : ''}
                                </Text>
                                {!!s.phone && (
                                  <Text style={styles.phone}>{s.phone}</Text>
                                )}
                              </>
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
                    </View>

                    {/* Expanded ratings + notes */}
                    {isExpanded && (
                      <View style={styles.expanded}>
                        {/* Experience */}
                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>Experience</Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'experience_rating',
                              s.experience_rating,
                              threeLevelOptions,
                            )}
                          </View>
                        </View>

                        {/* Behaviour support */}
                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>
                            Behaviour support
                          </Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'behaviour_support_rating',
                              s.behaviour_support_rating,
                              threeLevelOptions,
                            )}
                          </View>
                        </View>

                        {/* Personal care */}
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

                        {/* Mobility assistance */}
                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>
                            Mobility assistance
                          </Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'mobility_assistance_rating',
                              s.mobility_assistance_rating,
                              threeLevelOptions,
                            )}
                          </View>
                        </View>

                        {/* Communication */}
                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>
                            Communication
                          </Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'communication_rating',
                              s.communication_rating,
                              threeLevelOptions,
                            )}
                          </View>
                        </View>

                        {/* Reliability */}
                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>Reliability</Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'reliability_rating',
                              s.reliability_rating,
                              threeLevelOptions,
                            )}
                          </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.notesSection}>
                          <Text style={styles.notesLabel}>Notes</Text>
                          <TextInput
                            style={styles.notesInput}
                            multiline
                            placeholder="Supervisor notes, key strengths, training needs, etc."
                            placeholderTextColor="#b8a8d6"
                            value={s.supervisor_notes ?? ''}
                            onChangeText={text =>
                              updateStaffField(
                                s.id,
                                'supervisor_notes',
                                text || null,
                              )
                            }
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <Footer />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e8ff',
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  headingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 52,
    height: 52,
    marginRight: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#332244',
  },
  subHeading: {
    fontSize: 14,
    color: '#553a75',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f973b7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },

  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#332244',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b5a7d',
    marginTop: 2,
  },
  chevronButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  legendRow: {
    marginBottom: 6,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#553a75',
    marginBottom: 2,
  },
  legendText: {
    fontSize: 13,
    color: '#4b5563',
  },

  addHint: {
    fontSize: 13,
    color: '#4b5563',
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
  },
  addInlineGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  addInlinePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4c4e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    backgroundColor: '#ffffff',
  },
  addInlinePillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  addInlineText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  addInlineTextActive: {
    color: '#ffffff',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
  },
  addButtonDisabled: {
    backgroundColor: '#c4b5fd',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
    marginBottom: 6,
  },
  listHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#553a75',
  },

  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3e8ff',
  },
  rowInactive: {
    opacity: 0.5,
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

  // NEW: red bin (trash) icon button
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 8,
    marginLeft: 0,
  },
  deleteButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
  },
  editButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 8,
  },

  staffInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  phone: {
    fontSize: 13,
    color: '#4b5563',
  },

  scoreBubble: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBubbleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  scoreBubbleLow: SCORE_BUBBLE_STYLES.low,
  scoreBubbleMedium: SCORE_BUBBLE_STYLES.medium,
  scoreBubbleHigh: SCORE_BUBBLE_STYLES.high,

  expanded: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
    backgroundColor: '#4ade80',
    borderColor: '#16a34a',
  },
  pillText: {
    fontSize: 13,
    color: '#111827',
  },
  pillTextActive: {
    fontWeight: '700',
  },

  pillMinus: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    marginRight: 4,
    marginLeft: 4,
  },
  pillMinusText: {
    fontSize: 20,
    color: '#ef4444',
    fontWeight: '700',
  },

  notesSection: {
    marginTop: 8,
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
    backgroundColor: '#f8f4fb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#332244',
  },
  nameEditInput: {
    fontSize: 14,
    color: '#332244',
    backgroundColor: '#f8f4fb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e1d5f5',
    marginBottom: 6,
  },
  phoneEditInput: {
    fontSize: 14,
    color: '#332244',
    backgroundColor: '#f8f4fb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e1d5f5',
    marginBottom: 6,
  },
  editButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
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
  },
});

const PINK = '#f973b7';

export const options = {
  headerTitleAlign: 'center' as const,
  headerTitle: () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialCommunityIcons name="account-group" size={18} color={PINK} />
      <Text
        style={{
          marginLeft: 6,
          fontSize: 16,
          fontWeight: '700',
          color: PINK,
        }}
      >
        Staff Settings
      </Text>
    </View>
  ),
};
