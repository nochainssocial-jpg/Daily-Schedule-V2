// app/edit/dream-team.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { STAFF } from '@/constants/data';

export default function EditDreamTeamScreen() {
  const { workingStaff } = useSchedule();
  const working = STAFF.filter((s) => workingStaff.includes(s.id));
  const notWorking = STAFF.filter((s) => !workingStaff.includes(s.id));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
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
        </View>
      </ScrollView>
    </View>
  );
}

const MAX_WIDTH = 880;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
  },
  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#332244',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#3c234c',
  },
  row: {
    fontSize: 14,
    paddingVertical: 4,
    color: '#4c3b5c',
  },
  empty: {
    fontSize: 13,
    opacity: 0.75,
    color: '#7a688c',
  },
});
