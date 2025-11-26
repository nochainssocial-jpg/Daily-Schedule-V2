import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';

export default function ScheduleBanner() {
  const { meta } = useSchedule();

  if (!meta?.bannerKind) return null;

  const { bannerKind, bannerDate, sourceDate } = meta;

  let bg = '#86EFAC'; // default green
  let title = '';
  let subtitle = '';

  if (bannerKind === 'loaded') {
    bg = '#FBBF24'; // orange
    title = 'Schedule Loaded';
    subtitle = `Date: ${bannerDate}`;
  }

  if (bannerKind === 'created') {
    bg = '#4ADE80'; // green
    title = 'Schedule Created';
    subtitle = `Date: ${bannerDate}`;
  }

  if (bannerKind === 'prefilled') {
    bg = '#60A5FA'; // soft blue
    title = 'Schedule Pre-filled';
    subtitle = `Using yesterday (${sourceDate}) → today (${bannerDate})`;
  }

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
    fontSize: 12,
  },
});
