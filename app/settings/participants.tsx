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
  behaviour_profile?: string | null;
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

  const complexityOptions: Option<number | null>[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Low support', short: 'Low', value: 1 },
    { label: 'Medium support', short: 'Med', value: 2 },
    { label: 'High support', short: 'High', value: 3 },
    { label: 'Very high / complex', short: 'Comp', value: 4 },
  ];

  const behaviourOptions: Option<string | null>[] = [
    { label: 'Not set', short: '-', value: null },
    { label: 'Behavioural', short: 'Behav', value: 'behavioural' },
    { label: 'High anxiety', short: 'Anx', value: 'high_anxiety' },
    { label: 'Routine sensitive', short: 'Rout', value: 'routine_sensitive' },
    { label: 'Sensory / noise', short: 'Sens', value: 'sensory' },
    { label: 'Physical support', short: 'Phys', value: 'physical_support' },
  ];

  function renderPills<T>(
    id: string,
    field: keyof ParticipantRow,
    currentValue: T | null | undefined,
    options: Option<T | null>[],
  ) {
    return (
      <View style={styles.pillRow}>
        {options.map(opt => {
          const isSelected =
            (currentValue === null || currentValue === undefined)
              ? opt.value === null
              : currentValue === opt.value;

          return (
            <TouchableOpacity
              key={`${field}-${id}-${opt.short}`}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => updateParticipant(id, field, opt.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.pillText, isSelected && styles.pillTextActive]}
              >
                {opt.short}
              </Text>
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

            <View className="legend-row" style={styles.legendRow}>
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
                (Rout), Sensory/noise (Sens), Physical support (Phys)
              </Text>
            </View>
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
                    {/* Name */}
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
                      {renderPills(
                        p.id,
                        'complexity_level',
                        p.complexity_level,
                        complexityOptions,
                      )}
                    </View>

                    {/* Behaviour */}
                    <View style={[styles.fieldBlock, { flex: 1 }]}>
                      {renderPills(
                        p.id,
                        'behaviour_profile',
                        p.behaviour_profile,
                        behaviourOptions,
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
  },
  rowInactive: {
    opacity: 0.5,
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
    backgroundColor: '#f973b7', // fixed brand colour for participants
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
});
