// app/edit/participants.tsx
// Attending Participants edit screen with chip layout and Participant Pool.
// Names are always sorted alphabetically.
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSchedule } from '@/hooks/schedule-store';
import { PARTICIPANTS as STATIC_PARTICIPANTS } from '@/constants/data';
import Chip from '@/components/Chip';
import { useNotifications } from '@/hooks/notifications';
import SaveExit from '@/components/SaveExit';

type ID = string;
const MAX_WIDTH = 880;

export default function EditParticipantsScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const {
    participants: scheduleParticipants,
    attendingParticipants = [],
    outingGroup,
    updateSchedule,
  } = useSchedule();
  const { push } = useNotifications();

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
        (a.name || '').localeCompare(b.name || '', 'en', {
          sensitivity: 'base',
        }),
      ),
    [participants],
  );

  const attendingSet = useMemo(
    () => new Set<ID>(attendingParticipants as ID[]),
    [attendingParticipants],
  );

  const outingParticipantSet = useMemo(
    () => new Set<ID>((outingGroup?.participantIds as ID[]) || []),
    [outingGroup]
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
    push('Participants attending updated', 'participants');
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="participants" />
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="people-outline"
          size={220}
          color="#F0CFE3"
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Attending Participants</Text>
          <Text style={styles.subtitle}>
            Tap participants to mark who is attending Day Program today.
            Selected participants appear at the top; others remain in the
            Participant Pool. Alphabetical order is always enforced.
          </Text>

          {/* Attending */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attending</Text>
            <View style={styles.chipGrid}>
              {attendingList.length === 0 ? (
                <Text style={styles.empty}>
                  No attending participants selected.
                </Text>
              ) : (
                attendingList.map((p) => {
                  const isOutOnOuting = outingParticipantSet.has(p.id as ID);
                  const onSite = !isOutOnOuting;
                  return (
                    <Chip
                      key={p.id}
                      label={p.name}
                      selected={onSite}
                      onPress={() => toggleParticipant(p.id as ID)}
                    />
                  );
                })
              )}
            </View>
          </View>

          {/* Participant Pool */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participant Pool</Text>
            <View style={styles.chipGrid}>
              {participantPool.length === 0 ? (
                <Text style={styles.empty}>
                  All participants have been selected.
                </Text>
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
    backgroundColor: '#FFF7FB', // pastel pink
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
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