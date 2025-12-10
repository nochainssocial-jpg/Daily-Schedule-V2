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
const PINK = '#FF8FC5';

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

    if (data) {
      setParticipants(data as ParticipantRow[]);
    }
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

  const threeLevelOptions: Option[] = [
    { label: '-', short: '-', value: null },
    { label: '1', short: '1', value: 1 },
    { label: '2', short: '2', value: 2 },
    { label: '3', short: '3', value: 3 },
  ];

  const behaviourOptions: Option[] = [
    { label: '-', short: '-', value: null },
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
          const isSelected = currentValue === opt.value;
          const isMinus = opt.value === null;

          const pillStyles = [styles.pill];
          if (isSelected && !isMinus) {
            pillStyles.push(styles.pillActive);
          } else if (isMinus) {
            pillStyles.push(styles.pillMinus);
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
              onPress={() =>
                updateParticipant(
                  participantId,
                  field,
                  isMinus && isSelected ? null : opt.value,
                )
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

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

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
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.heading}>
                Participants – support complexity ratings
              </Text>
              <Text style={styles.subHeading}>
                Use these ratings to match staff fairly and safely when building
                the daily schedule. Higher totals indicate higher support
                complexity.
              </Text>
            </View>
            <View style={styles.scoreLegend}>
              <Text style={styles.scoreLegendTitle}>Overall score bands</Text>
              <View style={styles.scoreLegendRow}>
                <View
                  style={[
                    styles.scoreLegendBubble,
                    SCORE_BUBBLE_STYLES['low'].container,
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreLegendBubbleText,
                      SCORE_BUBBLE_STYLES['low'].text,
                    ]}
                  >
                    0–7
                  </Text>
                </View>
                <Text style={styles.scoreLegendLabel}>Lower complexity</Text>
              </View>
              <View style={styles.scoreLegendRow}>
                <View
                  style={[
                    styles.scoreLegendBubble,
                    SCORE_BUBBLE_STYLES['medium'].container,
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreLegendBubbleText,
                      SCORE_BUBBLE_STYLES['medium'].text,
                    ]}
                  >
                    8–14
                  </Text>
                </View>
                <Text style={styles.scoreLegendLabel}>Medium complexity</Text>
              </View>
              <View style={styles.scoreLegendRow}>
                <View
                  style={[
                    styles.scoreLegendBubble,
                    SCORE_BUBBLE_STYLES['high'].container,
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreLegendBubbleText,
                      SCORE_BUBBLE_STYLES['high'].text,
                    ]}
                  >
                    15+
                  </Text>
                </View>
                <Text style={styles.scoreLegendLabel}>High complexity</Text>
              </View>
            </View>
          </View>

          {/* LEGEND */}
          <View style={styles.legendWrap}>
            <View style={styles.legendHeaderRow}>
              <Text style={styles.legendTitle}>How to use these ratings</Text>
              <TouchableOpacity
                onPress={() => setLegendCollapsed(prev => !prev)}
                style={styles.legendToggle}
                activeOpacity={0.85}
              >
                <Text style={styles.legendToggleText}>
                  {legendCollapsed ? 'Show detail' : 'Hide detail'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legendHint}>
              Set each rating using 1–3. A higher number means more support is
              required in that area.
            </Text>

            {!legendCollapsed && (
              <>
                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Behaviours:</Text>
                  <Text style={styles.legendText}>
                    Frequency and intensity of behaviours of concern, and level
                    of proactive / responsive support needed.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Personal care:</Text>
                  <Text style={styles.legendText}>
                    Assistance required for toileting, showering, dressing,
                    continence, and hygiene.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Communication:</Text>
                  <Text style={styles.legendText}>
                    How much adaptation is needed (visuals, gestures, AAC,
                    simplified language, repetition).
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Sensory:</Text>
                  <Text style={styles.legendText}>
                    Sensory sensitivities, seeking behaviours, and environmental
                    adjustments needed.
                  </Text>
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendLabel}>Social:</Text>
                  <Text style={styles.legendText}>
                    Support needed to engage safely with peers, manage
                    boundaries, and participate in group activities.
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
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name={addCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={20}
                  color="#4b3a62"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.addHint}>
              Name, colour (blue/pink) and gender are required.
            </Text>

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
                  You can add the detailed profile and PDF link after saving.
                </Text>
              </View>
            )}
          </View>

          {/* PARTICIPANTS LIST */}
          <View style={styles.listWrap}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderLabel}>Participant</Text>
              <Text style={styles.listHeaderLabelRight}>Score</Text>
            </View>

            {participants.map(p => {
              const totalScore = getTotalScore(p);
              const band = getRiskBand(totalScore);
              const bandStyles = SCORE_BUBBLE_STYLES[band];

              const isExpanded = expandedId === p.id;

              return (
                <View key={p.id} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <TouchableOpacity
                      onPress={() =>
                        setExpandedId(prev => (prev === p.id ? null : p.id))
                      }
                      style={styles.rowHeaderMain}
                      activeOpacity={0.85}
                    >
                      <View style={styles.participantInfoBlock}>
                        <View
                          style={[
                            styles.colorBox,
                            {
                              backgroundColor: p.color || '#f973b7',
                            },
                          ]}
                        />
                        <View style={styles.info}>
                          <Text style={styles.name}>
                            {p.name}
                            {p.is_active === false ? ' (inactive)' : ''}
                          </Text>
                          {!!p.support_needs && (
                            <Text style={styles.supportNeeds} numberOfLines={1}>
                              {p.support_needs}
                            </Text>
                          )}
                        </View>
                      </View>

                      {totalScore !== null && (
                        <View
                          style={[
                            styles.scoreBubble,
                            bandStyles.container,
                          ]}
                        >
                          <Text
                            style={[
                              styles.scoreBubbleText,
                              bandStyles.text,
                            ]}
                          >
                            {totalScore}
                          </Text>
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
                            updateParticipant(
                              p.id,
                              'about_intro',
                              text || null,
                            )
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
                            updateParticipant(
                              p.id,
                              'about_likes',
                              text || null,
                            )
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
                            updateParticipant(
                              p.id,
                              'about_dislikes',
                              text || null,
                            )
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
                            updateParticipant(
                              p.id,
                              'about_support',
                              text || null,
                            )
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
                            updateParticipant(
                              p.id,
                              'about_safety',
                              text || null,
                            )
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
                              updateParticipant(
                                p.id,
                                'about_pdf_url',
                                text || null,
                              )
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
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
    position: 'relative',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreLegend: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#facc15',
    maxWidth: 220,
  },
  scoreLegendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854d0e',
    marginBottom: 4,
  },
  scoreLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreLegendBubble: {
    minWidth: 38,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    paddingHorizontal: 8,
  },
  scoreLegendBubbleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreLegendLabel: {
    fontSize: 11,
    color: '#854d0e',
  },

  legendWrap: {
    backgroundColor: '#ffffff',
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
    color: '#4b3a62',
    flex: 1,
  },

  addWrap: {
    backgroundColor: '#ffffff',
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
  addHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  addTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#332244',
  },
  addHint: {
    fontSize: 11,
    color: '#6b5a7d',
    marginTop: 2,
  },
  addBody: {
    marginTop: 10,
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
  addLabel: {
    fontSize: 12,
    color: '#6b5a7d',
    marginBottom: 4,
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
  listHeaderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#553a75',
  },
  listHeaderLabelRight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#553a75',
    textAlign: 'right',
    width: 80,
  },

  row: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#efe3ff',
    backgroundColor: '#fdfbff',
    padding: 10,
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#332244',
  },
  supportNeeds: {
    fontSize: 12,
    color: '#6b5a7d',
  },

  scoreBubble: {
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBubbleText: {
    fontSize: 13,
    fontWeight: '700',
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
    width: 120,
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
    minWidth: 60,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    backgroundColor: '#f4f4f5',
    marginRight: 6,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  pillMinus: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  pillText: {
    fontSize: 11,
    color: '#374151',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pillMinusText: {
    color: '#6b7280',
  },
});

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
