// components/SaveExit.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import { useIsAdmin } from '@/hooks/access-control';
import { useNotifications } from '@/hooks/notifications';
import type { ScheduleSnapshot, OutingGroup } from '@/hooks/schedule-store';
import { saveScheduleToSupabase } from '@/lib/saveSchedule';

type SaveExitProps = {
  onSave?: () => void;
  // Kept broad because older screens use several touchKey labels.
  touchKey?: string;
};

const MAX_WIDTH = 880;

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

export default function SaveExit({ onSave }: SaveExitProps) {
  const isAdmin = useIsAdmin();
  const { push } = useNotifications();

  const schedule = useSchedule();

  const handleCancel = () => {
    router.back();
  };

  const handleSaveExit = async () => {
    if (!isAdmin) {
      push(
        'B2 read-only mode: Save & Exit is disabled on this device',
        'general',
      );
      return;
    }

    onSave?.();

    const outingGroups = normaliseOutingsForSave(schedule);

    const snapshot = {
      staff: schedule.staff,
      participants: schedule.participants,
      workingStaff: schedule.workingStaff,
      attendingParticipants: schedule.attendingParticipants,

      trainingStaffToday: schedule.trainingStaffToday,

      assignments: schedule.assignments,
      floatingAssignments: schedule.floatingAssignments,
      cleaningAssignments: schedule.cleaningAssignments,
      cleaningBinsVariant: schedule.cleaningBinsVariant ?? 0,

      finalChecklist: (schedule as any).finalChecklist,
      finalChecklistStaff: (schedule as any).finalChecklistStaff,

      pickupParticipants: (schedule as any).pickupParticipants,
      helperStaff: schedule.helperStaff,
      helperPickupStaff: (schedule as any).helperPickupStaff || [],

      dropoffAssignments: schedule.dropoffAssignments,
      dropoffLocations: schedule.dropoffLocations || {},

      // Primary two-outing model.
      outingGroups,

      // Legacy compatibility for any older screens or saved schedule readers.
      outingGroup: outingGroups[0] ?? null,

      date: schedule.date,
      meta: schedule.meta ?? {},
    } as ScheduleSnapshot;

    try {
      await saveScheduleToSupabase('B2', snapshot);
    } catch (error) {
      console.error('Save & Exit: failed to save schedule to Supabase', error);
    }

    router.back();
  };

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: MAX_WIDTH,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <TouchableOpacity
          onPress={handleCancel}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#F54927',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Text style={{ color: '#4B5563', fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSaveExit}
          disabled={!isAdmin}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: '#10B981',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Save & Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
