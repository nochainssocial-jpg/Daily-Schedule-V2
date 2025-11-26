// app/edit/participants.tsx
// Edit screen for attending participants with participant pool.
// Integrates with outings: participants on outing are shown as outline pills.
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSchedule } from '@/hooks/schedule-store';
import { PARTICIPANTS as STATIC_PARTICIPANTS } from '@/constants/data';
import Chip from '@/components/Chip';

type ID = string;

const makePartMap = () => {
  const map: Record<string, any> = {};
  STATIC_PARTICIPANTS.forEach((p) => {
    map[p.id] = p;
  });
  return map;
};

const sortByName = (list: any[]) =>
  list.slice().sort((a, b) => a.name.localeCompare(b.name));

export default function EditParticipantsScreen() {
  const { width } = useWindowDimensions();

  const {
    attendingParticipants = [],
    outingGroup,
    updateSchedule,
  } = useSchedule() as any;

  const partById = useMemo(makePartMap, []);
  const allParts = useMemo(
    () => sortByName(STATIC_PARTICIPANTS.slice()),
    []
  );

  const attendingList = useMemo(
    () =>
      sortByName(
        (attendingParticipants as ID[])
          .map((id) => partById[id])
          .filter(Boolean)
      ),
    [attendingParticipants, partById]
  );

  const poolList = useMemo(
    () =>
      sortByName(
        allParts.filter((p) => !(attendingParticipants as ID[]).includes(p.id))
      ),
    [allParts, attendingParticipants]
  );

  const outingParticipantSet = useMemo(
    () => new Set<string>(outingGroup?.participantIds ?? []),
    [outingGroup]
  );

  const toggleParticipant = (id: ID) => {
    const current = new Set<string>(attendingParticipants as ID[]);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    const next = Array.from(current);
    updateSchedule?.({ attendingParticipants: next });
  };

  const contentWidth = Math.min(width - 32, 880);

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
      
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { width: contentWidth }]}>
          <Text style={styles.title}>Attending Participants</Text>
          <Text style={styles.subtitle}>
            Tap participants to mark who is attending Day Program today. Selected
            participants appear at the top; others remain in the Participant Pool.
            Alphabetical order is always enforced.
          </Text>

          <Text style={styles.sectionTitle}>Attending</Text>
          {attendingList.length === 0 ? (
            <Text style={styles.empty}>No participants have been selected yet.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {attendingList.map((p) => {
                const isOutOnOuting = outingParticipantSet.has(p.id as ID);
                const mode = isOutOnOuting ? 'offsite' : 'onsite';
                return (
                  <Chip
                    key={p.id}
                    label={p.name}
                    mode={mode as any}
                    onPress={() => toggleParticipant(p.id as ID)}
                  />
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Participant Pool
          </Text>
          {poolList.length === 0 ? (
            <Text style={styles.empty}>Everyone is attending today.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {poolList.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  mode="default"
                  onPress={() => toggleParticipant(p.id as ID)}
                />
              ))}
            </View>
          )}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendOnsite]} />
              <Text style={styles.legendLabel}>On-site</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendOffsite]} />
              <Text style={styles.legendLabel}>On outing</Text>
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
    color: '#6b7280',
    marginBottom: 16,
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
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
  },
  legendOnsite: {
    backgroundColor: '#F54FA5',
    borderColor: '#F54FA5',
  },
  legendOffsite: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F54FA5',
  },
  legendLabel: {
    fontSize: 12,
    color: '#4b164c',
  },
});
