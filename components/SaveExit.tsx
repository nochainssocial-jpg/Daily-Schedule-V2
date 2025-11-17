import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';

type SaveExitProps = {
  onSave?: () => void;
  // Kept for compatibility with previous version, even though the current
  // store's `touch` helper does not use this value.
  touchKey: 'dreamTeam' | 'participants' | 'assignments' | 'floating' | 'cleaning' | 'final' | 'transport';
};

/**
 * Save & Exit bar used at the bottom of edit screens.
 *
 * - Cancel: returns to /edit without saving extra changes.
 * - Save & Exit: runs optional onSave callback, triggers schedule `touch`
 *   (for any side‑effects you might add later), then routes back to /edit.
 */
export default function SaveExit({ onSave }: SaveExitProps) {
  const { touch } = useSchedule() as any;

  const handleCancel = () => {
    router.push('/edit');
  };

  const handleSaveExit = () => {
    try {
      onSave?.();
    } catch (e) {
      console.warn('SaveExit onSave error:', e);
    }

    try {
      // Current store defines `touch: () => void`
      touch?.();
    } catch (e) {
      console.warn('SaveExit touch error:', e);
    }

    router.push('/edit');
  };

  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
      <TouchableOpacity
        onPress={handleCancel}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
        }}
      >
        <Text>Cancel</Text>
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
  );
}
