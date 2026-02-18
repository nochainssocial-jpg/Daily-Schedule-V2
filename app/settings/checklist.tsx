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
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

  // Add-new state
  const [newName, setNewName] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  // Edit-on-pencil state
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingName, setEditingName] = useState('');

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

  async function addItem() {
    const name = newName.trim();
    if (!name) return;

    setSavingNew(true);
    const { data, error } = await supabase
      .from('final_checklist_items')
      .insert({ name })
      .select()
      .single();

    setSavingNew(false);

    if (!error && data) {
      setItems(prev => [...prev, data as ChecklistRow]);
      setNewName('');
    }
  }

  function startEdit(item: ChecklistRow) {
    setEditingId(item.id);
    setEditingName(item.name ?? '');
  }

  async function saveEdit() {
    if (editingId === null) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    await supabase
      .from('final_checklist_items')
      .update({ name: trimmed })
      .eq('id', editingId);

    setItems(prev =>
      prev.map(i => (i.id === editingId ? { ...i, name: trimmed } : i)),
    );
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  function confirmDeleteItem(item: ChecklistRow) {
    const doDelete = async () => {
      const { error } = await supabase.from('final_checklist_items').delete().eq('id', item.id);
      if (error) {
        Alert.alert('Delete failed', error.message || 'Unable to delete this checklist item.');
        return;
      }
      setItems(prev => prev.filter(i => i.id !== item.id));
    };

    const title = 'Remove checklist item';
    const message = `Remove "${item.name}" from the final checklist? This action cannot be undone.`;

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      const ok = typeof confirm === 'function' ? confirm(message) : true;
      if (ok) void doDelete();
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
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
            Manage the final checklist that staff complete before closing the house.
          </Text>

          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>How this works</Text>
            <Text style={styles.legendText}>
              These items appear in the end-of-shift checklist screen and any weekly
              reports. Tap the pencil to edit wording, or the red X to remove an item.
            </Text>
          </View>

          {/* Add new checklist item */}
          <View style={styles.addWrap}>
            <Text style={styles.addTitle}>Add new checklist item</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Checklist item"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor="#b8a8d6"
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!newName.trim() || savingNew) && styles.addButtonDisabled,
                ]}
                onPress={addItem}
                disabled={!newName.trim() || savingNew}
                activeOpacity={0.85}
              >
                <Text style={styles.addButtonText}>
                  {savingNew ? 'Saving…' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addHint}>
              Add any extra checks the MD wants completed before staff leave.
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
                <Text style={[styles.headerCell, { flex: 1 }]}>Checklist item</Text>
              </View>

              {items.map(item => {
                const isEditing = editingId === item.id;

                return (
                  <View key={item.id} style={styles.row}>
                    {/* Left: delete + pencil */}
                      <View style={styles.actionsColumn}>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => confirmDeleteItem(item)}
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
                          onPress={() => startEdit(item)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons
                            name="pencil"
                            size={20}
                            color="#22c55e"
                          />
                        </TouchableOpacity>
                      </View>

                    {/* Right: text or editor */}
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
                        <Text style={styles.itemText}>{item.name}</Text>
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
    flexDirection: 'row',      // make icons sit side by side
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 8,
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 6,
  },
  editButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 8,
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
      <MaterialCommunityIcons
        name="clipboard-check-outline"
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
        Final Checklist
      </Text>
    </View>
  ),
};
