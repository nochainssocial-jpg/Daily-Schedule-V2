// app/edit/participants.tsx
// Attending Participants edit screen with chip layout and Participant Pool.
// Names are always sorted alphabetically.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { PARTICIPANTS as STATIC_PARTICIPANTS } from '@/constants/data';
import Chip from '@/components/Chip';

type ID = string;
const MAX_WIDTH = 880;

export default function EditParticipantsScreen() {
  const {
    participants: scheduleParticipants,
    attendingParticipants = [],
    updateSchedule,
  } = useSchedule();

  // Prefer schedule-attached participants after create, fallback to constants
  const participants = useMemo(
    () =>
      scheduleParticipants && scheduleParticipants.length
        ? scheduleParticipants
        : STATIC_PARTICIPANTS,
    [scheduleParticipants],
  );

  const participantsById = useMemo(
    () => new Map(participants.map((p) => [p.id, p] as const)),
    [participants],
  );

  const sortedParticipants = useMemo(
    () =>
      [...participants].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' }),
      ),
    [participants],
  );

  const attendingSet = useMemo(
    () => new Set<ID>(attendingParticipants as ID[]),
    [attendingParticipants],
  );

  const attendingList = useMemo(
    () => sortedParticipants.filter((p) => attendingSet.has(p.id as ID)),
    [sortedParticipants, attendingSet],
  );

  const participantPool = useMemo(
    () => sortedParticipants.filter((p) => !attendingSet.has(p.id as ID)),
    [sortedParticipants, attendingSet],
  );

  const toggleParticipant = (id: ID) => {
    const allIds = participants.map((p) => p.id as ID);
    if (!allIds.includes(id)) return;

    let next = Array.isArray(attendingParticipants)
      ? [...(attendingParticipants as ID[])]
      : [];

    if (next.includes(id)) {
      next = next.filter((x) => x !== id);
    } else {
      next.push(id);
    }

    // Always alphabetical
    next.sort((a, b) => {
      const pa = participantsById.get(a)?.name || '';
      const pb = participantsById.get(b)?.name || '';
      return pa.localeCompare(pb, 'en', { sensitivity: 'base' });
    });

    updateSchedule({ attendingParticipants: next });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Attending Participants</Text>
          <Text style={styles.subtitle}>
            Tap participants to mark who is attending Day Program today. Selected participants
            appear at the top; others remain in the Participant Pool. Alphabetical order is always enforced.
          </Text>

          {/* Attending */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attending</Text>
            <View style={styles.chipGrid}>
              {attendingList.length === 0 ? (
                <Text style={styles.empty}>No attending participants selected.</Text>
              ) : (
                attendingList.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={true}
                    onPress={() => toggleParticipant(p.id as ID)}
                  />
                ))
              )}
            </View>
          </View>

          {/* Participant Pool */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participant Pool</Text>
            <View style={styles.chipGrid}>
              {participantPool.length === 0 ? (
                <Text style={styles.empty}>All participants have been selected.</Text>
              ) : (
                participantPool.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={false}
                    onPress={() => toggleParticipant(p.id as ID)}
                  />
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3c234c',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#5e4b72',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#3c234c',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empty: {
    fontSize: 13,
    opacity: 0.75,
    color: '#7a688c',
  },
});
