import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import { useIsAdmin } from '@/hooks/access-control';
import { useNotifications } from '@/hooks/notifications';
import {
  buildDailySchedulePatch,
  type DailyScheduleSaveScope,
} from '@/lib/dailyScheduleSnapshot';
import { patchScheduleById } from '@/lib/saveSchedule';
import { saveOutingsForDate } from '@/lib/outings';
import { getSydneyDateKey } from '@/lib/sydneyDate';

type SaveExitProps = {
  onSave?: () => boolean | void | Promise<boolean | void>;
  touchKey?: string;
};

const MAX_WIDTH = 880;
const DEFAULT_HOUSE = 'B2';

function resolveScope(touchKey?: string): DailyScheduleSaveScope | 'outings' | null {
  const key = String(touchKey || '').trim().toLowerCase();
  if (key === 'dreamteam' || key === 'dream team') return 'dreamTeam';
  if (key === 'participants') return 'participants';
  if (key === 'assignments') return 'assignments';
  if (key === 'floating') return 'floating';
  if (key === 'cleaning') return 'cleaning';
  if (key === 'pickups' || key === 'pickups-dropoffs') return 'pickups';
  if (key === 'checklist') return 'checklist';
  if (key.includes('outing') || key.includes('drive')) return 'outings';
  return null;
}

export default function SaveExit({ onSave, touchKey }: SaveExitProps) {
  const isAdmin = useIsAdmin();
  const { push } = useNotifications();
  const schedule = useSchedule();
  const [saving, setSaving] = useState(false);

  const handleCancel = () => {
    if (!saving) router.back();
  };

  const handleSaveExit = async () => {
    if (saving) return;
    if (!isAdmin) {
      push('B2 read-only mode: Save & Exit is disabled on this device', 'general');
      return;
    }

    const canContinue = await onSave?.();
    if (canContinue === false) return;

    const scope = resolveScope(touchKey);
    if (!scope) {
      push('This edit screen is not connected to a recognised save scope.', 'general');
      return;
    }

    const todayKey = getSydneyDateKey();
    setSaving(true);

    try {
      if (scope === 'outings') {
        const result = await saveOutingsForDate({
          house: schedule.activeScheduleHouse || DEFAULT_HOUSE,
          outingDate: todayKey,
          outings: schedule.outingGroups || [],
          autoResetEnabled: schedule.outingAutoResetEnabled !== false,
          lastAutoResetDate: schedule.outingLastAutoResetDate,
        });

        if (!result.ok) throw result.error;
        router.back();
        return;
      }

      if (
        schedule.todayScheduleStatus !== 'ready' ||
        !schedule.activeScheduleId ||
        schedule.activeScheduleDate !== todayKey
      ) {
        push("Today's schedule is not loaded. Changes were not saved.", 'general');
        return;
      }

      const result = await patchScheduleById({
        scheduleId: schedule.activeScheduleId,
        house: schedule.activeScheduleHouse || DEFAULT_HOUSE,
        scheduleDate: todayKey,
        patch: buildDailySchedulePatch(schedule, scope),
      });

      if (!result.ok) {
        const message =
          result.reason === 'conflict'
            ? 'The schedule changed on another device. Reload this screen and try again.'
            : 'Changes could not be saved to Supabase. Please try again.';
        push(message, 'general');
        return;
      }

      schedule.setActiveScheduleRecord(result.data);
      router.back();
    } catch (error) {
      console.error('Save & Exit failed', error);
      push('Changes could not be saved to Supabase. Please try again.', 'general');
    } finally {
      setSaving(false);
    }
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
          disabled={saving}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#F54927',
            backgroundColor: '#FFFFFF',
            opacity: saving ? 0.55 : 1,
          }}
        >
          <Text style={{ color: '#4B5563', fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSaveExit}
          disabled={!isAdmin || saving}
          style={{
            minWidth: 118,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: '#10B981',
            opacity: !isAdmin || saving ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            {saving ? 'Saving…' : 'Save & Exit'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
