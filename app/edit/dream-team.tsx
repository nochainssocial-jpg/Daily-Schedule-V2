// app/edit/dream-team.tsx
// Editable Dream Team screen with chip layout and Staff Pool
// Names are always sorted alphabetically.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { STAFF as STATIC_STAFF } from '@/constants/data';
import Chip from '@/components/Chip';
import { useNotifications } from '@/hooks/notifications';

type ID = string;

const MAX_WIDTH = 880;

export default function EditDreamTeamScreen() {
  const { staff: scheduleStaff, workingStaff = [], updateSchedule } = useSchedule();
  const { push } = useNotifications();


  // Prefer schedule-attached staff after create, fallback to static STAFF
  const staff = useMemo(
    () => (scheduleStaff && scheduleStaff.length ? scheduleStaff : STATIC_STAFF),
    [scheduleStaff],
  );

  const staffById = useMemo(
    () => new Map(staff.map((s) => [s.id, s] as const)),
    [staff],
  );

  const sortedStaff = useMemo(
    () =>
      [...staff].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' }),
      ),
    [staff],
  );

  const workingSet = useMemo(() => new Set<ID>(workingStaff as ID[]), [workingStaff]);

  const dreamTeam = useMemo(
    () => sortedStaff.filter((s) => workingSet.has(s.id as ID)),
    [sortedStaff, workingSet],
  );

  const staffPool = useMemo(
    () => sortedStaff.filter((s) => !workingSet.has(s.id as ID)),
    [sortedStaff, workingSet],
  );

  const toggleStaff = (id: ID) => {
    const allIds = staff.map((s) => s.id as ID);
    if (!allIds.includes(id)) return;

    let next = Array.isArray(workingStaff) ? [...(workingStaff as ID[])] : [];
    if (next.includes(id)) {
      next = next.filter((x) => x !== id);
    } else {
      next.push(id);
    }

    // Always keep Dream Team sorted alphabetically by staff name
    next.sort((a, b) => {
      const sa = staffById.get(a)?.name || '';
      const sb = staffById.get(b)?.name || '';
      return sa.localeCompare(sb, 'en', { sensitivity: 'base' });
    });

    updateSchedule({ workingStaff: next });
    push('Dream Team updated', 'dream');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>The Dream Team</Text>
          <Text style={styles.subtitle}>
            Tap staff to mark who is working at B2 today. Working at B2 are shown at the top;
            everyone else appears in the Staff Pool below. Names are always sorted alphabetically.
          </Text>

          {/* Working at B2 (Dream Team) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Working at B2 (Dream Team)</Text>
            <View style={styles.chipGrid}>
              {dreamTeam.length === 0 ? (
                <Text style={styles.empty}>No staff currently marked as working at B2.</Text>
              ) : (
                dreamTeam.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    selected={true}
                    onPress={() => toggleStaff(s.id as ID)}
                  />
                ))
              )}
            </View>
          </View>

          {/* Staff Pool */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Pool</Text>
            <View style={styles.chipGrid}>
              {staffPool.length === 0 ? (
                <Text style={styles.empty}>
                  All staff are currently assigned to the Dream Team.
                </Text>
              ) : (
                staffPool.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    selected={false}
                    onPress={() => toggleStaff(s.id as ID)}
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