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

type StaffRow = {
  id: string;
  name: string;
  phone?: string | null;
  color?: string | null;
  is_active?: boolean | null;
  experience_level?: number | null;
  behaviour_capability?: number | null;
  personal_care_skill?: number | null;
  mobility_assistance?: number | null;
  communication_support?: number | null;
  reliability_rating?: number | null;
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
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const showWebBranding = Platform.OS === 'web';

  async function loadStaff() {
    setLoading(true);
    const { data } = await supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });

    if (data) setStaff(data as StaffRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function updateStaff(id: string, field: keyof StaffRow, value: any) {
    await supabase.from('staff').update({ [field]: value }).eq('id', id);
    setStaff(prev =>
      prev.map(s => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }

  async function addStaff() {
    const name = newName.trim();
    const phone = newPhone.trim();

    if (!name) return;

    setSavingNew(true);
    const { data, error } = await supabase
      .from('staff')
      .insert({
        name,
        phone: phone || null,
        is_active: true,
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

  const experienceOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Beginner', short: 'Beg', value: 1 },
    { label: 'Intermediate', short: 'Int', value: 2 },
    { label: 'Senior', short: 'Sen', value: 3 },
  ];

  const behaviourOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Low', short: 'Low', value: 1 },
    { label: 'Medium', short: 'Med', value: 2 },
    { label: 'High', short: 'High', value: 3 },
  ];

  const reliabilityOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Inconsistent', short: 'Inc', value: 1 },
    { label: 'Moderate', short: 'Mod', value: 2 },
    { label: 'Consistent', short: 'Con', value: 3 },
  ];

  const personalCareOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Low', short: 'Low', value: 1 },
    { label: 'Medium', short: 'Med', value: 2 },
    { label: 'High', short: 'High', value: 3 },
  ];

  const mobilityOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Low', short: 'Low', value: 1 },
    { label: 'Medium', short: 'Med', value: 2 },
    { label: 'High', short: 'High', value: 3 },
  ];

  const communicationOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Basic', short: 'Bas', value: 1 },
    { label: 'Good', short: 'Good', value: 2 },
    { label: 'Advanced', short: 'Adv', value: 3 },
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
          const isSelected =
            (currentValue === null || currentValue === undefined)
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
              onPress={() => updateStaff(staffId, field, opt.value)}
              activeOpacity={0.8}
            >
              <Text style={textStyles}>{opt.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function getTotalScore(member: StaffRow): number | null {
    const values = [
      member.experience_level,
      member.behaviour_capability,
      member.personal_care_skill,
      member.mobility_assistance,
      member.communication_support,
      member.reliability_rating,
    ].filter(
      (v): v is number => typeof v === 'number' && !Number.isNaN(v),
    );

    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }

  function getScoreLevel(total: number): 'low' | 'medium' | 'high' {
    if (total >= 15) return 'high';
    if (total >= 10) return 'medium';
    return 'low';
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
          <Text style={styles.heading}>Staff Settings</Text>
          <Text style={styles.subHeading}>
            Set experience, behaviour support, personal care, mobility, communication, and reliability for each staff member.
          </Text>

          {/* LEGEND */}
          <View style={styles.legendWrap}>
            <View style={styles.legendHeaderRow}>
              <Text style={styles.legendTitle}>Legend</Text>
              <TouchableOpacity
                onPress={() => setLegendCollapsed(prev => !prev)}
                style={styles.legendToggle}
                activeOpacity={0.8}
              >
                <Text style={styles.legendToggleText}>
                  {legendCollapsed ? 'Show legend ▼' : 'Hide legend ▲'}
                </Text>
              </TouchableOpacity>
            </View>

            {!legendCollapsed && (
              <>
                <Text style={styles.legendHint}>
                  Each category is scored from 1–3. Higher totals indicate staff who are better suited to more complex participants.
                </Text>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Experience:</Text>
                  <Text style={styles.legendText}>
                    Overall level of experience and confidence supporting participants across different needs.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Behaviour:</Text>
                  <Text style={styles.legendText}>
                    Ability to manage, de-escalate, and prevent behaviours of concern.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Personal care:</Text>
                  <Text style={styles.legendText}>
                    Competence with hygiene, toileting, showering, dressing, and medication prompts.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Mobility:</Text>
                  <Text style={styles.legendText}>
                    Mobility assistance — Low, Medium, High
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Communication:</Text>
                  <Text style={styles.legendText}>
                    Skill in supporting verbal, non-verbal, or cognitively impaired participants.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Reliability:</Text>
                  <Text style={styles.legendText}>
                    Punctuality, attendance, communication, and consistency in following plans.
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* ADD NEW STAFF */}
          <View style={styles.addWrap}>
            <Text style={styles.addTitle}>Add new staff member</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Name"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor="#b8a8d6"
              />
              <TextInput
                style={styles.addInput}
                placeholder="Phone (optional)"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#b8a8d6"
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!newName.trim() || savingNew) && styles.addButtonDisabled,
                ]}
                onPress={addStaff}
                disabled={!newName.trim() || savingNew}
                activeOpacity={0.85}
              >
                <Text style={styles.addButtonText}>
                  {savingNew ? 'Saving…' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addHint}>
              Name is required. Phone helps for quick contact and pickups.
            </Text>
          </View>

          {/* Staff list */}
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
                <Text style={[styles.headerCell, { flex: 1 }]}>Staff</Text>
                <Text style={[styles.headerCell, { width: 70, textAlign: 'right' }]}>
                  Score
                </Text>
              </View>

              {staff.map(s => {
                const inactive = s.is_active === false;
                const totalScore = getTotalScore(s);
                const scoreLevel = totalScore === null ? null : getScoreLevel(totalScore);

                const rowStyles = [styles.row];
                if (inactive) rowStyles.push(styles.rowInactive);

                const scoreBubbleStyles = [styles.scoreBubble];
                if (scoreLevel === 'low') scoreBubbleStyles.push(styles.scoreBubbleLow);
                if (scoreLevel === 'medium') scoreBubbleStyles.push(styles.scoreBubbleMedium);
                if (scoreLevel === 'high') scoreBubbleStyles.push(styles.scoreBubbleHigh);

                const isExpanded = expandedId === s.id;

                return (
                  <View key={s.id} style={rowStyles}>
                    {/* Row header: delete + staff info + score bubble */}
                    <View style={styles.rowHeader}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => confirmDeleteStaff(s)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.deleteButtonText}>x</Text>
                      </TouchableOpacity>

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
                            <Text style={styles.scoreBubbleText}>{totalScore}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Expanded scoring panel */}
                    {isExpanded && (
                      <View style={styles.scorePanel}>
                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>Experience</Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'experience_level',
                              s.experience_level,
                              experienceOptions,
                            )}
                          </View>
                        </View>

                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>Behaviour support</Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'behaviour_capability',
                              s.behaviour_capability,
                              behaviourOptions,
                            )}
                          </View>
                        </View>

                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>Personal care</Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'personal_care_skill',
                              s.personal_care_skill,
                              personalCareOptions,
                            )}
                          </View>
                        </View>

                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>Mobility</Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'mobility_assistance',
                              s.mobility_assistance,
                              mobilityOptions,
                            )}
                          </View>
                        </View>

                        <View style={styles.categoryRow}>
                          <Text style={styles.categoryLabel}>Communication</Text>
                          <View style={styles.categoryPills}>
                            {renderPills(
                              s.id,
                              'communication_support',
                              s.communication_support,
                              communicationOptions,
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
                      </View>
                    )}
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
    width: 110,
  },
  legendText: {
    fontSize: 13,
    color: '#6b5a7d',
    flex: 1,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    marginRight: 6,
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
    padding: 12,
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
  scoreBubble: {
    Width: 80,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e7dff2',
    backgroundColor: '#f8f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBubbleLow: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  scoreBubbleMedium: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  scoreBubbleHigh: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  scoreBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#332244',
  },
  scorePanel: {
    marginTop: 10,
    paddingTop: 10,
    marginLeft: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1e9ff',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 50,
  },
  categoryLabel: {
    width: 130,
    fontSize: 13,
    fontWeight: '600',
    color: '#553a75',
  },
  categoryPills: {
    flex: 1,
  },
  // NEW: red X only
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
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
    flexShrink: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7c7f0',
    backgroundColor: '#f6f1ff',
    marginRight: 4,
    marginBottom: 4,
  },
  pillActive: {
    backgroundColor: '#008aff',
    borderColor: '#008aff',
  },
  pillText: {
    fontSize: 12,
    color: '#5b4a76',
  },
  pillTextActive: {
    color: '#ffffff',
  },

  pillSelectedLow: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  pillSelectedMedium: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  pillSelectedHigh: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  // NEW: minus pill styling
  pillMinus: {
    // Show just a red "-" with no pill background
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    marginRight: 6,
  },
  pillMinusText: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
