// app/settings.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store.tsx';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const s = useSchedule();
  const { width } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && width < 768;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FB', paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Settings' }} />

      {/* Web‑only background branding */}
      {Platform.OS === 'web' && !isMobileWeb && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
        />
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.h1}>Settings</Text>
          <Text style={styles.p}>Counts below are read-only and safe to render. Replace with your full settings UI as needed.</Text>
          <View style={styles.kpis}>
            <Text style={styles.kpi}>Staff: {s.staff?.length ?? 0}</Text>
            <Text style={styles.kpi}>Participants: {s.participants?.length ?? 0}</Text>
            <Text style={styles.kpi}>Working Staff: {s.workingStaff?.length ?? 0}</Text>
            <Text style={styles.kpi}>Attending Participants: {s.attendingParticipants?.length ?? 0}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, maxWidth: 1100, alignSelf: 'center' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16 },
  h1: { fontSize: 20, fontWeight: '800', marginBottom: 6, color: '#0f172a' },
  p: { color: '#475569', marginBottom: 12 },
  kpis: { gap: 6 },
  kpi: { color: '#0f172a' },
  bgLogo: {
    position: 'absolute',
    width: 900,
    height: 900,
    left: -140,
    bottom: -220,
    opacity: 0.06,
    pointerEvents: 'none',
  },
});
