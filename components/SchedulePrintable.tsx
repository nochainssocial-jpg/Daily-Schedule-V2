// components/SchedulePrintable.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSchedule, type ID } from '@/hooks/schedule-store';
import { DEFAULT_CHORES, type Chore } from '@/constants/data';

const MAX_WIDTH = 880;

// AUS date formatter
const formatAusDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export default function SchedulePrintable() {
  const {
    staff,
    participants,
    workingStaff,
    attendingParticipants,
    assignments,
    pickupParticipants,
    helperStaff,
    dropoffAssignments,
    cleaningAssignments,
    finalChecklistStaff,
    date,
  } = useSchedule();

  const findStaff = (id: ID | undefined | null) =>
    id ? staff.find((s) => s.id === id) || null : null;

  const findParticipant = (id: ID) =>
    participants.find((p) => p.id === id) || null;

  const workingStaffList = workingStaff
    .map(findStaff)
    .filter(Boolean) as typeof staff;

  const attendingList = attendingParticipants
    .map(findParticipant)
    .filter(Boolean) as typeof participants;

  const pickupList = pickupParticipants
    .map(findParticipant)
    .filter(Boolean) as typeof participants;

  const helperStaffList = helperStaff
    .map(findStaff)
    .filter(Boolean) as typeof staff;

  const dropoffEntries = Object.entries(dropoffAssignments);

  const checklistStaff = findStaff(finalChecklistStaff || null);

  const chores: Chore[] = DEFAULT_CHORES || [];

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>B2 Daily Schedule</Text>
        <Text style={styles.date}>
          Date: {formatAusDate(date)}
        </Text>
      </View>

      {/* Section: Working staff */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Working staff (Dream Team)</Text>
        {workingStaffList.length ? (
          <Text style={styles.bodyText}>
            {workingStaffList.map((s) => s.name).join(', ')}
          </Text>
        ) : (
          <Text style={styles.muted}>No working staff set.</Text>
        )}
      </View>

      {/* Section: Attending participants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attending participants</Text>
        {attendingList.length ? (
          <Text style={styles.bodyText}>
            {attendingList.map((p) => p.name).join(', ')}
          </Text>
        ) : (
          <Text style={styles.muted}>No attending participants set.</Text>
        )}
      </View>

      {/* Section: Team daily assignments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team daily assignments</Text>
        {workingStaffList.length ? (
          workingStaffList.map((st) => {
            const ids = assignments[st.id] || [];
            const names = ids
              .map(findParticipant)
              .filter(Boolean)
              .map((p) => p!.name);

            return (
              <View key={st.id} style={styles.row}>
                <Text style={styles.rowLabel}>{st.name}</Text>
                <Text style={styles.rowValue}>
                  {names.length ? names.join(', ') : 'No participants assigned'}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.muted}>No working staff to show assignments for.</Text>
        )}
      </View>

      {/* Section: Pickups & dropoffs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pickups & dropoffs</Text>

        <Text style={styles.subheading}>Participants picked up by others</Text>
        {pickupList.length ? (
          <Text style={styles.bodyText}>
            {pickupList.map((p) => p.name).join(', ')}
          </Text>
        ) : (
          <Text style={styles.muted}>No external pickups recorded.</Text>
        )}

        <Text style={[styles.subheading, { marginTop: 12 }]}>
          Dropoff teams
        </Text>
        {dropoffEntries.length ? (
          dropoffEntries.map(([staffId, ids]) => {
            const st = findStaff(staffId);
            const names = ids
              .map(findParticipant)
              .filter(Boolean)
              .map((p) => p!.name);

            if (!st) return null;

            return (
              <View key={staffId} style={styles.row}>
                <Text style={styles.rowLabel}>{st.name}</Text>
                <Text style={styles.rowValue}>
                  {names.length ? names.join(', ') : 'No participants assigned'}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.muted}>No dropoff teams recorded.</Text>
        )}

        {helperStaffList.length ? (
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Helpers: {helperStaffList.map((s) => s.name).join(', ')}
          </Text>
        ) : null}
      </View>

      {/* Section: Cleaning */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>End of shift cleaning assignments</Text>

        {chores.length ? (
          chores.map((chore) => {
            const assignedId = cleaningAssignments[String(chore.id)];
            const st = findStaff(assignedId || null);
            return (
              <View key={chore.id} style={styles.row}>
                <Text style={styles.rowLabel}>{chore.name}</Text>
                <Text style={styles.rowValue}>
                  {st ? st.name : 'Not assigned'}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.muted}>No cleaning tasks configured.</Text>
        )}
      </View>

      {/* Section: End of shift checklist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>End of shift checklist</Text>
        <Text style={styles.bodyText}>
          Responsible staff member:{' '}
          {checklistStaff ? checklistStaff.name : 'Not set'}
        </Text>
        <Text style={styles.muted}>
          (Checklist item completion is stored in the app – this printout
          summarises the responsible person.)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#433F4C',
  },
  date: {
    marginTop: 4,
    fontSize: 14,
    color: '#7A7485',
  },
  section: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5ECF5',
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#433F4C',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A3F5C',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    color: '#433F4C',
  },
  muted: {
    fontSize: 13,
    color: '#9B93AA',
  },
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#433F4C',
  },
  rowValue: {
    flex: 2,
    fontSize: 14,
    color: '#433F4C',
  },
});
