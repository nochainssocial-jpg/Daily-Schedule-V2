// components/ScheduleBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';

// 👉 AUS date formatter: "YYYY-MM-DD" → "DD/MM/YYYY"
const formatAusDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso; // fallback
  return `${d}/${m}/${y}`;
};

export default function ScheduleBanner() {
  const banner = useSchedule((s) => s.banner);

  if (!banner || !banner.type) return null;

  const isLoaded = banner.type === 'loaded';

  const bgColor = isLoaded ? '#FFF4E5' : '#E6F4EA';   // orange vs green
  const borderColor = isLoaded ? '#F97316' : '#22C55E';

  let message = '';

  if (isLoaded) {
    const createdIso =
      banner.sourceDate || banner.scheduleDate || '';
    const created = formatAusDate(createdIso);
    message = `Successfully loaded schedule – schedule created ${created}`;
  } else {
    const dateIso = banner.scheduleDate || '';
    const date = formatAusDate(dateIso);
    message = `Successfully created schedule – ${date}`;
  }

  return (
    <View style={[styles.box, { backgroundColor: bgColor, borderColor }]}>
      <Text style={styles.text}>{message}</Text>
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
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#433F4C',
  },
});
