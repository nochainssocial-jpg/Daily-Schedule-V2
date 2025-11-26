// app/edit/index.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  useWindowDimensions,
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
  icon: string;
  color: string;
};

const TILES: TileConfig[] = [
  {
    title: 'The Dream Team (Working at B2)',
    path: '/edit/dream-team',
    icon: 'people-circle-outline',
    color: '#F54FA5', // pink
  },
  {
    title: 'Attending Participants',
    path: '/edit/participants',
    icon: 'people-outline',
    color: '#EC4899', // pink-ish
  },
  {
    title: 'Team Daily Assignments',
    path: '/edit/assignments',
    icon: 'list-outline',
    color: '#6366F1', // indigo
  },
  {
    title: 'Floating Assignments (Front Room, Scotty, Twins)',
    path: '/edit/floating',
    icon: 'shuffle-outline',
    color: '#0EA5E9', // sky blue
  },
  {
    title: 'End of Shift Cleaning Assignments',
    path: '/edit/cleaning',
    icon: 'sparkles-outline',
    color: '#F59E0B', // amber
  },
  {
    title: 'Pickups and Dropoffs with Helpers',
    path: '/edit/pickups-dropoffs',
    icon: 'car-outline',
    color: '#10B981', // emerald
  },
  {
    title: 'End of Shift Checklist',
    path: '/edit/checklist',
    icon: 'checkbox-outline',
    color: '#8B5CF6', // violet
  },
];

export default function EditHubScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  useEffect(() => {
    initScheduleForToday('B2');
  }, []);

  const handlePrint = () => {
    router.push('/print');
  };

  const showWebBranding = Platform.OS === 'web' && !isMobileWeb;

  return (
    <View style={styles.screen}>
      {/* Large washed-out background logo – web only */}
      {showWebBranding && (
        <Image
          source={require('../../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Edit today&apos;s schedule</Text>
          <Text style={styles.subtitle}>
            Tap a category below to review and adjust details captured during the create flow.
          </Text>

          {/* 🔔 Notification banner sits between subtitle and menu items */}
          <ScheduleBanner />

          {/* Main menu tiles */}
          <View style={styles.grid}>
            {TILES.map((tile) => (
              <TouchableOpacity
                key={tile.path}
                style={[styles.tile, { borderLeftColor: tile.color }]}
                onPress={() => router.push(tile.path)}
                activeOpacity={0.9}
              >
                <View style={styles.tileContent}>
                  <Ionicons
                    name={tile.icon as any}
                    size={20}
                    color={tile.color}
                    style={styles.tileIcon}
                  />
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Large print icon at bottom, aligned to right of tiles */}
          {Platform.OS === 'web' && (
            <View style={styles.printFooter}>
              <TouchableOpacity
                onPress={handlePrint}
                activeOpacity={0.85}
                style={styles.printFooterButton}
              >
                <Ionicons
                  name="print-outline"
                  size={42}
                  color="#3c234c"
                  style={styles.printFooterIcon}
                />
                <Text style={styles.printFooterLabel}>Print Schedule</Text>
              </TouchableOpacity>
            </View>
          )}
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
    position: 'relative',
    overflow: 'hidden',
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
  // Large washed-out background logo
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.1,
    left: -600,
    top: 10,
    pointerEvents: 'none',
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
  grid: {
    gap: 12,
    marginTop: 12,
  },
  tile: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5d9f2',
    borderLeftWidth: 4,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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

  printFooter: {
    marginTop: 32,
    width: '100%',
    alignItems: 'flex-end', // ⭐ right-align whole block
  },
  
  printFooterButton: {
    alignItems: 'center',  // ⭐ center icon directly above label
    justifyContent: 'center',
    marginRight: 4,        // matches tile right padding visually
  },
  
  printFooterIcon: {
    marginBottom: 6,
  },
  
  printFooterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3c234c',
    textAlign: 'center',   // ⭐ center label under icon
  },
});
