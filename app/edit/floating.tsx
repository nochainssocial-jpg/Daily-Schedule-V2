// app/floating.tsx (or wherever it lives)
import React from 'react';
import { View, Text } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';

export default function FloatingDebugScreen() {
  const schedule = useSchedule();

  console.log('Floating debug schedule:', schedule);

  return (
    <View style={{ padding: 20 }}>
      <Text>Floating debug screen</Text>
    </View>
  );
}
