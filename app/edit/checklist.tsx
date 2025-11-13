import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { DEFAULT_CHECKLIST, STAFF } from '@/constants/data';

export default function EditChecklistScreen() {
  const { finalChecklist, finalChecklistStaff } = useSchedule();
  const staff = STAFF.find((s) => s.id === finalChecklistStaff);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>End of Shift Checklist</Text>
      <Text style={styles.subtitle}>
        Last to leave: {staff ? staff.name : 'Not yet selected'}
      </Text>

      {DEFAULT_CHECKLIST.map((item) => {
        const checked = !!finalChecklist[String(item.id)];
        return (
          <Text
            key={String(item.id)}
            style={[styles.row, checked && styles.rowChecked]}
          >
            {checked ? '✔ ' : '○ '}{item.label}
          </Text>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, opacity: 0.7, marginBottom: 16 },
  row: { fontSize: 14, paddingVertical: 4 },
  rowChecked: { textDecorationLine: 'line-through', opacity: 0.7 },
});
