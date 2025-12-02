// app/settings/checklist.tsx
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
  id: string | number;
  name: string | null;
};

export default function ChecklistSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistRow[]>([]);

  const showWebBranding = Platform.OS === 'web';

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase
      .from('final_checklist_items')
      .select('*')
      .order('id', { ascending: true });

    if (data) {
      setItems(data as ChecklistRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function updateItem(id: string | number, name: string) {
    await supabase
      .from('final_checklist_items')
      .update({ name })
      .eq('id', id);

    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, name } : i)),
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
          <Text style={styles.heading}>End of Shift Checklist</Text>
          <Text style={styles.subHeading}>
            Review and fine-tune the final checklist that staff complete before closing the house.
          </Text>

          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>How this works</Text>
            <Text style={styles.legendText}>
              These items appear in the end-of-shift checklist screen and any weekly reports.
              Edit wording to match the MD&apos;s expectations. Changes save automatically when you leave the field.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#c084fc" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.listWrap}>
              {items.map(item => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.bullet}>
                    <Text style={styles.bulletText}>{item.id}</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={item.name ?? ''}
                    onChangeText={text =>
                      setItems(prev =>
                        prev.map(i =>
                          i.id === item.id ? { ...i, name: text } : i,
                        ),
                      )
                    }
                    onBlur={() => {
                      const current = items.find(i => i.id === item.id);
                      updateItem(item.id, current?.name ?? '');
                    }}
                    multiline
                  />
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
  legendText: {
    fontSize: 13,
    color: '#6b5a7d',
  },
  listWrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 10,
  },
  bullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bulletText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#332244',
    paddingVertical: 4,
  },
});
