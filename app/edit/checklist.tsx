// CHECKLIST.TSX — FULLY PATCHED VERSION
// --------------------------------------------------

import React, { useMemo } from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSchedule } from '@/hooks/schedule-store';
import { DEFAULT_CHECKLIST, STAFF as STATIC_STAFF } from '@/constants/data';
import Chip from '@/components/Chip';
import Checkbox from '@/components/Checkbox';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';

type ID = string;

const MAX_WIDTH = 880;

export default function EditChecklistScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const {
    staff: scheduleStaff,
    workingStaff,
    finalChecklist,
    finalChecklistStaff,
    updateSchedule,
  } = useSchedule();
  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  // Prefer schedule staff, fallback to static
  const staff = (scheduleStaff && scheduleStaff.length
    ? scheduleStaff
    : STATIC_STAFF) as typeof STATIC_STAFF;

  // Dream Team (if present) or all staff
  const staffPool = useMemo(
    () =>
      workingStaff && workingStaff.length
        ? staff.filter((s) => workingStaff.includes(s.id))
        : staff,
    [staff, workingStaff],
  );

  const selectedStaff =
    staffPool.find((s) => s.id === finalChecklistStaff) || null;

  const blockReadOnly = () =>
    push('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');

  const handleSelectStaff = (id: ID) => {
    if (readOnly) return blockReadOnly();
    updateSchedule({ finalChecklistStaff: id });
    push('Final checklist staff updated', 'checklist');
  };

  const handleToggleItem = (itemId: ID | number) => {
    // Checkboxes ALWAYS allowed
    const key = String(itemId);
    const next = { ...(finalChecklist || {}) };
    next[key] = !next[key];

    updateSchedule({ finalChecklist: next });
    push('Final checklist updated', 'checklist');
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="checklist" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.inner}>
            <Text style={styles.title}>End of Shift Checklist</Text>
            <Text style={styles.subtitle}>
              Tick each item as it&apos;s completed and confirm who is last to
              leave and responsible for closing tasks.
            </Text>

            {/* STAFF SELECTOR */}
            <Text style={styles.sectionTitle}>Who is last to leave?</Text>

            {staffPool.length === 0 ? (
              <Text style={styles.helperText}>
                No staff available. Create a schedule and select working staff so
                someone can be assigned.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {staffPool.map((s) => {
                  const isSelected = finalChecklistStaff === s.id;
                  return (
                    <Chip
                      key={s.id}
                      label={s.name}
                      mode={isSelected ? 'offsite' : 'default'}
                      onPress={() => handleSelectStaff(s.id)}
                      style={styles.staffChip}
                    />
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>Last to leave</Text>
            <View style={styles.chipRow}>
              {selectedStaff ? (
                <Chip
                  label={selectedStaff.name}
                  selected
                  mode="onsite"
                />
              ) : (
                <Text style={styles.helperText}>Not yet selected</Text>
              )}
            </View>

            {/* CHECKLIST */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Checklist items
            </Text>

            {DEFAULT_CHECKLIST.map((item) => {
              const key = String(item.id);
              const checked = !!finalChecklist?.[key];
              const label = (item as any).name || (item as any).label || '';

              return (
                <View key={key} style={styles.itemRow}>
                  <Checkbox
                    label={label}
                    checked={checked}
                    onToggle={() => handleToggleItem(item.id)}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E0E7FF',
  },
  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inner: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    color: '#332244',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 16,
    color: '#5a486b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#3c234c',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  staffChip: {
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    opacity: 0.8,
    color: '#7a688c',
    marginBottom: 8,
  },
  itemRow: {
    paddingVertical: 4,
  },
});
