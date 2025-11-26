// app/edit/index.tsx
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Footer from '@/components/Footer';
import ScheduleBanner from '@/components/ScheduleBanner';
import { initScheduleForToday, useSchedule } from '@/hooks/schedule-store';

const MAX_WIDTH = 880;

type Card = {
  title: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const CARDS: Card[] = [
  {
    title: 'The Dream Team (Working at B2)',
    path: '/edit/dream-team',
    icon: 'people-circle-outline',
    color: '#ec4899',
  },
  {
    title: 'Attending Participants',
    path: '/edit/participants',
    icon: 'people-outline',
    color: '#a855f7',
  },
  // 👉 NEW: Outings card
  {
    title: 'Drive / Outing - Off-Site',
    path: '/edit/outings',
    icon: 'sunny-outline',
    color: '#fb923c',
  },
  {
    title: 'Team Daily Assignments',
    path: '/edit/assignments',
    icon: 'list-outline',
    color: '#3b82f6',
  },
  {
    title: 'Floating Assignments (Front Room, Scotty, Twins)',
    path: '/edit/floating',
    icon: 'shuffle-outline',
    color: '#0ea5e9',
  },
  {
    title: 'End of Shift Cleaning Assignments',
    path: '/edit/cleaning',
    icon: 'sparkles-outline' as any, // fallback if your Ionicons version lacks this
    color: '#f59e0b',
  },
  {
    title: 'Pickups and Dropoffs with Helpers',
    path: '/edit/pickups-dropoffs',
    icon: 'car-outline',
    color: '#22c55e',
  },
  {
    title: 'End of Shift Checklist',
    path: '/edit/checklist',
    icon: 'checkbox-outline',
    color: '#6366f1',
  },
];

export default function EditHubScreen() {
  const router = useRouter();

  // Ensure today’s schedule is loaded into the store
  useEffect(() => {
    initScheduleForToday('B2');
  }, []);

  const { outingGroup } = useSchedule();

  const outingStaffCount = outingGroup?.staffIds?.length ?? 0;
  const outingParticipantCount = outingGroup?.participantIds?.length ?? 0;
  const hasOutingToday =
    !!outingGroup && (outingStaffCount > 0 || outingParticipantCount > 0);

  const timeRange =
    outingGroup?.startTime && outingGroup?.endTime
      ? `${outingGroup.startTime}–${outingGroup.endTime}`
      : outingGroup?.startTime
      ? `from ${outingGroup.startTime}`
      : outingGroup?.endTime
      ? `until ${outingGroup.endTime}`
      : null;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Edit Hub',
          headerShown: true,
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Edit today&apos;s schedule</Text>
          <Text style={styles.subtitle}>
            Tap a category below to review and adjust details captured during
            the create flow.
          </Text>

          {/* Banner for created/updated state */}
          <ScheduleBanner />

          {/* 👉 NEW: Outing summary when an outing exists */}
          {hasOutingToday && (
            <View style={styles.outingSummary}>
              <Ionicons
                name="sunny-outline"
                size={20}
                color="#c05621"
                style={{ marginRight: 10, marginTop: 2 }}
              />
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
          )}

          {/* Cards */}
          <View style={styles.cardList}>
            {CARDS.map((card) => (
              <Pressable
                key={card.path}
                onPress={() => router.push(card.path as any)}
                style={styles.card}
              >
                <View style={styles.cardLeft}>
                  <View
                    style={[
                      styles.iconBubble,
                      { backgroundColor: `${card.color}22` },
                    ]}
                  >
                    <Ionicons
                      name={card.icon}
                      size={20}
                      color={card.color}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#9ca3af"
                />
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
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4b164c',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },

  outingSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginTop: 8,
    marginBottom: 8,
  },
  outingSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C2D12',
    marginBottom: 2,
  },
  outingSummaryLine: {
    fontSize: 12,
    color: '#9A3412',
  },

  cardList: {
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 999,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
});
