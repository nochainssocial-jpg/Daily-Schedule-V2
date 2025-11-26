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

  const formattedSchedule = formatAusDate(scheduleIso);
  const formattedSource = banner.sourceDate
    ? formatAusDate(banner.sourceDate)
    : undefined;

  let message = '';
  let bgColor = '#E6F4EA';
  let borderColor = '#22C55E';
  let iconName: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline';
  let iconColor = '#22C55E';

  if (banner.type === 'prefilled') {
    // Using a previous day's plan as the basis for today
    bgColor = '#E0F2FE';
    borderColor = '#0284C7';
    iconName = 'time-outline';
    iconColor = '#0369A1';

    if (banner.scheduleDate && formattedSource) {
      message = `Pre-filled ${formatAusDate(
        banner.scheduleDate
      )} using schedule from ${formattedSource}`;
    } else {
      message = 'Pre-filled today’s schedule using a previous plan.';
    }
  } else if (banner.type === 'loaded') {
    bgColor = '#FFF4E5';
    borderColor = '#F97316';
    iconName = 'time-outline';
    iconColor = '#F97316';

    const diff = diffInDays(today, scheduleDate);
    const todayDay = today.getDay(); // 0=Sun, 1=Mon, ... 5=Fri
    const scheduleDay = scheduleDate.getDay();

    if (diff === 0) {
      message = `Successfully loaded today's schedule – ${formattedSchedule}`;
    } else if (diff === 1) {
      // Yesterday (normal case)
      message = `Successfully loaded yesterday's schedule – ${formattedSchedule}`;
    } else if (
      todayDay === 1 && // Monday
      scheduleDay === 5 && // Friday
      diff >= 2 &&
      diff <= 3
    ) {
      // Monday loading last Friday's schedule
      message = `Successfully loaded last Friday's schedule – ${formattedSchedule}`;
    } else {
      // Older than yesterday (or non-Fri on Monday)
      message = `Successfully loaded previous schedule – ${formattedSchedule}`;
    }
  } else if (banner.type === 'created') {
    bgColor = '#E6F4EA';
    borderColor = '#22C55E';
    iconName = 'checkmark-circle-outline';
    iconColor = '#22C55E';
    message = `Successfully created schedule – ${formattedSchedule}`;
  } else {
    // Unknown type – don't render anything
    return null;
  }

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
