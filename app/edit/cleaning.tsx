import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { DEFAULT_CHORES, STAFF } from '@/constants/data';

export default function EditCleaningScreen() {
  const { cleaningAssignments } = useSchedule();
  const staffById = new Map(STAFF.map((s) => [s.id, s]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>End of Shift Cleaning Assignments</Text>
      {DEFAULT_CHORES.map((chore) => {
        const sid = cleaningAssignments[String(chore.id)];
        const st = staffById.get(sid || '');
        return (
          <View key={String(chore.id)} style={styles.row}>
            <Text style={styles.chore}>{chore.label}</Text>
            <Text style={styles.staff}>
              {st ? st.name : 'Not yet assigned'}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chore: { flex: 2, fontSize: 14 },
  staff: { flex: 1, fontSize: 14, textAlign: 'right' },
});
