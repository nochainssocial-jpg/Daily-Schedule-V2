// components/SaveExit.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import type { ScheduleSnapshot } from '@/hooks/schedule-store';
import { saveScheduleToSupabase } from '@/lib/saveSchedule';

type SaveExitProps = {
  onSave?: () => void;
  // Kept for compatibility with previous version
  touchKey:
    | 'dreamTeam'
    | 'participants'
    | 'assignments'
    | 'floating'
    | 'cleaning'
    | 'final'
    | 'transport';
};

const MAX_WIDTH = 880;

export default function SaveExit({ onSave }: SaveExitProps) {
  const schedule = useSchedule();

  const handleCancel = () => {
    router.back();
  };

  const handleSaveExit = async () => {
    onSave?.();

    const snapshot: ScheduleSnapshot = {
      staff: schedule.staff,
      participants: schedule.participants,
      workingStaff: schedule.workingStaff,
      attendingParticipants: schedule.attendingParticipants,
      assignments: schedule.assignments,
      floatingAssignments: schedule.floatingAssignments,
      cleaningAssignments: schedule.cleaningAssignments,
      finalChecklist: schedule.finalChecklist,
      finalChecklistStaff: schedule.finalChecklistStaff,
      pickupParticipants: schedule.pickupParticipants,
      helperStaff: schedule.helperStaff,
      dropoffAssignments: schedule.dropoffAssignments,
      dropoffLocations: schedule.dropoffLocations || {},
      outingGroup: schedule.outingGroup ?? null,
      date: schedule.date,
      meta: schedule.meta ?? {},
    };

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
      {/* Centered 880px band with buttons at each end */}
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
            borderColor: '#D1D5DB',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Text style={{ color: '#4B5563', fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSaveExit}
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
