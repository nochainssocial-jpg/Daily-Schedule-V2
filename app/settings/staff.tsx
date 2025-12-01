import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
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

export default function StaffSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  const showWebBranding = Platform.OS === 'web';

  // Fetch staff from Supabase
  async function loadStaff() {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setStaff(data as StaffRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  // Update a single field for a staff member
  async function updateStaff(id: string, field: keyof StaffRow, value: any) {
    const { error } = await supabase
      .from('staff')
      .update({ [field]: value })
      .eq('id', id);

    if (!error) {
      setStaff(prev =>
        prev.map(s => (s.id === id ? { ...s, [field]: value } : s)),
      );
    }
  }

  // 3-level experience scale
  const experienceLevels = [
    { label: '—', value: null },
    { label: '1 - Beginner', value: 1 },
    { label: '2 - Intermediate', value: 2 },
    { label: '3 - Senior', value: 3 },
  ];

  const behaviourOptions = [
    { label: '—', value: null },
    { label: '1 - Low', value: 1 },
    { label: '2 - Medium', value: 2 },
    { label: '3 - High', value: 3 },
  ];

  const reliabilityOptions = [
    { label: '—', value: null },
    { label: '1 - Inconsistent', value: 1 },
    { label: '2 - Moderate', value: 2 },
    { label: '3 - Consistent', value: 3 },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Large washed-out logo for web, like other screens */}
      {showWebBranding && (
        <Image
          source={require('../../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.heading}>Staff Settings</Text>
            <Text style={styles.subHeading}>
              Edit experience, behaviour capability, and reliability. These
              values will support future automated daily assignments.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#c084fc"
              style={{ marginTop: 40 }}
            />
          ) : (
            <View style={styles.listWrap}>
              {staff.map(s => {
                const inactive = s.is_active === false;

                return (
                  <View
                    key={s.id}
                    style={[
                      styles.row,
                      inactive && styles.rowInactive,
                    ]}
                  >
                    {/* Colour indicator */}
                    <View
                      style={[
                        styles.colorBox,
                        { backgroundColor: s.color || '#d4c4e8' },
                      ]}
                    />

                    {/* Name + phone */}
                    <View style={styles.info}>
                      <Text style={styles.name}>
                        {s.name}
                        {inactive ? ' (inactive)' : ''}
                      </Text>
                      {!!s.phone && (
                        <Text style={styles.phone}>{s.phone}</Text>
                      )}
                    </View>

                    {/* Experience */}
                    <View style={styles.dropdown}>
                      <Text style={styles.label}>Exp</Text>
                      <Picker
                        selectedValue={
                          s.experience_level === null ||
                          s.experience_level === undefined
                            ? null
                            : s.experience_level
                        }
                        onValueChange={value =>
                          updateStaff(s.id, 'experience_level', value)
                        }
                        style={styles.picker}
                        dropdownIconColor="#4b2e83"
                      >
                        {experienceLevels.map(opt => (
                          <Picker.Item
                            key={opt.label}
                            label={opt.label}
                            value={opt.value}
                          />
                        ))}
                      </Picker>
                    </View>

                    {/* Behaviour capability */}
                    <View style={styles.dropdown}>
                      <Text style={styles.label}>Behav</Text>
                      <Picker
                        selectedValue={
                          s.behaviour_capability === null ||
                          s.behaviour_capability === undefined
                            ? null
                            : s.behaviour_capability
                        }
                        onValueChange={value =>
                          updateStaff(s.id, 'behaviour_capability', value)
                        }
                        style={styles.picker}
                        dropdownIconColor="#4b2e83"
                      >
                        {behaviourOptions.map(opt => (
                          <Picker.Item
                            key={opt.label}
                            label={opt.label}
                            value={opt.value}
                          />
                        ))}
                      </Picker>
                    </View>

                    {/* Reliability */}
                    <View style={styles.dropdown}>
                      <Text style={styles.label}>Reliab</Text>
                      <Picker
                        selectedValue={
                          s.reliability_rating === null ||
                          s.reliability_rating === undefined
                            ? null
                            : s.reliability_rating
                        }
                        onValueChange={value =>
                          updateStaff(s.id, 'reliability_rating', value)
                        }
                        style={styles.picker}
                        dropdownIconColor="#4b2e83"
                      >
                        {reliabilityOptions.map(opt => (
                          <Picker.Item
                            key={opt.label}
                            label={opt.label}
                            value={opt.value}
                          />
                        ))}
                      </Picker>
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
  header: {
    marginBottom: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#332244',
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 14,
    color: '#553a75',
  },
  listWrap: {
    width: '100%',
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e7dff2',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowInactive: {
    opacity: 0.6,
  },
  colorBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 12,
  },
  info: {
    flex: 1,
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
  dropdown: {
    width: 120,
    marginLeft: 6,
  },
  label: {
    fontSize: 11,
    color: '#6d5a80',
    marginBottom: 2,
  },
  picker: {
    fontSize: 12,
    height: 36,
    backgroundColor: '#f6f1ff',
    borderRadius: 999,
  },
});
