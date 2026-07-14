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

export default function ScheduleBanner() {
  const banner = useSchedule((s) => s.banner);

  if (!banner || (!banner.scheduleDate && !banner.sourceDate)) return null;

  const scheduleIso = banner.scheduleDate || banner.sourceDate;
  const formattedSchedule = formatAusDate(scheduleIso);

  let message = '';
  let bgColor = '#E6F4EA';
  let borderColor = '#22C55E';
  let iconName: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline';
  let iconColor = '#22C55E';

  if (banner.type === 'missing') {
    bgColor = '#F3F4F6';
    borderColor = '#9CA3AF';
    iconName = 'calendar-outline';
    iconColor = '#6B7280';
    message = `No schedule has been created for today – ${formattedSchedule}`;
  } else if (banner.type === 'loaded') {
    bgColor = '#FFF4E5';
    borderColor = '#F97316';
    iconName = 'time-outline';
    iconColor = '#F97316';
    message = `Successfully loaded today's schedule – ${formattedSchedule}`;
  } else if (banner.type === 'created') {
    bgColor = '#E6F4EA';
    borderColor = '#22C55E';
    iconName = 'checkmark-circle-outline';
    iconColor = '#22C55E';
    message = `Successfully created schedule – ${formattedSchedule}`;
  } else {
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
