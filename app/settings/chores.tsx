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

type ChoreRow = {
  id: string;
  name: string;
};

export default function ChoresSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [chores, setChores] = useState<ChoreRow[]>([]);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});

  const showWebBranding = Platform.OS === 'web';

  async function loadChores() {
    setLoading(true);
    const { data } = await supabase
      .from('cleaning_chores')
      .select('*')
      .order('id', { ascending: true });

    if (data) {
      const rows = data as ChoreRow[];
      setChores(rows);
      const initial: Record<string, string> = {};
      rows.forEach(row => {
        initial[row.id] = row.name ?? '';
      });
      setEditedNames(initial);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadChores();
  }, []);

  async function saveChoreName(id: string) {
    const newName = editedNames[id];
    const original = chores.find(c => c.id === id)?.name ?? '';
    if (newName === original) return;

    await supabase
      .from('cleaning_chores')
      .update({ name: newName })
      .eq('id', id);

    setChores(prev =>
      prev.map(c => (c.id === id ? { ...c, name: newName } : c)),
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
          <Text style={styles.heading}>Cleaning Tasks / Chores Settings</Text>
          <Text style={styles.subHeading}>
            Edit the master list of end-of-shift cleaning tasks. These are used
            in the cleaning assignment tracker and daily reports.
          </Text>

          {/* Legend */}
          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>Legend</Text>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Tasks:</Text>
              <Text style={styles.legendText}>
                Each row represents a cleaning task. Editing the text here will
                update what staff see in the cleaning assignments and reports.
              </Text>
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Order:</Text>
              <Text style={styles.legendText}>
                Tasks are shown in the order of their ID. We can add re-ordering
                controls later if needed.
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#c084fc"
              style={{ marginTop: 40 }}
            />
          ) : (
            <View style={styles.listWrap}>
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { width: 54 }]}>#</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Cleaning task</Text>
              </View>

              {chores.map((c, index) => (
                <View key={c.id} style={styles.row}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                  </View>

                  <View style={styles.fieldBlock}>
                    <TextInput
                      style={styles.input}
                      value={editedNames[c.id] ?? ''}
                      onChangeText={text =>
                        setEditedNames(prev => ({ ...prev, [c.id]: text }))
                      }
                      onBlur={() => saveChoreName(c.id)}
                      multiline
                    />
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
    width: 70,
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
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7dff2',
    marginBottom: 10,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f6f1ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  indexText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#553a75',
  },
  fieldBlock: {
    flex: 1,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d7c7f0',
    backgroundColor: '#f8f4ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#332244',
    minHeight: 38,
  },
});
