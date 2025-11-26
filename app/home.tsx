// app/home.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ROUTES } from '@/constants/ROUTES';
import Footer from '@/components/Footer';
import ScheduleBanner from '@/components/ScheduleBanner';
import { initScheduleForToday } from '@/hooks/schedule-store';

const MAX_WIDTH = 880;

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);


  useEffect(() => {
    // For now, hard-coded to B2
    initScheduleForToday('B2');
  }, []);

  const showWebBranding = Platform.OS === 'web' && !isMobileWeb;

  return (
    <View style={styles.screen}>
      {/* Large washed-out background logo – web only */}
      {showWebBranding && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      {/* Round logo in top-right – web only */}
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

          {/* Banner showing loaded/created schedule status */}
          <ScheduleBanner />

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

          {/* Quick Start Guide Updated */}
          <View style={styles.guide}>
            <Text style={styles.guideTitle}>Quick Start Guide</Text>
            <Text style={styles.step}>
              1.)  Select your Dream Team (who is working at B2).
            </Text>
            <Text style={styles.step}>
              2.)  Mark which participants are attending today.
            </Text>
            <Text style={styles.step}>
              3.)  Assign attending participants to your team.
            </Text>
            <Text style={styles.step}>
              4.)  Assign participants to your drop-off team.
            </Text>
            <Text style={styles.step}>
              5.)  Choose who completes the End of Shift Checklist.
            </Text>
            <Text style={styles.step}>
              6.)  Floating and end of shift cleaning assignments
              will be automated by the app.
            </Text>
            <Text style={styles.step}>
              7.)  Use the Edit Hub to refine assignments, floating, cleaning, and
              transport.
            </Text>
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
  // Round logo in top-right corner
  cornerLogo: {
    position: 'absolute',
    width: 140,
    height: 140,
    top: 40,
    right: 100,      // ~100px from right edge
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
    marginBottom: 24,
    color: '#4c3b5c',
    textAlign: 'center',
  },
  startContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  startImage: {
    width: 160,
    height: 160,
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
  guide: {
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#b6d4f0',
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#1e3c64',
    textAlign: 'center',
  },
  step: {
    fontSize: 16,
    marginBottom: 10,
    color: '#2a446e',
  },
  greeting: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#332244',
    textAlign: 'center',
  },
});
