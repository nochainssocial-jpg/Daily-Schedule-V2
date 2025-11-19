// app/edit/index.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Footer from '@/components/Footer';
import ScheduleBanner from '@/components/ScheduleBanner';
import { initScheduleForToday } from '@/hooks/schedule-store';

const TILES = [
  { title: 'The Dream Team (Working at B2)', path: '/edit/dream-team' },
  { title: 'Attending Participants', path: '/edit/participants' },
  { title: 'Team Daily Assignments', path: '/edit/assignments' },
  { title: 'Floating Assignments (Front Room, Scotty, Twins)', path: '/edit/floating' },
  { title: 'End of Shift Cleaning Assignments', path: '/edit/cleaning' },
  { title: 'Pickups and Dropoffs with Helpers', path: '/edit/pickups-dropoffs' },
  { title: 'End of Shift Checklist', path: '/edit/checklist' },
] as const;

const MAX_WIDTH = 880;

export default function EditHubScreen() {
  useEffect(() => {
    initScheduleForToday('B2');
  }, []);

  const handlePrint = () => {
    router.push('/print');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Edit today&apos;s schedule</Text>
          <Text style={styles.subtitle}>
            Tap a category below to review and adjust details captured during the create flow.
          </Text>

          <ScheduleBanner />

          {Platform.OS === 'web' && (
            <View style={styles.printRow}>
              <TouchableOpacity
                onPress={handlePrint}
                activeOpacity={0.85}
                style={styles.printButton}
              >
                <Text style={styles.printLabel}>Print loaded schedule</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.grid}>
            {TILES.map((tile) => (
              <TouchableOpacity
                key={tile.path}
                style={styles.tile}
                onPress={() => router.push(tile.path)}
                activeOpacity={0.85}
              >
                <Text style={styles.tileTitle}>{tile.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
  },
  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingBottom: 160,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    color: '#332244',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 12,
    color: '#5a486b',
  },
  printRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  printButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F54FA5',
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: '#FFE5F4',
  },
  printLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F54FA5',
  },
  grid: {
    gap: 12,
  },
  tile: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5d9f2',
    backgroundColor: '#fff',
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3c234c',
  },
});
