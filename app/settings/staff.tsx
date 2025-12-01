enceimport React, { useEffect, useState } from 'react';
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

type StaffRow = {
  id: string;
  name: string;
  phone?: string | null;
  color?: string | null;
  is_active?: boolean | null;
  experience_level?: number | null;
  behaviour_capability?: number | null;
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

          return (
            <TouchableOpacity
              key={`${field}-${staffId}-${opt.short}`}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => updateStaff(staffId, field, opt.value)}
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
          <Text style={styles.heading}>Staff Settings</Text>
          <Text style={styles.subHeading}>
            Set experience, behaviour capability, and reliability for each staff member.
          </Text>

          {/* LEGEND */}
          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>Legend</Text>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Experience:</Text>
              <Text style={styles.legendText}>
                Beginner (Beg), Intermediate (Int), Senior (Sen)
              </Text>
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Behaviour:</Text>
              <Text style={styles.legendText}>
                Behaviour capability — Low, Medium, High
              </Text>
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Reliability:</Text>
              <Text style={styles.legendText}>
                Reliability — Inconsistent (Inc), Moderate (Mod), Consistent (Con)
              </Text>
            </View>
          </View>

          {/* Staff list */}
          {loading ? (
            <ActivityIndicator size="large" color="#c084fc" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.listWrap}>
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { flex: 1.2 }]}>Staff</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Experience</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Behaviour</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Reliability</Text>
              </View>

              {staff.map(s => {
                const inactive = s.is_active === false;

                return (
                  <View key={s.id} style={[styles.row, inactive && styles.rowInactive]}>
                    <View style={[styles.staffInfoBlock, { flex: 1.2 }]}>
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
                        {!!s.phone && <Text style={styles.phone}>{s.phone}</Text>}
                      </View>
                    </View>

                    <View style={[styles.fieldBlock, { flex: 1 }]}>
                      <Text style={styles.label}>Experience</Text>
                      {renderPills(s.id, 'experience_level', s.experience_level, experienceOptions)}
                    </View>

                    <View style={[styles.fieldBlock, { flex: 1 }]}>
                      <Text style={styles.label}>Behaviour</Text>
                      {renderPills(s.id, 'behaviour_capability', s.behaviour_capability, behaviourOptions)}
                    </View>

                    <View style={[styles.fieldBlock, { flex: 1 }]}>
                      <Text style={styles.label}>Reliability</Text>
                      {renderPills(s.id, 'reliability_rating', s.reliability_rating, reliabilityOptions)}
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
    width: 60,
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
  label: {
    fontSize: 11,
    color: '#6d5a80',
    marginBottom: 4,
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
    backgroundColor: '#f472b6',
    borderColor: '#f472b6',
  },
  pillText: {
    fontSize: 11,
    color: '#5b4a76',
  },
  pillTextActive: {
    color: '#ffffff',
  },
});

