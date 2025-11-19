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
import { Ionicons } from '@expo/vector-icons';
import Footer from '@/components/Footer';
import ScheduleBanner from '@/components/ScheduleBanner';
import { initScheduleForToday } from '@/hooks/schedule-store';

const MAX_WIDTH = 880;

type TileConfig = {
  title: string;
  path: string;
  icon: string; // we'll cast to Ionicons name
};

const TILES: TileConfig[] = [
  {
    title: 'The Dream Team (Working at B2)',
    path: '/edit/dream-team',
    icon: 'people-circle-outline',
  },
  {
    title: 'Attending Participants',
    path: '/edit/participants',
    icon: 'people-outline',
  },
  {
    title: 'Team Daily Assignments',
    path: '/edit/assignments',
    icon: 'list-outline',
  },
  {
    title: 'Floating Assignments (Front Room, Scotty, Twins)',
    path: '/edit/floating',
    icon: 'shuffle-outline',
  },
  {
    title: 'End of Shift Cleaning Assignments',
    path: '/edit/cleaning',
    icon: 'construct-outline',
  },
  {
    title: 'Pickups and Dropoffs with Helpers',
    path: '/edit/pickups-dropoffs',
    icon: 'bus-outline',
  },
  {
    title: 'End of Shift Checklist',
    path: '/edit/checklist',
    icon: 'clipboard-outline',
  },
];

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
                <Ionicons
                  name="print-outline"
                  size={18}
                  color="#F54FA5"
                  style={styles.printIcon}
                />
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
                <View style={styles.tileContent}>
                  <Ionicons
                    name={tile.icon as any}
                    size={20}
                    color="#F54FA5"
                    style={styles.tileIcon}
                  />
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F54FA5',
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: '#FFE5F4',
  },
  printIcon: {
    marginRight: 8,
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
  tileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileIcon: {
    marginRight: 10,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3c234c',
    flexShrink: 1,
  },
});
