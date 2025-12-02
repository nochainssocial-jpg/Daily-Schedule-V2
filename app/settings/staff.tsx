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

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const showWebBranding = Platform.OS === 'web';
  const [legendCollapsed, setLegendCollapsed] = useState(false);

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


  function computeTotalScore(member: StaffRow): number | null {
    const values = [
      member.experience_level,
      member.behaviour_capability,
      member.personal_care_skill,
      member.mobility_assistance,
      member.communication_support,
      member.reliability_rating,
    ].filter(v => typeof v === 'number') as number[];

    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }

  function getScoreStyle(total: number | null) {
    if (total === null) return styles.scoreCircleEmpty;
    if (total <= 9) return styles.scoreCircleLow;
    if (total <= 14) return styles.scoreCircleMedium;
    return styles.scoreCircleHigh;
  }

  const experienceOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Beginner (1)', short: '1', value: 1 },
    { label: 'Intermediate (2)', short: '2', value: 2 },
    { label: 'Senior (3)', short: '3', value: 3 },
  ];

  const behaviourOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Low (1)', short: '1', value: 1 },
    { label: 'Medium (2)', short: '2', value: 2 },
    { label: 'High (3)', short: '3', value: 3 },
  ];

  const reliabilityOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Inconsistent (1)', short: '1', value: 1 },
    { label: 'Moderate (2)', short: '2', value: 2 },
    { label: 'Consistent (3)', short: '3', value: 3 },
  ];


  const personalCareOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Low personal care (1)', short: '1', value: 1 },
    { label: 'Medium personal care (2)', short: '2', value: 2 },
    { label: 'High personal care (3)', short: '3', value: 3 },
  ];

  const mobilityOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Low mobility support (1)', short: '1', value: 1 },
    { label: 'Medium mobility support (2)', short: '2', value: 2 },
    { label: 'High mobility support (3)', short: '3', value: 3 },
  ];

  const communicationOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Basic communication support (1)', short: '1', value: 1 },
    { label: 'Good communication support (2)', short: '2', value: 2 },
    { label: 'Advanced communication support (3)', short: '3', value: 3 },
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
          } else if (isSelected && opt.value === 1) {
            pillStyles.push(styles.pillSelectedLow);
          } else if (isSelected && opt.value === 2) {
            pillStyles.push(styles.pillSelectedMedium);
          } else if (isSelected && opt.value === 3) {
            pillStyles.push(styles.pillSelectedHigh);
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
            Score each staff member across experience, behaviour support, personal care,
            mobility, communication, and reliability. These scores will help future
            automation match staff to participants safely.
          </Text>

          {/* LEGEND */}
          <View style={styles.legendWrap}>
            <View style={styles.legendHeaderRow}>
              <Text style={styles.legendTitle}>Legend</Text>
              <TouchableOpacity
                onPress={() => setLegendCollapsed(prev => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.legendToggleText}>
                  {legendCollapsed ? 'Show legend ▼' : 'Hide legend ▲'}
                </Text>
              </TouchableOpacity>
            </View>

            {!legendCollapsed && (
              <>
                <Text style={styles.legendHint}>
                  Each category is scored from 1–3. Higher totals mean a staff member is
                  better suited for higher complexity participants. The total score appears
                  beside each staff member&apos;s name.
                </Text>

                <View style={styles.legendPillRow}>
                  <View style={[styles.legendPill, styles.legendPillExperience]}>
                    <Text style={styles.legendPillText}>Experience</Text>
                  </View>
                  <View style={[styles.legendPill, styles.legendPillBehaviour]}>
                    <Text style={styles.legendPillText}>Behaviour support</Text>
                  </View>
                  <View style={[styles.legendPill, styles.legendPillPersonalCare]}>
                    <Text style={styles.legendPillText}>Personal care</Text>
                  </View>
                  <View style={[styles.legendPill, styles.legendPillMobility]}>
                    <Text style={styles.legendPillText}>Mobility</Text>
                  </View>
                  <View style={[styles.legendPill, styles.legendPillCommunication]}>
                    <Text style={styles.legendPillText}>Communication</Text>
                  </View>
                  <View style={[styles.legendPill, styles.legendPillReliability]}>
                    <Text style={styles.legendPillText}>Reliability</Text>
                  </View>
                </View>

                <View style={styles.legendDescriptions}>
                  <Text style={styles.legendText}>
                    <Text style={styles.legendLabel}>Experience</Text> – overall level of
                    experience and confidence supporting participants with different needs.
                  </Text>
                  <Text style={styles.legendText}>
                    <Text style={styles.legendLabel}>Behaviour support</Text> – ability to
                    manage, de-escalate, and prevent behaviours of concern.
                  </Text>
                  <Text style={styles.legendText}>
                    <Text style={styles.legendLabel}>Personal care</Text> – competence with
                    hygiene, toileting, showering, dressing, and medication prompts.
                  </Text>
                  <Text style={styles.legendText}>
                    <Text style={styles.legendLabel}>Mobility</Text> – ability to support
                    transfers, wheelchairs, hoists and safe manual handling.
                  </Text>
                  <Text style={styles.legendText}>
                    <Text style={styles.legendLabel}>Communication</Text> – skill in
                    supporting verbal, non-verbal, or cognitively impaired participants.
                  </Text>
                  <Text style={styles.legendText}>
                    <Text style={styles.legendLabel}>Reliability</Text> – punctuality,
                    attendance, communication, and consistency in following plans.
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
                <Text style={[styles.headerCell, { flex: 1.8 }]}>Staff</Text>
                <Text style={[styles.headerCell, { flex: 0.9 }]}>Exp</Text>
                <Text style={[styles.headerCell, { flex: 0.9 }]}>Behav</Text>
                <Text style={[styles.headerCell, { flex: 0.9 }]}>Pers care</Text>
                <Text style={[styles.headerCell, { flex: 0.9 }]}>Mob</Text>
                <Text style={[styles.headerCell, { flex: 0.9 }]}>Comm</Text>
                <Text style={[styles.headerCell, { flex: 0.9 }]}>Rel</Text>
              </View>

              {staff.map(s => {
                const inactive = s.is_active === false;
                const totalScore = computeTotalScore(s);
                const scoreStyle = getScoreStyle(totalScore);

                return (
                  <View
                    key={s.id}
                    style={[styles.row, inactive && styles.rowInactive]}
                  >
                    {/* Delete button – red X text only */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmDeleteStaff(s)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.deleteButtonText}>x</Text>
                    </TouchableOpacity>

                    <View style={[styles.staffInfoBlock, { flex: 1.6 }]}>
                      <View
                        style={[
                          styles.colorBox,
                          { backgroundColor: s.color || '#d4c4e8' },
                        ]}
                      />
                      <View style={styles.infoRow}>
                        <View style={styles.info}>
                          <Text style={styles.name}>
                            {s.name}
                            {inactive ? ' (inactive)' : ''}
                          </Text>
                          {!!s.phone && (
                            <Text style={styles.phone}>{s.phone}</Text>
                          )}
                        </View>
                        {totalScore !== null && (
                          <View style={[styles.scoreCircle, scoreStyle]}>
                            <Text style={styles.scoreCircleText}>{totalScore}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={[styles.fieldBlock, { flex: 0.9 }]}>
                      {renderPills(
                        s.id,
                        'experience_level',
                        s.experience_level,
                        experienceOptions,
                      )}
                    </View>

                    <View style={[styles.fieldBlock, { flex: 0.9 }]}>
                      {renderPills(
                        s.id,
                        'behaviour_capability',
                        s.behaviour_capability,
                        behaviourOptions,
                      )}
                    </View>

                    <View style={[styles.fieldBlock, { flex: 0.9 }]}>
                      {renderPills(
                        s.id,
                        'personal_care_skill',
                        s.personal_care_skill,
                        personalCareOptions,
                      )}
                    </View>

                    <View style={[styles.fieldBlock, { flex: 0.9 }]}>
                      {renderPills(
                        s.id,
                        'mobility_assistance',
                        s.mobility_assistance,
                        mobilityOptions,
                      )}
                    </View>

                    <View style={[styles.fieldBlock, { flex: 0.9 }]}>
                      {renderPills(
                        s.id,
                        'communication_support',
                        s.communication_support,
                        communicationOptions,
                      )}
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
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#332244',
  },
  legendToggleText: {
    fontSize: 13,
    color: '#8b6bb5',
  },
  legendHint: {
    fontSize: 13,
    color: '#6b5a7d',
    marginBottom: 10,
  },
  legendPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  legendPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  legendPillExperience: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  legendPillBehaviour: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  legendPillPersonalCare: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  legendPillMobility: {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
  },
  legendPillCommunication: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  legendPillReliability: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  legendPillText: {
    fontSize: 13,
    color: '#332244',
    fontWeight: '600',
  },
  legendDescriptions: {
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#553a75',
  },
  legendText: {
    fontSize: 13,
    color: '#6b5a7d',
    marginBottom: 4,
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
    marginRight: 8,
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
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flexShrink: 1,
    paddingRight: 8,
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
  scoreCircle: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  scoreCircleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  scoreCircleEmpty: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  scoreCircleLow: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  scoreCircleMedium: {
    backgroundColor: '#ffedd5',
    borderColor: '#fed7aa',
  },
  scoreCircleHigh: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
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
  pillSelectedLow: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  pillSelectedMedium: {
    backgroundColor: '#ffedd5',
    borderColor: '#fed7aa',
  },
  pillSelectedHigh: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  pillText: {
    fontSize: 12,
    color: '#5b4a76',
  },
  pillTextActive: {
    color: '#332244',
    fontWeight: '600',
  },

  // NEW: minus pill styling
  pillMinus: {
    // Show just a red "-" with no pill background
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    marginRight: 8,
  },
  pillMinusText: {
    color: '#ef4444',
    fontWeight: '700',
  },
});