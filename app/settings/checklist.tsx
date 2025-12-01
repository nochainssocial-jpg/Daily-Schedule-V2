import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';

const MAX_WIDTH = 880;

type ChecklistRow = {
  id: string;
  name: string;
};

export default function ChecklistSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistRow[]>([]);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});

  const showWebBranding = Platform.OS === 'web';

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase
      .from('final_checklist_items')
      .select('*')
      .order('id', { ascending: true });

    if (data) {
      const rows = data as ChecklistRow[];
      setItems(rows);
      const initial: Record<string, string> = {};
      rows.forEach(row => {
        initial[row.id] = row.name ?? '';
      });
      setEditedNames(initial);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function saveItemName(id: string) {
    const newName = editedNames[id];
    const original = items.find(i => i.id === id)?.name ?? '';
    if (newName === original) return;

    await supabase
      .from('final_checklist_items')
      .update({ name: newName })
      .eq('id', id);

    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, name: newName } : i)),
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
          <Text style={styles.heading}>End of Shift Checklist Settings</Text>
          <Text style={styles.subHeading}>
            Edit the final checklist items staff complete before closing the
            house. These feed directly into the end-of-shift checklist tracker.
          </Text>

          {/* Legend */}
          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>Legend</Text>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Items:</Text>
              <Text style={styles.legendText}>
                Each row is a single checklist item. Updating the text here will
                change what staff see on the end-of-shift checklist.
              </Text>
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Order:</Text>
              <Text style={styles.legendText}>
                Items appear in this order in the checklist. We can add
                drag-and-drop ordering later if needed.
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
