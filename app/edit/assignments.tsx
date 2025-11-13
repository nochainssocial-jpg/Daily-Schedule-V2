import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { STAFF, PARTICIPANTS } from '@/constants/data';

export default function EditAssignmentsScreen() {
  const { assignments } = useSchedule();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Team Daily Assignments</Text>
      {STAFF.map((s) => {
        const assignedIds = assignments[s.id] || [];
        const assignedParts = PARTICIPANTS.filter((p) => assignedIds.includes(p.id));
        return (
          <Text key={s.id} style={styles.row}>
            <Text style={styles.staff}>{s.name}:</Text>{' '}
            {assignedParts.length
              ? assignedParts.map((p) => p.name).join(', ')
              : 'No participants assigned'}
          </Text>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  row: { fontSize: 14, paddingVertical: 6 },
  staff: { fontWeight: '600' },
});
