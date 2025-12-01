// app/settings/index.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Footer from '@/components/Footer';

const MAX_WIDTH = 880;

type CardConfig = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  route: string;
};

const CARDS: CardConfig[] = [
  {
    key: 'staff',
    title: 'Staff',
    description: 'View and manage staff details and classifications.',
    icon: 'people-circle-outline',
    iconBg: '#FDE68A',
    route: '/settings/staff',
  },
  {
    key: 'participants',
    title: 'Participants',
    description: 'Review participant profiles and future complexity flags.',
    icon: 'happy-outline',
    iconBg: '#E0F2FE',
    route: '/settings/participants',
  },
  {
    key: 'chores',
    title: 'Cleaning Tasks / Chores',
    description: 'Configure end-of-shift cleaning tasks for the program.',
    icon: 'sparkles-outline',
    iconBg: '#DCFCE7',
    route: '/settings/chores',
  },
  {
    key: 'checklist',
    title: 'End of Shift Checklist',
    description: 'Maintain the final checklist to safely close the house.',
    icon: 'checkmark-done-circle-outline',
    iconBg: '#F5D0FE',
    route: '/settings/checklist',
  },
];

export default function SettingsIndexScreen() {
  const router = useRouter();
  const showWebBranding = Platform.OS === 'web';

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerShown: true,
        }}
      />

      {showWebBranding && (
        <Image
          source={require('@/assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Choose what you’d like to manage today.
            </Text>
          </View>

          <View style={styles.cardList}>
            {CARDS.map((card) => (
              <Pressable
                key={card.key}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => router.push(card.route)}
              >
                <View style={[styles.iconWrap, { backgroundColor: card.iconBg }]}>
                  <Ionicons name={card.icon} size={26} color="#4B2E83" />
                </View>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </Pressable>
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
    position: 'relative',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 120,
    paddingTop: 16,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 20,
  },
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.08,
    left: -600,
    top: 0,
    pointerEvents: 'none',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#332244',
  },
  subtitle: {
    fontSize: 14,
    color: '#553A75',
    marginTop: 4,
  },
  cardList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DEF5',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#332244',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B5A7D',
  },
});
