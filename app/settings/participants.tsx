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
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { getRiskBand, SCORE_BUBBLE_STYLES } from '@/constants/ratingsTheme';
import Footer from '@/components/Footer';

const MAX_WIDTH = 880;

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

  // About / profile fields
  about_intro?: string | null;
  about_likes?: string | null;
  about_dislikes?: string | null;
  about_support?: string | null;
  about_safety?: string | null;
  about_pdf_url?: string | null;
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
    if (!name || !newGender || !newColor) return;

    setSavingNew(true);
    const { data, error } = await supabase
      .from('participants')
      .insert({
        name,
        is_active: true,
        gender: newGender,
        color: newColor,
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

  const threeLevelOptions: Option[] = [
    { label: 'Not set', short: '-', value: null },
    { label: '1 - Low', short: '1 - Low', value: 1 },
    { label: '2 - Medium', short: '2 - Medium', value: 2 },
    { label: '3 - High', short: '3 - High', value: 3 },
  ];

  function renderPills(
    participantId: string,
    field: keyof ParticipantRow,
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
    ].filter(
      (v): v is number => typeof v === 'number' && !Number.isNaN(v),
    );

    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }

  function getScoreLevel(total: number): 'low' | 'medium' | 'high' {
    // Delegate to shared participant risk bands (0–35)
    return getRiskBand(total);
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
            Score each participant across behaviours, personal care, communication,
            sensory, social, community, and safety. Higher totals indicate more
            complex participants who may require more experienced staff.
          </Text>

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
                  size={18}
                  color="#6b5a7d"
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
                    Frequency and intensity of behaviours of concern, and level of
                    support required to keep everyone safe.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Personal care:</Text>
                  <Text style={styles.legendText}>
                    Level of support required for toileting, showering, dressing,
                    hygiene, and medication prompts.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Communication:</Text>
                  <Text style={styles.legendText}>
                    Complexity of communication needs (non-verbal, devices, prompts,
                    visual supports, processing time).
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Sensory:</Text>
                  <Text style={styles.legendText}>
                    Sensitivity to noise, light, crowds, smells, or touch and how
                    much support is needed to manage this.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Social:</Text>
                  <Text style={styles.legendText}>
                    Support needed to engage safely with peers, manage boundaries,
                    and participate in group activities.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Community:</Text>
                  <Text style={styles.legendText}>
                    Support required to access the community (transport, public
                    settings, following instructions, road safety).
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Safety:</Text>
                  <Text style={styles.legendText}>
                    Overall safety risks (absconding, stranger danger, self-harm
                    risks, supervision level required).
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
                  size={18}
                  color="#6b5a7d"
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

                  {/* Gender: Male / Female */}
                  <View style={styles.addInlineGroup}>
                    <TouchableOpacity
                      style={[
                        styles.addInlinePill,
                        newGender === 'Male' && styles.addInlinePillActive,
                      ]}
                      onPress={() => setNewGender('Male')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.addInlineText,
                          newGender === 'Male' && styles.addInlineTextActive,
                        ]}
                      >
                        M
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addInlinePill,
                        newGender === 'Female' && styles.addInlinePillActive,
                      ]}
                      onPress={() => setNewGender('Female')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.addInlineText,
                          newGender === 'Female' && styles.addInlineTextActive,
                        ]}
                      >
                        F
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Colour: blue (boys) / pink (girls) */}
                  <View style={styles.addInlineGroup}>
                    <TouchableOpacity
                      style={[
                        styles.addInlinePill,
                        newColor === 'blue' && styles.addInlinePillActive,
                      ]}
                      onPress={() => setNewColor('blue')}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.addInlineColorDot,
                          { backgroundColor: '#60a5fa' },
                        ]}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addInlinePill,
                        newColor === 'pink' && styles.addInlinePillActive,
                      ]}
                      onPress={() => setNewColor('pink')}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.addInlineColorDot,
                          { backgroundColor: '#f472b6' },
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Add button */}
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      (
                        !newName.trim() ||
                        !newGender ||
                        !newColor ||
                        savingNew
                      ) && styles.addButtonDisabled,
                    ]}
                    onPress={addParticipant}
                    disabled={
                      !newName.trim() ||
                      !newGender ||
                      !newColor ||
                      savingNew
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
                    {
                      flex: 1,
                      marginTop: -8,
                      marginBottom: 4,
                    },
                  ]}
                >
                  Participant
                </Text>
                <Text
                  style={[
                    styles.headerCell,
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
                if (scoreLevel === 'low') scoreBubbleStyles.push(styles.scoreBubbleLow);
                if (scoreLevel === 'medium')
                  scoreBubbleStyles.push(styles.scoreBubbleMedium);
                if (scoreLevel === 'high')
                  scoreBubbleStyles.push(styles.scoreBubbleHigh);

                const isExpanded = expandedId === p.id;

                return (
                  <View key={p.id} style={rowStyles}>
                    {/* Row header: delete + participant info + score bubble */}
                    <View style={styles.rowHeader}>
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
                              threeLevelOptions,
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
                              threeLevelOptions,
                            )}
                          </View>
                        </View>

                        {/* About / profile section */}
                        <View style={styles.aboutBlock}>
                          <Text style={styles.aboutHeading}>
                            About this participant
                          </Text>
                          <Text style={styles.aboutSmallHint}>
                            This information is visible to staff when hovering over
                            this participant in the schedule. Keep it brief, clear,
                            and practical.
                          </Text>

                          <Text style={styles.aboutLabel}>Overview</Text>
                          <Text style={styles.aboutFieldHint}>
                            Short summary in 2–4 sentences (diagnosis in plain language,
                            communication style, general presentation).
                          </Text>
                          <TextInput
                            style={styles.aboutInput}
                            multiline
                            textAlignVertical="top"
                            value={p.about_intro ?? ''}
                            onChangeText={text =>
                              updateParticipant(p.id, 'about_intro', text || null)
                            }
                            placeholder="Example: Paul is an autistic adult with intellectual disability who enjoys drives, music, and food. He communicates using simple words and gestures and responds well to calm, clear instructions."
                            placeholderTextColor="#b8a8d6"
                          />

                          <Text style={styles.aboutLabel}>Likes</Text>
                          <Text style={styles.aboutFieldHint}>
                            One item per line. These will show as bullet points.
                          </Text>
                          <TextInput
                            style={styles.aboutInput}
                            multiline
                            textAlignVertical="top"
                            value={p.about_likes ?? ''}
                            onChangeText={text =>
                              updateParticipant(p.id, 'about_likes', text || null)
                            }
                            placeholder={'Music\nDrives\nHot chips'}
                            placeholderTextColor="#b8a8d6"
                          />

                          <Text style={styles.aboutLabel}>Dislikes / triggers</Text>
                          <Text style={styles.aboutFieldHint}>
                            Things that can distress or dysregulate this participant.
                          </Text>
                          <TextInput
                            style={styles.aboutInput}
                            multiline
                            textAlignVertical="top"
                            value={p.about_dislikes ?? ''}
                            onChangeText={text =>
                              updateParticipant(p.id, 'about_dislikes', text || null)
                            }
                            placeholder={'Waiting long periods\nLoud shouting'}
                            placeholderTextColor="#b8a8d6"
                          />

                          <Text style={styles.aboutLabel}>Support strategies</Text>
                          <Text style={styles.aboutFieldHint}>
                            What works well. One strategy per line.
                          </Text>
                          <TextInput
                            style={styles.aboutInput}
                            multiline
                            textAlignVertical="top"
                            value={p.about_support ?? ''}
                            onChangeText={text =>
                              updateParticipant(p.id, 'about_support', text || null)
                            }
                            placeholder={
                              'Use visual schedule\nOffer choices\nGive extra processing time'
                            }
                            placeholderTextColor="#b8a8d6"
                          />

                          <Text style={styles.aboutLabel}>Safety notes</Text>
                          <Text style={styles.aboutFieldHint}>
                            Any key risks or “watch outs” (will appear as badges).
                          </Text>
                          <TextInput
                            style={styles.aboutInput}
                            multiline
                            textAlignVertical="top"
                            value={p.about_safety ?? ''}
                            onChangeText={text =>
                              updateParticipant(p.id, 'about_safety', text || null)
                            }
                            placeholder={
                              'May attempt to leave room when distressed\nNeeds close supervision near roads'
                            }
                            placeholderTextColor="#b8a8d6"
                          />

                          <Text style={styles.aboutLabel}>Profile PDF link</Text>
                          <Text style={styles.aboutFieldHint}>
                            Full About Me / BSP PDF link (optional).
                          </Text>
                          <View style={styles.pdfRow}>
                            <TextInput
                              style={[styles.aboutInput, styles.pdfInput]}
                              value={p.about_pdf_url ?? ''}
                              onChangeText={text =>
                                updateParticipant(p.id, 'about_pdf_url', text || null)
                              }
                              placeholder="https://…/about-me.pdf"
                              placeholderTextColor="#b8a8d6"
                            />
                            {!!p.about_pdf_url && (
                              <TouchableOpacity
                                style={styles.pdfButton}
                                onPress={() => {
                                  if (p.about_pdf_url) {
                                    Linking.openURL(p.about_pdf_url as string);
                                  }
                                }}
                                activeOpacity={0.85}
                              >
                                <MaterialCommunityIcons
                                  name="file-pdf-box"
                                  size={18}
                                  color="#ef4444"
                                />
                                <Text style={styles.pdfButtonText}>
                                  Open PDF
                                </Text>
                              </TouchableOpacity>
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
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
  addHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
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
  addInlineGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  addInlinePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e1d5f5',
    backgroundColor: '#f8f4fb',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 4,
  },
  addInlinePillActive: {
    backgroundColor: '#e9d5ff',
    borderColor: '#c4b5fd',
  },
  addInlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b164c',
  },
  addInlineTextActive: {
    color: '#111827',
  },
  addInlineColorDot: {
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
    alignItems: 'flex-start',
    marginLeft: 40,
    marginTop: -6,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a678e',
  },
  row: {
    flexDirection: 'column',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 10,
    alignItems: 'stretch',
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

  // Delete button (red X only)
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

  participantInfoBlock: {
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
  supportNeeds: {
    fontSize: 12,
    color: '#6b5a7d',
    marginTop: 2,
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
    marginLeft: 'auto',
    marginRight: 10,
  },
  scoreBubbleLow: {
    backgroundColor: SCORE_BUBBLE_STYLES.low.bg,
    borderColor: SCORE_BUBBLE_STYLES.low.border,
  },
  scoreBubbleMedium: {
    backgroundColor: SCORE_BUBBLE_STYLES.medium.bg,
    borderColor: SCORE_BUBBLE_STYLES.medium.border,
  },
  scoreBubbleHigh: {
    backgroundColor: SCORE_BUBBLE_STYLES.high.bg,
    borderColor: SCORE_BUBBLE_STYLES.high.border,
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
  aboutBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1e9ff',
  },
  aboutHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#332244',
    marginBottom: 4,
  },
  aboutSmallHint: {
    fontSize: 11,
    color: '#6b5a7d',
    marginBottom: 10,
  },
  aboutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#553a75',
    marginTop: 8,
    marginBottom: 4,
  },
  aboutFieldHint: {
    fontSize: 11,
    color: '#6b5a7d',
    marginBottom: 4,
  },
  aboutInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1d5f5',
    backgroundColor: '#fbf8ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#332244',
    minHeight: 60,
    marginBottom: 4,
  },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pdfInput: {
    flex: 1,
    marginRight: 8,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  pdfButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b91c1c',
    marginLeft: 4,
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
  pillText: {
    fontSize: 12,
    color: '#3e3e3e',
  },
  pillTextActive: {
    color: '#000000',
    fontWeight: '600',
  },

  pillSelectedLow: {
    backgroundColor: '#D4F8E3',
    borderColor: '#4CAF50',
  },
  pillSelectedMedium: {
    backgroundColor: '#FFF5D0',
    borderColor: '#FFC107',
  },
  pillSelectedHigh: {
    backgroundColor: '#FFE0E0',
    borderColor: '#F44336',
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
});

const PINK = '#FF8FC5';

export const options = {
  headerTitleAlign: 'center' as const,
  headerTitle: () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialCommunityIcons
        name="account-child-outline"
        size={18}
        color={PINK}
      />
      <Text
        style={{
          marginLeft: 6,
          fontSize: 16,
          fontWeight: '700',
          color: PINK,
        }}
      >
        Participants Settings
      </Text>
    </View>
  ),
};
