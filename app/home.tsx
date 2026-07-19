// app/home.tsx
import React, { useEffect } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';

import Footer from '@/components/Footer';
import LocationScheduleStatusBanner from '@/components/LocationScheduleStatusBanner';
import {
  DEFAULT_LOCATION_ID,
  HOME_SCHEDULE_LOCATIONS,
} from '@/constants/location';
import { ROUTES } from '@/constants/ROUTES';
import { initScheduleForToday } from '@/hooks/schedule-store';

const MAX_WIDTH = 880;

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();

  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' &&
      /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  useEffect(() => {
    void initScheduleForToday(DEFAULT_LOCATION_ID).catch((error) => {
      console.error('initScheduleForToday failed (home):', error);
    });
  }, []);

  const showWebBranding = Platform.OS === 'web' && !isMobileWeb;

  return (
    <View style={styles.screen}>
      {showWebBranding && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      {showWebBranding && (
        <Image
          source={require('../assets/images/IheartNDIS.png')}
          style={styles.leftBrandLogo}
          resizeMode="contain"
        />
      )}

      {showWebBranding && (
        <Image
          source={require('../assets/images/nochains-round.png')}
          style={styles.cornerLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Daily Schedule</Text>

          <Text style={styles.subtitle}>
            Build today&apos;s dream team, plan who&apos;s attending, and
            fine-tune the day from the Edit Hub.
          </Text>

          <View style={styles.statusStack}>
            {HOME_SCHEDULE_LOCATIONS.map((location) => (
              <LocationScheduleStatusBanner
                key={location.id}
                locationId={location.id}
                locationName={location.name}
              />
            ))}
          </View>

          <View style={styles.startContainer}>
            <Image
              source={require('../assets/images/app-start.png')}
              style={styles.startImage}
              resizeMode="contain"
            />
            <Text style={styles.greeting}>Good morning Dalida! 👋</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(ROUTES.SHARE)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryLabel}>Admin Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(ROUTES.CREATE)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryLabel}>Create Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(ROUTES.EDIT)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryLabel}>Go to Edit Hub</Text>
            </TouchableOpacity>
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
    position: 'relative',
    overflow: 'hidden',
  },
  scroll: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 120,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.1,
    left: -600,
    top: 10,
    pointerEvents: 'none',
  },
  cornerLogo: {
    position: 'absolute',
    width: 140,
    height: 140,
    top: 40,
    right: 100,
    opacity: 0.95,
    pointerEvents: 'none',
  },
  leftBrandLogo: {
    position: 'absolute',
    width: 140,
    height: 140,
    top: 40,
    left: 100,
    opacity: 0.95,
    pointerEvents: 'none',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#332244',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.75,
    marginBottom: 20,
    color: '#4c3b5c',
    textAlign: 'center',
  },
  statusStack: {
    gap: 10,
    marginBottom: 34,
  },
  startContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  startImage: {
    width: 160,
    height: 160,
  },
  greeting: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#332244',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#F54FA5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#F54FA5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  secondaryLabel: {
    color: '#F54FA5',
    fontWeight: '500',
    fontSize: 14,
  },
});
