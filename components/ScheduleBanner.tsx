// components/ScheduleBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSchedule } from '@/hooks/schedule-store';

// AUS date formatter: "YYYY-MM-DD" → "DD/MM/YYYY"
const formatAusDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const parseIsoDate = (iso?: string): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const diffInDays = (a: Date, b: Date) => {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

export default function ScheduleBanner() {
  const banner = useSchedule((s) => s.banner);

  if (!banner || (!banner.scheduleDate && !banner.sourceDate)) return null;

  const today = startOfDay(new Date());
  const scheduleIso = banner.scheduleDate || banner.sourceDate;
  const scheduleDate = parseIsoDate(scheduleIso);

  if (!scheduleDate) return null;

  const diff = diffInDays(today, scheduleDate); // positive = today is after schedule
  const formatted = formatAusDate(scheduleIso);

  const todayDay = today.getDay(); // 0=Sun, 1=Mon, ... 5=Fri
  const scheduleDay = scheduleDate.getDay();

  let message = '';
  let isLoadedBanner = false;

  // If schedule is today or in the future, treat as "created today"
  if (diff <= 0) {
    message = `Successfully created schedule – ${formatted}`;
    isLoadedBanner = false;
  } else {
    // Schedule is from a previous day → loaded banner
    isLoadedBanner = true;

    if (diff === 1) {
      // Yesterday (normal case)
      message = `Successfully loaded yesterday's schedule – ${formatted}`;
    } else if (
      todayDay === 1 && // Monday
      scheduleDay === 5 && // Friday
      diff >= 2 &&
      diff <= 3
    ) {
      // Monday loading last Friday's schedule
      message = `Successfully loaded last Friday's schedule – ${formatted}`;
    } else {
      // Older than yesterday (or non-Fri on Monday)
      message = `Successfully loaded previous schedule – ${formatted}`;
    }
  }

  const bgColor = isLoadedBanner ? '#FFF4E5' : '#E6F4EA'; // orange vs green
  const borderColor = isLoadedBanner ? '#F97316' : '#22C55E';
  const iconName = isLoadedBanner
    ? 'time-outline'
    : 'checkmark-circle-outline';
  const iconColor = isLoadedBanner ? '#F97316' : '#22C55E';

  return (
    <View style={[styles.box, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.row}>
        <Ionicons
          name={iconName}
          size={18}
          color={iconColor}
          style={styles.icon}
        />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#433F4C',
    flexShrink: 1,
  },
});
