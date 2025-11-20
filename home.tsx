// app/home.tsx (status bar directly between heading and hero)
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import WelcomeHero from '@/components/WelcomeHero';
import { COLORS } from '@/components/theme';
import StickyScheduleStatus from '@/components/StickyScheduleStatus';

function formatDate(d = new Date()) {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Home() {
  const { width } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && width < 768;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen
        options={{
          title: 'Home',
          headerShadowVisible: false,
        }}
      />

      {/* Web‑only background branding */}
      {Platform.OS === 'web' && !isMobileWeb && (
        <>
          <Image
            source={require('../assets/images/nochains-bg.png')}
            style={styles.bgLogo}
          />
          <Image
            source={require('../assets/images/nochains-round.png')}
            style={styles.roundLogo}
          />
        </>
      )}

      {/* Hero (contains heading + image) */}
      <WelcomeHero />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20 }}>
        {/* Status bar under the page heading area */}
        <View
          style={{
            width: '100%',
            maxWidth: 980,
            alignSelf: 'center',
            paddingHorizontal: 20,
            marginTop: 12,
            marginBottom: 4,
          }}
        >
          <StickyScheduleStatus />
        </View>

        {/* Date + Actions */}
        <View
          style={{
            width: '100%',
            maxWidth: 980,
            alignSelf: 'center',
            paddingHorizontal: 20,
            marginTop: 16,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: COLORS.text,
                marginBottom: 4,
              }}
            >
              Daily Schedule
            </Text>
            <Text style={{ color: COLORS.subtext }}>{formatDate()}</Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <TouchableOpacity
              onPress={() => router.push('/create-schedule')}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: COLORS.primary,
                borderRadius: 999,
                alignItems: 'center',
              }}
              activeOpacity={0.9}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>
                Create Daily Schedule
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/edit')}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 999,
                alignItems: 'center',
              }}
              activeOpacity={0.9}
            >
              <Text style={{ color: COLORS.text, fontWeight: '800' }}>
                Edit Today’s Schedule
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Start box (unchanged colours) */}
          <View
            style={{
              backgroundColor: '#E8F0FE',
              borderWidth: 1,
              borderColor: '#90A4D4',
              borderRadius: 12,
              padding: 14,
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            <Text
              style={{ fontWeight: '700', marginBottom: 6, color: COLORS.text }}
            >
              Quick Start Guide:
            </Text>
            <View style={{ gap: 9 }}>
              <Text>Click “Create Daily Schedule” to start.</Text>
              <Text>1.)  Select your Dream Team for today!</Text>
              <Text>2.)  Select participants attending Day Program Today.</Text>
              <Text>3.)  Assign all attending participants to your Dream Team!</Text>
              <Text>4.)  Confirm auto-assignment for floaters and cleaning duties.</Text>
              <Text>
                5.)  Select who is the last man/woman standing to complete the end
                of shift checklist.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgLogo: {
    position: 'absolute',
    width: 900,
    height: 900,
    left: -140,
    bottom: -220,
    opacity: 0.06,
    pointerEvents: 'none',
  },
  roundLogo: {
    position: 'absolute',
    width: 130,
    height: 130,
    top: 40,
    right: 40,
    opacity: 0.9,
    pointerEvents: 'none',
  },
});
