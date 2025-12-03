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
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

  // Add-new state
  const [newName, setNewName] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  // Edit-on-pencil state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const showWebBranding = Platform.OS === 'web';

  async function loadChores() {
    setLoading(true);
    const { data } = await supabase
      .from('cleaning_chores')
      .select('*')
      .order('id', { ascending: true });

    if (data) {
      setChores(data as ChoreRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadChores();
  }, []);

  async function addChore() {
    const name = newName.trim();
    if (!name) return;

    setSavingNew(true);
    const { data, error } = await supabase
      .from('cleaning_chores')
      .insert({ name })
      .select()
      .single();

    setSavingNew(false);

    if (!error && data) {
      setChores(prev => [...prev, data as ChoreRow]);
      setNewName('');
    }
  }

  function startEdit(chore: ChoreRow) {
    setEditingId(chore.id);
    setEditingName(chore.name ?? '');
  }

  async function saveEdit() {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      // If they wipe it completely, just don't save (or you could enforce delete).
      setEditingId(null);
      return;
    }

    await supabase
      .from('cleaning_chores')
      .update({ name: trimmed })
      .eq('id', editingId);

    setChores(prev =>
      prev.map(c => (c.id === editingId ? { ...c, name: trimmed } : c)),
    );
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  function confirmDeleteChore(chore: ChoreRow) {
    Alert.alert(
      'Remove cleaning task',
      `Remove "${chore.name}" from the cleaning list? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('cleaning_chores').delete().eq('id', chore.id);
            setChores(prev => prev.filter(c => c.id !== chore.id));
          },
        },
      ],
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
            Manage the master list of end-of-shift cleaning tasks used in the cleaning assignment tracker and daily reports.
          </Text>

          {/* Legend */}
          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>Legend</Text>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Tasks:</Text>
              <Text style={styles.legendText}>
                Each row represents a cleaning task. Tap the pencil to edit the wording, or the red X to remove a task completely.
              </Text>
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendLabel}>Order:</Text>
              <Text style={styles.legendText}>
                Tasks are shown in the order of their ID. We can add re-ordering controls later if needed.
              </Text>
            </View>
          </View>

          {/* Add new task */}
          <View style={styles.addWrap}>
            <Text style={styles.addTitle}>Add new cleaning task</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Task name"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor="#b8a8d6"
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!newName.trim() || savingNew) && styles.addButtonDisabled,
                ]}
                onPress={addChore}
                disabled={!newName.trim() || savingNew}
                activeOpacity={0.85}
              >
                <Text style={styles.addButtonText}>
                  {savingNew ? 'Saving…' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addHint}>
              Add tasks that should appear in cleaning assignments and reports.
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
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { width: 60 }]}>Actions</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Cleaning task</Text>
              </View>

              {chores.map(chore => {
                const isEditing = editingId === chore.id;

                return (
                  <View key={chore.id} style={styles.row}>
                    {/* Left: delete + pencil */}
                    <View style={styles.actionsColumn}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => confirmDeleteChore(chore)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={20}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => startEdit(chore)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons
                          name="pencil"
                          size={20}
                          color="#22c55e"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Right: task text (or editor) */}
                    <View style={styles.itemBlock}>
                      {isEditing ? (
                        <>
                          <TextInput
                            style={styles.editInput}
                            value={editingName}
                            onChangeText={setEditingName}
                            autoFocus
                            multiline
                            onBlur={saveEdit}
                          />
                          <View style={styles.editButtonsRow}>
                            <TouchableOpacity
                              style={styles.smallButton}
                              onPress={saveEdit}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.smallButtonText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.smallButton, styles.smallButtonSecondary]}
                              onPress={cancelEdit}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.smallButtonSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.itemText}>{chore.name}</Text>
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

  /* Add new */
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

  actionsColumn: {
    flexDirection: 'row',      // NEW – horizontal
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 8,
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 6,            // space between bin and pencil
  },
  editButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 8,            // space between pencil and text
  },
  editButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  editButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
  },

  itemBlock: {
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    color: '#332244',
  },

  editInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d7c7f0',
    backgroundColor: '#f8f4ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#332244',
    marginTop: 4,
  },
  editButtonsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  smallButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  smallButtonSecondary: {
    backgroundColor: '#e5e7eb',
  },
  smallButtonSecondaryText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
});

const PINK = '#FF8FC5';

export const options = {
  headerTitleAlign: 'center' as const,
  headerTitle: () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialCommunityIcons name="broom" size={18} color={PINK} />
      <Text
        style={{
          marginLeft: 6,
          fontSize: 16,
          fontWeight: '700',
          color: PINK,
        }}
      >
        Cleaning Tasks / Chores
      </Text>
    </View>
  ),
};
