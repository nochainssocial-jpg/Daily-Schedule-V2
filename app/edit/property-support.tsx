import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { DEFAULT_LOCATION_ID } from '@/constants/location';
import { useIsAdmin } from '@/hooks/access-control';
import { useNotifications } from '@/hooks/notifications';
import { initScheduleForToday, useSchedule } from '@/hooks/schedule-store';
import {
  emptyPropertySupportAssignments,
  fetchPropertySupportData,
  restorePropertySupportAssignmentSlots,
  savePropertySupportForDate,
  type PropertyLocation,
  type PropertySupportAssignment,
} from '@/lib/propertySupport';
import { getSydneyDateKey } from '@/lib/sydneyDate';

const MAX_WIDTH = 1275;
const ACTIONS_MAX_WIDTH = 880;
const ACCENT = '#0F9F8F';
const SOFT_TEAL = '#CCFBF1';
const PARTICIPANT_ACCENT = '#7C3AED';
const PROPERTY_SUPPORT_COUNT = 2;
const TOTAL_SUPPORT_COUNT = 4;
const HOUSE_ID = DEFAULT_LOCATION_ID;

function hasAnyContent(assignment: PropertySupportAssignment) {
  return Boolean(
    assignment.propertyLocationId ||
      assignment.staffIds.length > 0 ||
      assignment.notes.trim(),
  );
}

export default function PropertySupportScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 820;
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;
  const { push } = useNotifications();
  const { staff = [], workingStaff = [] } = useSchedule();

  const [locations, setLocations] = useState<PropertyLocation[]>([]);
  const [assignments, setAssignments] = useState<PropertySupportAssignment[]>(
    emptyPropertySupportAssignments(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openLocationCard, setOpenLocationCard] = useState<number | null>(null);

  const todayKey = getSydneyDateKey();

  const availableStaff = useMemo(() => {
    const workingSet = new Set((workingStaff || []).map(String));
    return (staff || [])
      .filter((person: any) => workingSet.has(String(person.id)))
      .filter((person: any) => String(person.name || '').trim().toLowerCase() !== 'everyone')
      .sort((a: any, b: any) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'en-AU'),
      );
  }, [staff, workingStaff]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await initScheduleForToday(HOUSE_ID);
        const result = await fetchPropertySupportData(HOUSE_ID, todayKey);
        if (cancelled) return;

        if (!result.ok) {
          console.error('[property support] failed to load', result.error);
          push('Property Support could not be loaded from Supabase.', 'general');
          return;
        }

        const activeLocations = result.locations.filter((location) => location.isActive);
        setLocations(activeLocations);

        // Rebuild the four permanent card slots from each assignment ID.
        // This prevents a saved Participant Support entry from shifting into a
        // Property Support card when earlier cards are empty.
        const restoredAssignments = restorePropertySupportAssignmentSlots(
          result.record?.assignments || [],
          TOTAL_SUPPORT_COUNT,
        ).map((assignment, index) => {
          if (index < PROPERTY_SUPPORT_COUNT || !assignment.propertyLocationId) {
            return assignment;
          }

          // Compatibility with entries previously stored using a property UUID.
          const previousLocation = activeLocations.find(
            (location) =>
              String(location.id) === String(assignment.propertyLocationId),
          );

          return previousLocation
            ? { ...assignment, propertyLocationId: previousLocation.name }
            : assignment;
        });

        setAssignments(restoredAssignments);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [push, todayKey]);

  const updateAssignment = (
    index: number,
    patch: Partial<PropertySupportAssignment>,
  ) => {
    if (readOnly) return;
    setAssignments((current) =>
      current.map((assignment, assignmentIndex) =>
        assignmentIndex === index ? { ...assignment, ...patch } : assignment,
      ),
    );
  };

  const toggleStaff = (index: number, staffId: string) => {
    const current = assignments[index];
    const selected = new Set(current.staffIds.map(String));
    if (selected.has(staffId)) selected.delete(staffId);
    else selected.add(staffId);
    updateAssignment(index, { staffIds: Array.from(selected) });
  };

  const clearCard = (index: number) => {
    updateAssignment(index, {
      propertyLocationId: '',
      staffIds: [],
      notes: '',
    });
  };

  const handleSave = async () => {
    if (saving || readOnly) return;

    const incompleteIndex = assignments.findIndex(
      (assignment) =>
        hasAnyContent(assignment) &&
        (!assignment.propertyLocationId || assignment.staffIds.length === 0),
    );

    if (incompleteIndex >= 0) {
      const isParticipantSupport = incompleteIndex >= PROPERTY_SUPPORT_COUNT;
      const cardNumber = isParticipantSupport
        ? incompleteIndex - PROPERTY_SUPPORT_COUNT + 1
        : incompleteIndex + 1;

      push(
        isParticipantSupport
          ? `Participant Support ${cardNumber}: enter a property/location and select at least one staff member.`
          : `Property Support ${cardNumber}: select a property and at least one staff member.`,
        'general',
      );
      return;
    }

    setSaving(true);
    try {
      // Re-apply each permanent card ID immediately before saving.
      // The position and ID together guarantee that all four tiles reload
      // into the same individual card.
      const canonicalAssignments = assignments
        .slice(0, TOTAL_SUPPORT_COUNT)
        .map((assignment, index) => ({
          ...assignment,
          id: `property-support-${index + 1}`,
        }));

      const result = await savePropertySupportForDate({
        house: HOUSE_ID,
        supportDate: todayKey,
        assignments: canonicalAssignments,
      });

      if (!result.ok) throw result.error;
      router.back();
    } catch (error) {
      console.error('[property support] failed to save', error);
      push('Support changes could not be saved. Please try again.', 'general');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading support assignments…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.actionBar}>
        <View style={styles.actionBarInner}>
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={saving}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={readOnly || saving}
            style={[
              styles.saveButton,
              (readOnly || saving) && styles.buttonDisabled,
            ]}
          >
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save & Exit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="home-outline" size={28} color="#0F766E" />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.eyebrow}>Edit Hub</Text>
            <Text style={styles.title}>Property & Participant Support</Text>
            <Text style={styles.subtitle}>
              Assign staff to two property support visits and two participant support visits for today.
            </Text>
          </View>
        </View>

        {locations.length === 0 ? (
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={22} color="#0F766E" />
            <Text style={styles.noticeText}>
              No property locations are configured yet. The two Participant Support cards remain available, but Property Support requires active rows in the property_locations table.
            </Text>
          </View>
        ) : null}

        <View style={[styles.cardsGrid, isCompact && styles.cardsGridCompact]}>
          {assignments.map((assignment, index) => {
            const isParticipantSupport = index >= PROPERTY_SUPPORT_COUNT;
            const cardNumber = isParticipantSupport
              ? index - PROPERTY_SUPPORT_COUNT + 1
              : index + 1;
            const selectedLocation = isParticipantSupport
              ? undefined
              : locations.find(
                  (location) => location.id === assignment.propertyLocationId,
                );

            return (
              <View
                key={assignment.id}
                style={[
                  styles.assignmentCard,
                  isParticipantSupport && styles.participantAssignmentCard,
                  isCompact && styles.assignmentCardCompact,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text
                      style={[
                        styles.cardEyebrow,
                        isParticipantSupport && styles.participantCardEyebrow,
                      ]}
                    >
                      {isParticipantSupport ? 'Participant support' : 'Property visit'}
                    </Text>
                    <Text
                      style={[
                        styles.cardTitle,
                        isParticipantSupport && styles.participantCardTitle,
                      ]}
                    >
                      {isParticipantSupport ? 'Participant Support' : 'Property Support'}{' '}
                      {cardNumber}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => clearCard(index)}
                    disabled={readOnly || !hasAnyContent(assignment)}
                    style={[
                      styles.clearButton,
                      (readOnly || !hasAnyContent(assignment)) && styles.buttonDisabled,
                    ]}
                  >
                    <Ionicons name="trash-outline" size={17} color="#B91C1C" />
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>
                  {isParticipantSupport ? 'Property / support location' : 'Property'}
                </Text>
                {isParticipantSupport ? (
                  <TextInput
                    editable={!readOnly}
                    value={assignment.propertyLocationId}
                    onChangeText={(propertyLocationId) =>
                      updateAssignment(index, { propertyLocationId })
                    }
                    placeholder="Enter property or support location…"
                    placeholderTextColor="#94A3B8"
                    style={[
                      styles.locationInput,
                      styles.participantField,
                      readOnly && styles.fieldDisabled,
                    ]}
                    maxLength={120}
                  />
                ) : (
                  <TouchableOpacity
                    disabled={readOnly || locations.length === 0}
                    onPress={() => setOpenLocationCard(index)}
                    style={[
                      styles.dropdown,
                      (readOnly || locations.length === 0) && styles.fieldDisabled,
                    ]}
                  >
                    <Text
                      style={selectedLocation ? styles.dropdownValue : styles.placeholderText}
                      numberOfLines={1}
                    >
                      {selectedLocation?.name || 'Select property location'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#0F766E" />
                  </TouchableOpacity>
                )}

                <Text style={styles.fieldLabel}>Staff attending</Text>
                {availableStaff.length === 0 ? (
                  <Text style={styles.emptyStaffText}>
                    No staff have been selected as working at Day Program today.
                  </Text>
                ) : (
                  <View style={styles.staffGrid}>
                    {availableStaff.map((person: any) => {
                      const staffId = String(person.id);
                      const selected = assignment.staffIds.includes(staffId);
                      return (
                        <Pressable
                          key={staffId}
                          disabled={readOnly}
                          onPress={() => toggleStaff(index, staffId)}
                          style={[
                            styles.staffChip,
                            isParticipantSupport && styles.participantStaffChip,
                            selected &&
                              (isParticipantSupport
                                ? styles.participantStaffChipSelected
                                : styles.staffChipSelected),
                            readOnly && styles.fieldDisabled,
                          ]}
                        >
                          <Ionicons
                            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={
                              selected
                                ? '#FFFFFF'
                                : isParticipantSupport
                                  ? PARTICIPANT_ACCENT
                                  : '#0F766E'
                            }
                          />
                          <Text
                            style={[
                              styles.staffChipText,
                              isParticipantSupport && styles.participantStaffChipText,
                              selected && styles.staffChipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {person.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.fieldLabel}>
                  {isParticipantSupport ? 'Support details' : 'Task details'}
                </Text>
                <TextInput
                  editable={!readOnly}
                  multiline
                  value={assignment.notes}
                  onChangeText={(notes) => updateAssignment(index, { notes })}
                  placeholder={
                    isParticipantSupport
                      ? 'Enter participant support details…'
                      : 'Enter the tasks to be completed at this property…'
                  }
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.notesInput,
                    isParticipantSupport && styles.participantField,
                    readOnly && styles.fieldDisabled,
                  ]}
                  textAlignVertical="top"
                  maxLength={300}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={openLocationCard !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenLocationCard(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Property</Text>
              <TouchableOpacity
                onPress={() => setOpenLocationCard(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#334155" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
            >
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={styles.modalOption}
                  activeOpacity={0.8}
                  onPress={() => {
                    const cardIndex = openLocationCard;
                    if (cardIndex === null) return;

                    updateAssignment(cardIndex, {
                      propertyLocationId: String(location.id),
                    });
                    setOpenLocationCard(null);
                  }}
                >
                  <Ionicons name="home-outline" size={20} color="#0F766E" />
                  <Text style={styles.modalOptionText}>{location.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#475569', fontSize: 15, fontWeight: '700' },
  scrollContent: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: SOFT_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTextBlock: { flex: 1 },
  eyebrow: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { color: '#134E4A', fontSize: 23, fontWeight: '900', marginTop: 1 },
  subtitle: { color: '#475569', fontSize: 12, lineHeight: 17, marginTop: 3 },
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: { flex: 1, color: '#115E59', fontSize: 13, lineHeight: 19 },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardsGridCompact: { flexDirection: 'column' },
  assignmentCard: {
    width: '49.4%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 16,
    padding: 13,
    ...Platform.select({
      web: { boxShadow: '0 8px 22px rgba(15, 118, 110, 0.08)' } as any,
      default: {
        shadowColor: '#0F766E',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      },
    }),
  },
  participantAssignmentCard: {
    backgroundColor: '#FAF7FF',
    borderColor: '#C4B5FD',
    ...Platform.select({
      web: { boxShadow: '0 8px 22px rgba(124, 58, 237, 0.08)' } as any,
      default: { shadowColor: PARTICIPANT_ACCENT },
    }),
  },
  assignmentCardCompact: { width: '100%' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardEyebrow: {
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  participantCardEyebrow: { color: '#6D28D9' },
  cardTitle: { color: '#134E4A', fontSize: 17, fontWeight: '900', marginTop: 1 },
  participantCardTitle: { color: '#5B21B6' },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearButtonText: { color: '#B91C1C', fontSize: 12, fontWeight: '800' },
  fieldLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 4,
  },
  dropdown: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 11,
    backgroundColor: '#F8FFFD',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  locationInput: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: '#4C1D95',
    fontSize: 14,
    fontWeight: '800',
  },
  participantField: {
    borderColor: '#C4B5FD',
    backgroundColor: '#FFFFFF',
  },
  dropdownValue: { flex: 1, color: '#134E4A', fontSize: 14, fontWeight: '800' },
  placeholderText: { flex: 1, color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  staffChip: {
    maxWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  staffChipSelected: { backgroundColor: ACCENT, borderColor: ACCENT },
  participantStaffChip: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  participantStaffChipSelected: {
    backgroundColor: PARTICIPANT_ACCENT,
    borderColor: PARTICIPANT_ACCENT,
  },
  staffChipText: { color: '#115E59', fontSize: 12, fontWeight: '800', flexShrink: 1 },
  participantStaffChipText: { color: '#5B21B6' },
  staffChipTextSelected: { color: '#FFFFFF' },
  emptyStaffText: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
  },
  notesInput: {
    minHeight: 58,
    maxHeight: 64,
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 11,
    backgroundColor: '#F8FFFD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 18,
  },
  fieldDisabled: { opacity: 0.55 },
  buttonDisabled: { opacity: 0.45 },
  actionBar: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionBarInner: {
    maxWidth: ACTIONS_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F54927',
  },
  cancelButtonText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  saveButton: {
    minWidth: 122,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '72%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { color: '#134E4A', fontSize: 18, fontWeight: '900' },
  modalList: { maxHeight: 420 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionText: { color: '#334155', fontSize: 14, fontWeight: '800' },
});
