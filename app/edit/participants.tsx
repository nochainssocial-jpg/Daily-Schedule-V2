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
import { useNotifications } from '@/hooks/notifications';
import { PARTICIPANTS as STATIC_PARTICIPANTS } from '@/constants/data';
import SaveExit from '@/components/SaveExit';
import Chip from '@/components/Chip';

type ID = string;

const MAX_WIDTH = 880;

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

  const { push } = useNotifications();

  const partById = useMemo(makePartMap, []);
  const allParts = useMemo(
    () => sortByName(STATIC_PARTICIPANTS.slice()),
    []
  );

  const attendingSet = useMemo(
    () => new Set<string>((attendingParticipants ?? []) as string[]),
    [attendingParticipants]
  );

  const attendingList = useMemo(
    () =>
      allParts.filter((p) => attendingSet.has(p.id as ID)),
    [allParts, attendingSet]
  );

  const poolList = useMemo(
    () =>
      allParts.filter((p) => !attendingSet.has(p.id as ID)),
    [allParts, attendingSet]
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
    // 🔔 Toast for participant changes
    push?.('Attending participants updated', 'participants');
  };

  const contentWidth = Math.min(width - 32, MAX_WIDTH);
  const isMobileWeb = Platform.OS === 'web' && width < 768;

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="participants" />

      {/* Web-only hero icon for Participants */}
      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="happy-outline"
          size={220}
          color="#5DBBFA"
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { width: contentWidth }]}>
          <Text style={styles.title}>Attending Participants</Text>
          <Text style={styles.subtitle}>
            Tap participants to mark who is attending at B2 today. Attending participants
            show up in Assignments, Floating, Pickups and Dropoffs screens.
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
    backgroundColor: '#E0F2FE',
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 1,
    zIndex: 0,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 160,
  },
  inner: {
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0F172A',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empty: {
    fontSize: 13,
    opacity: 0.75,
    color: '#64748B',
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
    color: '#0F172A',
  },
});
