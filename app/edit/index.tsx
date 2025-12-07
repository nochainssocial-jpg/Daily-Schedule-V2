// app/edit/index.tsx
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Footer from '@/components/Footer';
import ScheduleBanner from '@/components/ScheduleBanner';
import { initScheduleForToday, useSchedule } from '@/hooks/schedule-store';

const MAX_WIDTH = 960;
const showWebBranding = Platform.OS === 'web';

type CardConfig = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  route: string; // absolute path
};

const CARDS: CardConfig[] = [
  {
    key: 'dream-team',
    title: 'The Dream Team (Working at B2)',
    description: 'Choose who is working at B2 today and who is away.',
    icon: 'people-circle-outline',
    iconBg: '#ffd5b4',
    route: '/edit/dream-team',
  },
  {
    key: 'participants',
    title: 'Attending Participants',
    description: 'Confirm who is attending for the day (onsite or on outing).',
    icon: 'happy-outline',
    iconBg: '#E0F2FE',
    route: '/edit/participants',
  },
  {
    key: 'outings',
    title: 'Drive / Outing / Off-site',
    description:
      'Set up any drives or outings so cleaning and floating only use onsite staff.',
    icon: 'car-outline',
    iconBg: '#FFE4CC',
    route: '/edit/outings',
  },
  {
    key: 'assignments',
    title: 'Team Daily Assignments',
    description: 'Assign participants to staff for the day.',
    icon: 'clipboard-outline',
    iconBg: '#E5DEFF',
    route: '/edit/assignments',
  },
  {
    key: 'floating',
    title: 'Floating Assignments (Front Room, Scotty, Twins)',
    description:
      'Plan floating support across the key shared spaces throughout the day.',
    icon: 'refresh-circle-outline',
    iconBg: '#FDF2FF',
    route: '/edit/floating',
  },
  {
    key: 'cleaning',
    title: 'End of Shift Cleaning Assignments',
    description:
      'Distribute cleaning tasks fairly so no one is stuck with the same jobs.',
    icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap,
    iconBg: '#DCFCE7',
    route: '/edit/cleaning',
  },
  {
    key: 'pickups-dropoffs',
    title: 'Pickups and Dropoffs with Helpers',
    description:
      'Organise transport, helpers and dropoff locations for each participant.',
    icon: 'bus-outline',
    iconBg: '#FFE4E6',
    route: '/edit/pickups-dropoffs',
  },
  {
    key: 'checklist',
    title: 'End of Shift Checklist',
    description:
      'Final checklist to confirm everything is complete before handing over.',
    icon: 'checkbox-outline',
    iconBg: '#E0E7FF',
    route: '/edit/checklist',
  },
];

export default function EditHubScreen() {
  const router = useRouter();
  const { outingGroup } = useSchedule();

  // Auto-hydrate today on first load
  useEffect(() => {
    initScheduleForToday('B2');
  }, []);

  const outingStaffCount = outingGroup?.staffIds?.length ?? 0;
  const outingParticipantCount = outingGroup?.participantIds?.length ?? 0;

  const hasOuting =
    !!outingGroup && (outingStaffCount > 0 || outingParticipantCount > 0);

  const hasTime =
    (outingGroup?.startTime && outingGroup.startTime.trim() !== '') ||
    (outingGroup?.endTime && outingGroup.endTime.trim() !== '');

  const timeRange = hasTime
    ? `${outingGroup?.startTime || '?'}–${outingGroup?.endTime || '?'}`
    : '';

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Edit Hub',
          headerShown: true,
        }}
      />

      {/* Large washed-out background logo – web only */}
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
          {/* Schedule banner (created / loaded) */}
          <ScheduleBanner />

          {/* Outing summary card, when an outing exists */}
          {hasOuting && (
            <View style={styles.outingSummary}>
              <View style={styles.outingSummaryInner}>
                <View style={styles.outingSummaryIconBubble}>
                  <Ionicons name="car-outline" size={22} color="#C05621" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.outingSummaryTitle}>Outing today</Text>
                  <Text style={styles.outingSummaryLine}>
                    {outingGroup?.name || 'Unnamed outing'}
                    {timeRange ? ` · ${timeRange}` : ''}
                  </Text>
                  <Text style={styles.outingSummaryLine}>
                    {outingStaffCount} staff · {outingParticipantCount} participants
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Category cards */}
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
                <View
                  style={[
                    styles.iconBubble,
                    { backgroundColor: card.iconBg },
                  ]}
                >
                  <Ionicons name={card.icon} size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
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
    backgroundColor: '#fef5fb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 200, // extra space so the last card clears the footer on mobile
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 16,
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
  cardList: {
    marginTop: 16,
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.997 }],
  },
  cardTitle: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  cardDescription: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  outingSummary: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  outingSummaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outingSummaryIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  outingSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9A3412',
  },
  outingSummaryLine: {
    fontSize: 12,
    color: '#7C2D12',
  },
});
