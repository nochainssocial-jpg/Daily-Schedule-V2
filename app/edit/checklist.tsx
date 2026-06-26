// CHECKLIST.TSX — STAFF CHECKBOX AUTO-SAVE PATCH
// --------------------------------------------------

import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import type { ScheduleSnapshot, OutingGroup } from '@/hooks/schedule-store';
import { masterStaff as STATIC_STAFF } from '@/constants/data';
import Chip from '@/components/Chip';
import Checkbox from '@/components/Checkbox';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';
import { saveScheduleToSupabase } from '@/lib/saveSchedule';

type ID = string;
type ChecklistSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const MAX_WIDTH = 880;
const HOUSE_ID = 'B2';

function hasOutingContent(outing: OutingGroup | null | undefined): outing is OutingGroup {
  if (!outing) return false;

  return Boolean(
    (outing.name || '').trim() ||
      (outing.startTime || '').trim() ||
      (outing.endTime || '').trim() ||
      ((outing as any).notes || '').trim?.() ||
      (outing.staffIds?.length ?? 0) > 0 ||
      (outing.participantIds?.length ?? 0) > 0,
  );
}

function normaliseOutingsForSave(schedule: any): OutingGroup[] {
  const rawOutings = Array.isArray(schedule.outingGroups)
    ? schedule.outingGroups
    : schedule.outingGroup
      ? [schedule.outingGroup]
      : [];

  return rawOutings
    .slice(0, 2)
    .map((outing: any, index: number) => ({
      id: String(outing?.id || `outing-${index + 1}`),
      name: String(outing?.name || ''),
      staffIds: Array.isArray(outing?.staffIds) ? outing.staffIds.map(String) : [],
      participantIds: Array.isArray(outing?.participantIds)
        ? outing.participantIds.map(String)
        : [],
      startTime: outing?.startTime ? String(outing.startTime) : '',
      endTime: outing?.endTime ? String(outing.endTime) : '',
      notes: outing?.notes ? String(outing.notes) : '',
    }))
    .filter(hasOutingContent);
}

function buildSnapshotForSave(schedule: any): ScheduleSnapshot {
  const outingGroups = normaliseOutingsForSave(schedule);

  return {
    staff: schedule.staff || [],
    participants: schedule.participants || [],
    workingStaff: schedule.workingStaff || [],
    attendingParticipants: schedule.attendingParticipants || [],

    trainingStaffToday: schedule.trainingStaffToday || [],

    assignments: schedule.assignments || {},
    floatingAssignments: schedule.floatingAssignments || {
      frontRoom: null,
      scotty: null,
      twins: null,
    },
    cleaningAssignments: schedule.cleaningAssignments || {},
    cleaningBinsVariant: schedule.cleaningBinsVariant ?? 0,

    finalChecklist: schedule.finalChecklist || {},
    finalChecklistStaff: schedule.finalChecklistStaff ?? null,

    pickupParticipants: schedule.pickupParticipants || [],
    helperStaff: schedule.helperStaff || [],
    helperPickupStaff: schedule.helperPickupStaff || [],

    dropoffAssignments: schedule.dropoffAssignments || {},
    dropoffLocations: schedule.dropoffLocations || {},

    outingGroups,
    outingGroup: outingGroups[0] ?? null,

    date: schedule.date,
    meta: schedule.meta ?? {},
  } as ScheduleSnapshot;
}

export default function EditChecklistScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

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
      const snapshot = buildSnapshotForSave({
        ...latestScheduleState,
        finalChecklist: nextChecklist,
      });

      const result = await saveScheduleToSupabase(HOUSE_ID, snapshot);

      if (!result?.ok) {
        throw result?.error || new Error('Checklist save failed');
      }

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
