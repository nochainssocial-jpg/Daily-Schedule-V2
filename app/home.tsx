// app/home.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { ROUTES } from '@/constants/ROUTES';
import Footer from '@/components/Footer';

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Daily Schedule</Text>

          <Text style={styles.subtitle}>
            Build today&apos;s dream team, plan who&apos;s attending, and fine-tune the day from the Edit Hub.
          </Text>

          {/* ⭐ Inserted Start Screen Block ⭐ */}
          <View style={styles.startContainer}>
            <Image
              source={require('../assets/images/app-start.png')}
              style={styles.startImage}
              resizeMode="contain"
            />

            <Text style={styles.startTitle}>Welcome to Daily Schedule</Text>
            <Text style={styles.startSubtitle}>
              Create today&apos;s schedule and share it with your team.
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/create-schedule')}
              style={styles.startButton}
              activeOpacity={0.9}
            >
              <Text style={styles.startButtonLabel}>Let&apos;s get started</Text>
            </TouchableOpacity>
          </View>
          {/* ⭐ End Inserted Block ⭐ */}

          {/* Center the two main action buttons */}
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
            <Text style={styles.step}>1. Select your Dream Team (who is working at B2).</Text>
            <Text style={styles.step}>2. Mark which participants are attending today.</Text>
            <Text style={styles.step}>3. Choose who completes the End of Shift Checklist.</Text>
            <Text style={styles.step}>4. Use the Edit Hub to refine assignments, floating, cleaning, and transport.</Text>
          </View>

        </View>
      </ScrollView>

      <Footer />
    </View>
  );
}

const MAX_WIDTH = 880;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
  },
  scroll: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
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
    marginBottom: 32,
    color: '#4c3b5c',
    textAlign: 'center',
  },

  /* ⭐ NEW START BLOCK STYLES ⭐ */
  startContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  startImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    color: '#2c1e3f',
    textAlign: 'center',
  },
  startSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#FF6FB3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  startButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  /* Buttons Row */
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  primaryButton: {
    backgroundColor: '#e91e63',
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
    borderColor: '#e91e63',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  secondaryLabel: {
    color: '#e91e63',
    fontWeight: '500',
    fontSize: 14,
  },

  /* ⭐ Updated Quick Start Guide ⭐ */
  guide: {
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',   // light blue
    borderWidth: 1,
    borderColor: '#b6d4f0',
  },
  guideTitle: {
    fontSize: 18,                 // +20%
    fontWeight: '700',
    marginBottom: 10,
    color: '#1e3c64',
  },
  step: {
    fontSize: 16,                 // +20%
    marginBottom: 6,
    color: '#2a446e',
  },
});
