// app/edit/checklist.tsx
import React, { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { DEFAULT_CHECKLIST, STAFF as STATIC_STAFF } from '@/constants/data';
import Chip from '@/components/Chip';
import Checkbox from '@/components/Checkbox';
import { useNotifications } from '@/hooks/notifications';

type ID = string;

export default function EditChecklistScreen() {
  const {
    staff: scheduleStaff,
    workingStaff,
    finalChecklist,
    finalChecklistStaff,
    updateSchedule,
  } = useSchedule();
  const { push } = useNotifications();


  // Prefer staff from the schedule (after create), fallback to static constants
  const staff = (scheduleStaff && scheduleStaff.length ? scheduleStaff : STATIC_STAFF) as typeof STATIC_STAFF;

  // Last-to-leave options: Dream Team if available, otherwise all staff
  const staffPool = useMemo(
    () => (workingStaff && workingStaff.length ? staff.filter(s => workingStaff.includes(s.id)) : staff),
    [staff, workingStaff],
  );

  const selectedStaff = staffPool.find((s) => s.id === finalChecklistStaff) || null;

  const handleSelectStaff = (id: ID) => {
    updateSchedule({ finalChecklistStaff: id });
    push('Final checklist staff updated', 'checklist');
  };

  const handleToggleItem = (itemId: ID | number) => {
    const key = String(itemId);
    const next = { ...(finalChecklist || {}) };
    next[key] = !next[key];
    updateSchedule({ finalChecklist: next });
    push('Final checklist updated', 'checklist');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>End of Shift Checklist</Text>
          <Text style={styles.subtitle}>
            Tick each item as it&apos;s completed and confirm who is last to leave and responsible for closing tasks.
          </Text>

          {/* Last-to-leave selector */}
          <Text style={styles.sectionTitle}>Who is last to leave?</Text>
          {staffPool.length === 0 ? (
            <Text style={styles.helperText}>
              No staff available. Create a schedule and select working staff so you can assign the checklist
              to someone.
            </Text>
          ) : (
            <View style={styles.chipRow}>
              {staffPool.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={finalChecklistStaff === s.id}
                  onPress={() => handleSelectStaff(s.id)}
                  style={styles.staffChip}
                />
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Last to leave</Text>
          <View style={styles.chipRow}>
            {selectedStaff ? (
              <Chip label={selectedStaff.name} selected />
            ) : (
              <Text style={styles.helperText}>Not yet selected</Text>
            )}
          </View>

          {/* Checklist items */}
<Text style={[styles.sectionTitle, { marginTop: 20 }]}>Checklist items</Text>
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
      </ScrollView>
    </View>
  );
}

const MAX_WIDTH = 880;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
  },
  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
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
  currentStaff: {
    fontSize: 13,
    color: '#5a486b',
    marginTop: 4,
  },
  currentStaffName: {
    fontWeight: '600',
    color: '#3c234c',
  },
  itemRow: {
    paddingVertical: 4,
  },
});