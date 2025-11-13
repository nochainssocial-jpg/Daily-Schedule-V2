import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { FLOATING_ROOMS, STAFF } from '@/constants/data';

export default function EditFloatingScreen() {
  const { floatingAssignments } = useSchedule();

  const staffById = new Map(STAFF.map((s) => [s.id, s]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Floating Assignments</Text>
      <Text style={styles.subtitle}>Front Room, Scotty, Twins</Text>

      {FLOATING_ROOMS.map((room) => {
        const staffId = floatingAssignments[room.id];
        const st = staffById.get(staffId || '');
        const isFSORoom = room.id === 'twins';
        return (
          <View key={room.id} style={styles.row}>
            <View style={styles.roomCell}>
              <Text style={styles.roomLabel}>{room.label}</Text>
              {isFSORoom && (
                <Text style={styles.fsoTag}>FSO 11:00–11:30, 13:00–13:30</Text>
              )}
            </View>
            <Text style={styles.staff}>
              {st ? st.name : 'No floating staff assigned'}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, opacity: 0.7, marginBottom: 16 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roomCell: { flexShrink: 1, marginRight: 12 },
  roomLabel: { fontSize: 15, fontWeight: '600' },
  fsoTag: { fontSize: 11, color: '#e91e63', marginTop: 2 },
  staff: { fontSize: 14 },
});
