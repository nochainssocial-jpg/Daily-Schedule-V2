// app/edit/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, useWindowDimensions, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import StickyScheduleStatus from '@/components/StickyScheduleStatus';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0';

const TILES = [
  { title: 'The Dream Team',          path: '/edit/dream-team',       color: '#FDE68A' },
  { title: 'Participants Attending',  path: '/edit/participants',     color: '#BBF7D0' },
  { title: 'Assignments',             path: '/edit/assignments',      color: '#BFDBFE' },
  { title: 'Floating Assignments',    path: '/edit/floating',         color: '#FCA5A5' },
  { title: 'Cleaning Duties',         path: '/edit/cleaning',         color: '#FBCFE8' },
  { title: 'Pickups & Dropoffs',      path: '/edit/pickups-dropoffs', color: '#F5D0FE' },
  { title: 'Final Checklist',         path: '/edit/lastToLeave',      color: '#E9D5FF' },
] as const;

export default function EditMenuScreen() {
  const { width } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && width < 768;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
      <Stack.Screen
        options={{
          title: 'Schedule Edit Hub',
          headerShadowVisible: false,
        }}
      />

      {/* Web‑only background branding */}
      {Platform.OS === 'web' && !isMobileWeb && (
        <Image
          source={require('../../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
        />
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header row with version + subheading block (moved down 20px) */}
        <View style={{ width: '100%', alignSelf: 'center', maxWidth: 1100, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a' }}>Edit Menu</Text>
            <Text style={{ fontSize: 14, color: '#64748b' }}>{APP_VERSION}</Text>
          </View>

          {/* Blue info box (same as home quick start) */}
          <View
            style={{
              backgroundColor: '#E8F0FE',
              borderWidth: 1,
              borderColor: '#90A4D4',
              borderRadius: 12,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 6, color: '#0f172a' }}>Edit Hub</Text>
            <Text style={{ color: '#0f172a', lineHeight: 22 }}>
              Manage every aspect of your daily schedule from here (EDIT HUB). You can adjust all components and make changes at any time.{'
'}
              Please make sure to save your changes when you’re happy with the daily schedule.{'
'}
              If you have made changes by error you can also exit the edit screen to cancel your changes.
            </Text>
          </View>
        </View>

        {/* Tiles */}
        <View style={styles.grid}>
          {TILES.map(t => (
            <TouchableOpacity
              key={t.title}
              onPress={() => router.push(t.path)}
              activeOpacity={0.9}
              style={[styles.tile, { backgroundColor: t.color }]}
            >
              <Text style={styles.tileTitle}>{t.title}</Text>
              <Text style={styles.tilePath}>{t.path}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status bar under tiles */}
        <View style={{ marginTop: 12 }}>
          <StickyScheduleStatus />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 16, maxWidth: 1100, alignSelf: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  tile: {
    flexBasis: '30%', minWidth: 280, maxWidth: 340, height: 120,
    borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16,
    justifyContent: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
  },
  tileTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  tilePath: { marginTop: 6, fontSize: 12, color: '#475569' },
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
