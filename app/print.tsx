// app/print.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SchedulePrintable from '@/components/SchedulePrintable';

export default function PrintScreen() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // give React a moment to render
      setTimeout(() => {
        window.print();
      }, 400);
    }
  }, []);

  return (
    <View style={styles.screen}>
      <SchedulePrintable />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f0f7',
    alignItems: 'center',
    paddingVertical: 24,
  },
});
