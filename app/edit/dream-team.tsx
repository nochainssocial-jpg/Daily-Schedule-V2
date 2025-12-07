// app/edit/dream-team.tsx
// Edit screen for working staff (Dream Team) with staff pool.
// Integrates with outings + training + live ratings from Supabase.

import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

import SaveExit from '@/components/SaveExit';
import { useSchedule } from '@/hooks/schedule-store';
import { STAFF as STATIC_STAFF } from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import Chip from '@/components/Chip';
import { supabase } from '@/lib/supabase';

type ID = string;

const STAFF_SCORE_KEYS: Array<keyof any> = [
  'experience_level',
  'behaviour_capability',
  'personal_care_skill',
  'mobility_assistance',
  'communication_support',
  'reliability_rating',
];

function getStaffScore(row: any): number {
  if (!row) return 0;
  return STAFF_SCORE_KEYS.reduce((sum, key) => {
    const raw = (row as any)?.[key];
    const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
}

function getScoreBand(score: number): 'none' | 'junior' | 'mid' | 'senior' {
  if (!score || score <= 0) return 'none';
  if (score >= 15) return 'senior';
  if (score >= 9) return 'mid';
  return 'junior';
}

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
    trainingStaffToday = [],
    outingGroup,
    updateSchedule,
  } = useSchedule() as any;

  // Base staff list from snapshot or static fallback
  const baseStaffSource =
    (Array.isArray(scheduleStaff) && scheduleStaff.length
      ? scheduleStaff
      : STATIC_STAFF) || [];

  // Live ratings from Supabase – keyed by staff id / legacy_id / name
  const [ratingLookup, setRatingLookup] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadRatings() {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select(
            'id,legacy_id,name,experience_level,behaviour_capability,personal_care_skill,mobility_assistance,communication_support,reliability_rating',
          );

        if (error || !data || cancelled) return;

        const map: Record<string, any> = {};
        (data as any[]).forEach((row) => {
          if (!row) return;

          const uuidKey = row.id ? String(row.id) : null;
          const legacyKey = row.legacy_id ? String(row.legacy_id) : null;
          const nameKey =
            row.name && typeof row.name === 'string'
              ? `name:${row.name.toLowerCase()}`
              : null;

          if (uuidKey) map[uuidKey] = row;
          if (legacyKey) map[legacyKey] = row;
          if (nameKey) map[nameKey] = row;
        });

        if (!cancelled) {
          setRatingLookup(map);
        }
      } catch (e) {
        console.warn('[dream-team] failed to load staff ratings', e);
      }
    }

    loadRatings();

    return () => {
      cancelled = true;
    };
  }, []);

  const staffSource = baseStaffSource;

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

  const trainingSet = useMemo(
    () =>
      new Set<string>((trainingStaffToday as ID[]).map((id) => String(id))),
    [trainingStaffToday],
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
      sortByName(allStaff.filter((s: any) => !workingSet.has(String(s.id)))),
    [allStaff, workingSet],
  );

  const outingStaffSet = useMemo(() => {
    const ids = ((outingGroup?.staffIds ?? []) as (string | number)[]).map(
      (raw) => String(raw),
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

  const toggleTraining = (id: ID) => {
    if (readOnly) {
      push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
      return;
    }

    const key = String(id);
    const next = new Set<string>(Array.from(trainingSet));

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    updateSchedule?.({ trainingStaffToday: Array.from(next) });
    push?.('Training status updated', 'dream-team');
  };

  const contentWidth = Math.min(width - 32, 880);

  const renderStaffChip = (s: any, inDreamTeam: boolean) => {
    const id = String(s.id);
    const isOutOnOuting = outingStaffSet.has(id);
    const isTraining = trainingSet.has(id);

    const nameKey = `name:${String(s.name || '').toLowerCase()}`;
    const ratingSource = ratingLookup[id] ?? ratingLookup[nameKey] ?? s;

    const score = getStaffScore(ratingSource);
    const band = getScoreBand(score);
    const showScore = score > 0;

    const mode = (
      isTraining
        ? 'training'
        : isOutOnOuting
        ? 'offsite'
        : inDreamTeam
        ? 'onsite'
        : 'default'
    ) as any;

    const leftAddon = showScore ? (
      <View
        style={[
          styles.scoreCircle,
          band === 'senior' && styles.scoreCircleSenior,
          band === 'mid' && styles.scoreCircleMid,
          band === 'junior' && styles.scoreCircleJunior,
        ]}
      >
        <Text style={styles.scoreText}>{score}</Text>
      </View>
    ) : null;

    let rightAddon: React.ReactNode = null;
    if (isTraining) {
      rightAddon = (
        <MaterialCommunityIcons
          name="account-supervisor"
          size={22}
          color="#1C5F87"
        />
      );
    } else if (band === 'senior') {
      rightAddon = (
        <MaterialCommunityIcons
          name="account-star"
          size={22}
          color="#FBBF24"
        />
      );
    }

    return (
      <Chip
        key={s.id}
        label={s.name}
        mode={mode}
        leftAddon={leftAddon}
        rightAddon={rightAddon}
        onPress={() => toggleStaff(s.id as ID)}
        onLongPress={() => toggleTraining(s.id as ID)}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="dreamTeam" />

      {Platform.OS === 'web' && width >= 900 && (
        <View pointerEvents="none" style={styles.heroIcon}>
          <Ionicons name="people-circle-outline" size={260} color="#ffd5b4" />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { width: contentWidth }]}>
          <Text style={styles.title}>The Dream Team</Text>
          <Text style={styles.subtitle}>
            Tap staff to mark who is working at B2 today. Working at B2 are
            shown at the top; everyone else appears in the Staff Pool below.
            Names are always sorted alphabetically.
          </Text>

          <Text style={styles.sectionTitle}>Working at B2 (Dream Team)</Text>
          {dreamTeam.length === 0 ? (
            <Text style={styles.empty}>No staff have been selected yet.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {dreamTeam.map((s: any) => renderStaffChip(s, true))}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Staff Pool
          </Text>
          {staffPool.length === 0 ? (
            <Text style={styles.empty}>Everyone is working at B2 today.</Text>
          ) : (
            <View style={styles.chipGrid}>
              {staffPool.map((s: any) => renderStaffChip(s, false))}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 32 }]}>\n            Legend\n          </Text>\n\n          {/* Legend: match Participants onsite/outing, plus rating + icon explainer */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendOnsite]} />
              <Text style={styles.legendLabel}>On-Site at B2</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendOffsite]} />
              <Text style={styles.legendLabel}>On Outing / Off-Site</Text>
            </View>
          </View>

          <View style={[styles.legend, { marginTop: 12 }]}>
            <View style={styles.legendItem}>
              <View style={[styles.scoreCircle, styles.scoreCircleJunior]} />
              <Text style={styles.legendLabel}>Beginner / Junior</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.scoreCircle, styles.scoreCircleMid]} />
              <Text style={styles.legendLabel}>Intermediate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.scoreCircle, styles.scoreCircleSenior]} />
              <Text style={styles.legendLabel}>
                Senior / Experienced
              </Text>
            </View>
          </View>

          <View style={[styles.legend, { marginTop: 12 }]}>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons
                name="account-supervisor"
                size={22}
                color="#1C5F87"
              />
              <Text style={styles.legendLabel}>
                Training
              </Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons
                name="account-star"
                size={22}
                color="#FBBF24"
              />
              <Text style={styles.legendLabel}>Senior</Text>
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
    backgroundColor: '#fcf2d8',
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
    marginBottom: 16,
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
  scoreCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  scoreCircleJunior: {
    backgroundColor: '#BFDBFE',
  },
  scoreCircleMid: {
    backgroundColor: '#FDE68A',
  },
  scoreCircleSenior: {
    backgroundColor: '#C4B5FD',
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
    flexWrap: 'wrap',
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
