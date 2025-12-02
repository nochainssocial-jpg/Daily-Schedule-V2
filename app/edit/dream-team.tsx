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

import SaveExit from '@/components/SaveExit';
import { useSchedule } from '@/hooks/schedule-store';
import { STAFF as STATIC_STAFF } from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import Chip from '@/components/Chip';

type ID = string;

const sortByName = (list: any[]) =>
  list
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

export default function EditDreamTeamScreen() {
  const { width } = useWindowDimensions();
  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const {
    staff: scheduleStaff,
    workingStaff = [],
    outingGroup,
    updateSchedule,
  } = useSchedule() as any;

  // Single source of truth for staff:
  //   • Prefer staff from the current schedule snapshot (Supabase)
  //   • Fall back to STATIC_STAFF only if nothing is stored yet
  const staffSource =
    (Array.isArray(scheduleStaff) && scheduleStaff.length
      ? scheduleStaff
      : STATIC_STAFF) || [];

  const staffById = useMemo(() => {
    const map: Record<string, any> = {};
    staffSource.forEach((s: any) => {
      if (!s) return;
      const key = String(s.id);
      if (!key) return;
      map[key] = s;
    });
    return map;
  }, [staffSource]);

  const workingSet = useMemo(
    () => new Set<string>((workingStaff as ID[]).map((id) => String(id))),
    [workingStaff],
  );

  const allStaff = useMemo(() => sortByName(staffSource), [staffSource]);

  const dreamTeam = useMemo(
    () =>
      sortByName(
        Array.from(workingSet)
          .map((id) => staffById[id])
          .filter(Boolean),
      ),
    [workingSet, staffById],
  );

  const staffPool = useMemo(
    () =>
      sortByName(
        allStaff.filter((s: any) => !workingSet.has(String(s.id))),
      ),
    [allStaff, workingSet],
  );

  const outingStaffSet = useMemo(() => {
    const ids = ((outingGroup?.staffIds ?? []) as (string | number)[]).map(
      (id) => String(id),
    );
    return new Set<string>(ids);
  }, [outingGroup]);

  const toggleStaff = (id: ID) => {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }

    const key = String(id);
    const next = new Set<string>(Array.from(workingSet));

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    updateSchedule?.({ workingStaff: Array.from(next) });
    push?.('Dream Team updated', 'dream-team');
  };

  const contentWidth = Math.min(width - 32, 880);

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="dreamTeam" />

      {/* Web-only hero icon for larger layouts */}
      {Platform.OS === 'web' && width >= 900 && (
        <Ionicons
          name="people-circle-outline"
          size={220}
          color="#FBCA04"
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { width: contentWidth }]}>
          <Text style={styles.title}>The Dream Team</Text>
          <Text style={styles.subtitle}>
            Tap staff to mark who is working at B2 today. Working at B2 are
            shown at the top; everyone else appears in the Staff Pool below.
            Names are always sorted alphabetically.
          </Text>

          {/* Dream Team – uses onsite/offsite styling */}
          <Text style={styles.sectionTitle}>Working at B2 (Dream Team)</Text>
          {dreamTeam.length === 0 ? (
            <Text style={styles.empty}>No staff have been selected yet.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {dreamTeam.map((s: any) => {
                const isOutOnOuting = outingStaffSet.has(String(s.id));
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

          {/* Staff Pool – visually like participant pool, but still shows “offsite” if on outing */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Staff Pool
          </Text>
          {staffPool.length === 0 ? (
            <Text style={styles.empty}>Everyone is working at B2 today.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {staffPool.map((s: any) => {
                const isOutOnOuting = outingStaffSet.has(String(s.id));
                const mode = isOutOnOuting ? 'offsite' : 'default';
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

          <View style={styles.legendRow}>
            <View style={[styles.legendDot, styles.legendOnsite]} />
            <Text style={styles.legendLabel}>Onsite at B2</Text>
            <View style={[styles.legendDot, styles.legendOffsite]} />
            <Text style={styles.legendLabel}>Out on Outing</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F0FB',
  },
  heroIcon: {
    position: 'absolute',
    right: 80,
    top: 80,
    opacity: 0.2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  inner: {
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4b164c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#5f3b73',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b164c',
    marginBottom: 8,
  },
  empty: {
    fontSize: 14,
    color: '#7b4f8f',
    fontStyle: 'italic',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
