import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { PARTICIPANTS } from '@/constants/data';

export default function EditParticipantsScreen() {
  const { attendingParticipants } = useSchedule();
  const attending = PARTICIPANTS.filter((p) => attendingParticipants.includes(p.id));
  const notAttending = PARTICIPANTS.filter((p) => !attendingParticipants.includes(p.id));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Attending Participants</Text>

      <Text style={styles.sectionTitle}>Attending</Text>
      {attending.length === 0 ? (
        <Text style={styles.empty}>No participants marked as attending.</Text>
      ) : (
        attending.map((p) => (
          <Text key={p.id} style={styles.row}>{p.name}</Text>
        ))
      )}

      <Text style={styles.sectionTitle}>Not attending</Text>
      {notAttending.length === 0 ? (
        <Text style={styles.empty}>All participants are currently marked as attending.</Text>
      ) : (
        notAttending.map((p) => (
          <Text key={p.id} style={styles.row}>{p.name}</Text>
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
