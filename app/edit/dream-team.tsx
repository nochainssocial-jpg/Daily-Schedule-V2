// app/edit/dream-team.tsx
// Edit screen for working staff (Dream Team) with staff pool.
// Integrates with outings: staff on outing are shown as outline pills.
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
import { STAFF as STATIC_STAFF } from '@/constants/data';
import Chip from '@/components/Chip';

type ID = string;

const makeStaffMap = () => {
  const map: Record<string, any> = {};
  STATIC_STAFF.forEach((s) => {
    map[s.id] = s;
  });
  return map;
};

const sortByName = (list: any[]) =>
  list.slice().sort((a, b) => a.name.localeCompare(b.name));

export default function EditDreamTeamScreen() {
  const { width } = useWindowDimensions();

  const {
    workingStaff = [],
    outingGroup,
    updateSchedule,
  } = useSchedule() as any;

  const staffById = useMemo(makeStaffMap, []);
  const allStaff = useMemo(
    () => sortByName(STATIC_STAFF.slice()),
    []
  );

  const dreamTeam = useMemo(
    () =>
      sortByName(
        (workingStaff as ID[])
          .map((id) => staffById[id])
          .filter(Boolean)
      ),
    [workingStaff, staffById]
  );

  const staffPool = useMemo(
    () =>
      sortByName(
        allStaff.filter((s) => !(workingStaff as ID[]).includes(s.id))
      ),
    [allStaff, workingStaff]
  );

  const outingStaffSet = useMemo(
    () => new Set<string>(outingGroup?.staffIds ?? []),
    [outingGroup]
  );

  const toggleStaff = (id: ID) => {
    const current = new Set<string>(workingStaff as ID[]);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    const next = Array.from(current);
    updateSchedule?.({ workingStaff: next });
  };

  const contentWidth = Math.min(width - 32, 880);

  return (
    <View style={styles.screen}>
      {/* Web-only hero icon for Dream Team */}
      {Platform.OS === 'web' && (
        <Ionicons
          name="people-circle-outline"
          size={220}
          color="#FDE68A" // warm pastel yellow, different hue to Outings
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { width: contentWidth }]}>
          <Text style={styles.title}>The Dream Team</Text>
          <Text style={styles.subtitle}>
            Tap staff to mark who is working at B2 today. Working at B2 are shown at
            the top; everyone else appears in the Staff Pool below. Names are always
            sorted alphabetically.
          </Text>

          <Text style={styles.sectionTitle}>Working at B2 (Dream Team)</Text>
          {dreamTeam.length === 0 ? (
            <Text style={styles.empty}>No staff have been selected yet.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {dreamTeam.map((s) => {
                const isOutOnOuting = outingStaffSet.has(s.id as ID);
                const mode = isOutOnOuting ? 'offsite' : 'onsite';
                return (
                  <Chip
                    key={s.id}
                    label={s.name}
                    mode={mode as any}
                    onPress={() => toggleStaff(s.id as ID)}
                  />
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Staff Pool</Text>
          {staffPool.length === 0 ? (
            <Text style={styles.empty}>Everyone is working at B2 today.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {staffPool.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  mode="default"
                  onPress={() => toggleStaff(s.id as ID)}
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
    backgroundColor: '#FEF5FB', // soft mauve-pink
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
    paddingVertical: Platform.select({ ios: 24, android: 24, default: 24 }),
  },
  inner: {
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4b164c',
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
