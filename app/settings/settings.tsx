// app/settings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';
import {
  STAFF,
  PARTICIPANTS,
  DEFAULT_CHORES,
  DEFAULT_CHECKLIST,
} from '@/constants/data';
import Footer from '@/components/Footer';

type SettingsSection = 'staff' | 'participants' | 'chores' | 'checklist';

const MAX_WIDTH = 880;

export default function SettingsScreen() {
  const {
    staff,
    participants,
    chores,
    checklist,
    saveStaff,
    saveParticipants,
    saveChores,
    saveChecklist,
  } = useSchedule();

  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>('staff');
  const [newItemText, setNewItemText] = useState('');

  const showWebBranding = Platform.OS === 'web';

  // ---------- helpers ----------------------------------------------------

  const getSectionLabel = () => {
    switch (activeSection) {
      case 'staff':
        return 'Staff';
      case 'participants':
        return 'Participants';
      case 'chores':
        return 'Chores';
      case 'checklist':
        return 'Final List';
      default:
        return 'Items';
    }
  };

  // Use store values when present, otherwise fall back to data.ts
  const getCurrentData = () => {
    switch (activeSection) {
      case 'staff':
        return staff && staff.length > 0 ? staff : STAFF;
      case 'participants':
        return participants && participants.length > 0
          ? participants
          : PARTICIPANTS;
      case 'chores':
        return chores && chores.length > 0 ? chores : DEFAULT_CHORES;
      case 'checklist':
        return checklist && checklist.length > 0
          ? checklist
          : DEFAULT_CHECKLIST;
      default:
        return [];
    }
  };

  // May return undefined if the store doesn’t expose a save function yet
  const getSaveFunction = () => {
    switch (activeSection) {
      case 'staff':
        return saveStaff;
      case 'participants':
        return saveParticipants;
      case 'chores':
        return saveChores;
      case 'checklist':
        return saveChecklist;
      default:
        return undefined;
    }
  };

  const actuallyDelete = (itemId: string) => {
    const currentData = getCurrentData();
    const updated = currentData.filter((item: any) => item.id !== itemId);
    const saveFn = getSaveFunction();
    if (typeof saveFn === 'function') {
      saveFn(updated);
    }
  };

  const confirmDelete = (item: any) => {
    const sectionLabel = getSectionLabel();
    const name = item?.name ?? '';

    Alert.alert(
      'Confirm delete',
      `You are about to delete '${name}' from '${sectionLabel}' do you wish to continue 'Yes' to proceed and 'No' to cancel.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => actuallyDelete(item.id),
        },
      ],
    );
  };

  const handleAddNew = () => {
    if (!newItemText.trim()) return;

    const currentData = getCurrentData();
    const maxId =
      currentData.length > 0
        ? Math.max(
            ...currentData.map(
              (item: any) => parseInt(item.id, 10) || 0,
            ),
          )
        : 0;

    const newId = String(maxId + 1);

    let newItem: any = {
      id: newId,
      name: newItemText.trim(),
    };

    // Give staff a colour for tiles
    if (activeSection === 'staff') {
      const colors = [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#96CEB4',
        '#FFEAA7',
      ];
      newItem.color =
        colors[Math.floor(Math.random() * colors.length)];
    }

    const updated = [...currentData, newItem];
    const saveFn = getSaveFunction();
    if (typeof saveFn === 'function') {
      saveFn(updated);
    }

    setNewItemText('');
  };

  // ---------- render pieces ---------------------------------------------

  const renderSectionButtons = () => (
    <View style={styles.sectionButtons}>
      {[
        { key: 'staff', label: 'Staff' },
        { key: 'participants', label: 'Participants' },
        { key: 'chores', label: 'Chores' },
        { key: 'checklist', label: 'Final List' },
      ].map(section => (
        <TouchableOpacity
          key={section.key}
          style={[
            styles.sectionButton,
            activeSection === section.key &&
              styles.activeSectionButton,
          ]}
          onPress={() =>
            setActiveSection(section.key as SettingsSection)
          }
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.sectionButtonText,
              activeSection === section.key &&
                styles.activeSectionButtonText,
            ]}
          >
            {section.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItems = () => {
    const data = getCurrentData();

    if (!data || data.length === 0) {
      return (
        <Text style={styles.emptyHint}>
          No items found in {getSectionLabel()}.
        </Text>
      );
    }

    return (
      <View style={styles.itemsGrid}>
        {data.map((item: any) => (
          <View key={item.id} style={styles.tile}>
            <View style={styles.tileContent}>
              {activeSection === 'staff' && (
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: item.color || '#E5ECF5' },
                  ]}
                />
              )}
              <Text style={styles.tileText}>{item.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              style={styles.deleteIconWrap}
              activeOpacity={0.8}
            >
              <X size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderAddNew = () => (
    <View style={styles.addNewSection}>
      <TextInput
        style={styles.newItemInput}
        placeholder={`Add new ${getSectionLabel().toLowerCase()}...`}
        value={newItemText}
        onChangeText={setNewItemText}
        multiline={
          activeSection === 'chores' ||
          activeSection === 'checklist'
        }
        numberOfLines={
          activeSection === 'chores' ||
          activeSection === 'checklist'
            ? 3
            : 1
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddNew}
        activeOpacity={0.9}
      >
        <Plus size={20} color="white" />
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  // ---------- render screen ---------------------------------------------

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Large washed-out background logo – web only */}
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
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Manage your lists and preferences
            </Text>
          </View>

          {renderSectionButtons()}
          {renderAddNew()}
          {renderItems()}
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
  scroll: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 160,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  // Large washed-out background logo
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.1,
    left: -600,
    top: 10,
    pointerEvents: 'none',
  },
  header: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#332244',
  },
  subtitle: {
    fontSize: 14,
    color: '#4c3b5c',
    marginTop: 4,
  },
  sectionButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  sectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginRight: 4,
    backgroundColor: '#d5c7e5',
  },
  activeSectionButton: {
    backgroundColor: '#f472b6',
  },
  sectionButtonText: {
    fontSize: 13,
    color: '#332244',
    fontWeight: '600',
  },
  activeSectionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  itemsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tile: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5deef',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  tileText: {
    fontSize: 14,
    color: '#332244',
    flexShrink: 1,
  },
  deleteIconWrap: {
    padding: 4,
    marginLeft: 8,
  },
  addNewSection: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5deef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  newItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5deef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f4fb',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#f472b6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#7a6a8a',
  },
});
