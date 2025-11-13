import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { STAFF } from '@/constants/data';

export default function EditDreamTeamScreen() {
  const { workingStaff } = useSchedule();
  const working = STAFF.filter((s) => workingStaff.includes(s.id));
  const notWorking = STAFF.filter((s) => !workingStaff.includes(s.id));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>The Dream Team (Working at B2)</Text>

      <Text style={styles.sectionTitle}>Working at B2</Text>
      {working.length === 0 ? (
        <Text style={styles.empty}>No staff marked as working at B2.</Text>
      ) : (
        working.map((s) => (
          <Text key={s.id} style={styles.row}>{s.name}</Text>
        ))
      )}

      <Text style={styles.sectionTitle}>Not Working at B2</Text>
      {notWorking.length === 0 ? (
        <Text style={styles.empty}>All staff are currently marked as working.</Text>
      ) : (
        notWorking.map((s) => (
          <Text key={s.id} style={styles.row}>{s.name}</Text>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  row: { fontSize: 14, paddingVertical: 4 },
  empty: { fontSize: 13, opacity: 0.7 },
});
