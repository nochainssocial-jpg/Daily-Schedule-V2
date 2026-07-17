// CHECKLIST.TSX — STAFF CHECKBOX AUTO-SAVE PATCH
// --------------------------------------------------

import { DEFAULT_LOCATION_ID } from '@/constants/location';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { masterStaff as STATIC_STAFF } from '@/constants/data';
import Chip from '@/components/Chip';
import Checkbox from '@/components/Checkbox';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';
import { patchScheduleById } from '@/lib/saveSchedule';
import { getSydneyDateKey } from '@/lib/sydneyDate';

type ID = string;
type ChecklistSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const MAX_WIDTH = 880;
const HOUSE_ID = DEFAULT_LOCATION_ID;

export default function EditChecklistScreen() {

  const schedule = useSchedule();
  const {
    staff: scheduleStaff,
    workingStaff,
    finalChecklist,
    finalChecklistStaff,
    updateSchedule,
    checklistItems,
  } = schedule;

  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;
  const [checklistSaveStatus, setChecklistSaveStatus] =
    useState<ChecklistSaveStatus>('idle');

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

  const saveChecklistImmediately = async (nextChecklist: Record<string, boolean>) => {
    setChecklistSaveStatus('saving');

    try {
      const latestScheduleState = useSchedule.getState();
      const todayKey = getSydneyDateKey();

      if (
        latestScheduleState.todayScheduleStatus !== 'ready' ||
        !latestScheduleState.activeScheduleId ||
        latestScheduleState.activeScheduleDate !== todayKey
      ) {
        throw new Error("Today's schedule is not loaded");
      }

      const result = await patchScheduleById({
        scheduleId: latestScheduleState.activeScheduleId,
        house: latestScheduleState.activeScheduleHouse || HOUSE_ID,
        scheduleDate: todayKey,
        patch: { finalChecklist: nextChecklist },
      });

      if (!result.ok) throw result.error || new Error('Checklist save failed');

      latestScheduleState.setActiveScheduleRecord(result.data);
      setChecklistSaveStatus('saved');
    } catch (error) {
      console.error('Checklist auto-save failed:', error);
      setChecklistSaveStatus('error');
      push('Checklist could not be saved. Please try again.', 'checklist');
    }
  };

  const handleSelectStaff = (id: ID) => {
    if (readOnly) return blockReadOnly();
    updateSchedule({ finalChecklistStaff: id });
    push('Final checklist staff updated', 'checklist');
  };

  const handleToggleItem = (itemId: ID | number) => {
    // Staff are allowed to tick/untick checklist items even when Save & Exit is admin-only.
    const key = String(itemId);
    const next = { ...(finalChecklist || {}) };
    next[key] = !next[key];

    // Immediate local update so the UI responds instantly.
    updateSchedule({ finalChecklist: next });

    // Independent persistence path. This prevents checklist changes being lost
    // when a staff user closes/reopens the schedule without admin Save & Exit.
    void saveChecklistImmediately(next);
  };

  const saveStatusText =
    checklistSaveStatus === 'saving'
      ? 'Saving checklist…'
      : checklistSaveStatus === 'saved'
        ? 'Checklist saved automatically.'
        : checklistSaveStatus === 'error'
          ? 'Checklist save failed. Try ticking the item again.'
          : 'Checklist ticks save automatically — no Save & Exit required.';

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
            <Text
              style={[
                styles.saveStatus,
                checklistSaveStatus === 'error' ? styles.saveStatusError : null,
              ]}
            >
              {saveStatusText}
            </Text>

            {/* masterStaff SELECTOR */}
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
                <Chip label={selectedStaff.name} selected mode="onsite" />
              ) : (
                <Text style={styles.helperText}>Not yet selected</Text>
              )}
            </View>

            {/* CHECKLIST */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Checklist items</Text>

            {checklistItems.map((item) => {
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
    marginBottom: 8,
    color: '#5a486b',
  },
  saveStatus: {
    fontSize: 12,
    color: '#166534',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 16,
  },
  saveStatusError: {
    color: '#991B1B',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
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
