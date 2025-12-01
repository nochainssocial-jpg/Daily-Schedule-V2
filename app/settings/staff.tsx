import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { ChevronDown } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';


const MAX_WIDTH = 880;

export default function StaffSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);

  // Fetch staff from Supabase
  async function loadStaff() {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setStaff(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  // Update a field for a staff member
  async function updateStaff(id, field, value) {
    const { error } = await supabase
      .from('staff')
      .update({ [field]: value })
      .eq('id', id);

    if (!error) {
      // Update local state
      setStaff(prev =>
        prev.map(s => (s.id === id ? { ...s, [field]: value } : s))
      );
    }
  }

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.heading}>Staff Settings</Text>
          <Text style={styles.subHeading}>
            Edit experience, behaviour capability, and reliability.  
            These values feed into the future assignment automation.
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#c084fc" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.listWrap}>
              {staff.map(s => (
                <View key={s.id} style={styles.row}>
                  {/* Color Indicator */}
                  <View style={[styles.colorBox, { backgroundColor: s.color || '#ccc' }]} />

                  {/* Name + Phone */}
                  <View style={styles.info}>
                    <Text style={styles.name}>{s.name}</Text>
                    <Text style={styles.phone}>{s.phone || ''}</Text>
                  </View>

                  {/* Experience selector */}
                  <View style={styles.dropdown}>
                    <Text style={styles.label}>Exp</Text>
                    <Picker
                      selectedValue={s.experience_level}
                      onValueChange={v => updateStaff(s.id, 'experience_level', v)}
                    >
                      {experienceLevels.map(o => (
                        <Picker.Item key={o.label} label={o.label} value={o.value} />
                      ))}
                    </Picker>
                  </View>

                  {/* Behaviour selector */}
                  <View style={styles.dropdown}>
                    <Text style={styles.label}>Behav</Text>
                    <Picker
                      selectedValue={s.behaviour_capability}
                      onValueChange={v => updateStaff(s.id, 'behaviour_capability', v)}
                    >
                      {behaviourOptions.map(o => (
                        <Picker.Item key={o.label} label={o.label} value={o.value} />
                      ))}
                    </Picker>
                  </View>

                  {/* Reliability selector */}
                  <View style={styles.dropdown}>
                    <Text style={styles.label}>Reliab</Text>
                    <Picker
                      selectedValue={s.reliability_rating}
                      onValueChange={v => updateStaff(s.id, 'reliability_rating', v)}
                    >
                      {reliabilityOptions.map(o => (
                        <Picker.Item key={o.label} label={o.label} value={o.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <Footer />
    </View>
  );
}

/// ----------------------
/// STYLES
/// ----------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
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
    marginBottom: 6,
  },
  subHeading: {
    fontSize: 14,
    color: '#553a75',
    marginBottom: 20,
  },
  listWrap: {
    width: '100%',
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e7dff2',
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
    width: 110,
    marginHorizontal: 6,
  },
  label: {
    fontSize: 12,
    color: '#6d5a80',
    marginBottom: 2,
  },
});
