// app/edit/dream-team.tsx
import React, { useMemo } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSchedule } from '@/hooks/schedule-store';
import type { Staff } from '@/constants/data';
import { useNotifications } from '@/hooks/notifications';
import { useIsAdmin } from '@/hooks/access-control';
import SaveExit from '@/components/SaveExit';

const PINK = '#F54FA5';
const CREAM = '#FEF3C7';

export default function DreamTeamScreen() {
  const { width, height } = useWindowDimensions();
  const isMobileWeb =
    Platform.OS === 'web' &&
    ((typeof navigator !== 'undefined' && /iPhone|Android/i.test(navigator.userAgent)) ||
      width < 900 ||
      height < 700);

  const {
    staff = [],
    workingStaff = [],
    trainingStaffToday = [],
    outingGroup = null,
    updateSchedule,
  } = useSchedule() as any;

  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const blockReadOnly = () => {
    push?.('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
  };

  const workingSet = useMemo(
    () => new Set<string>((workingStaff || []).map((id: any) => String(id))),
    [workingStaff],
  );
  const trainingSet = useMemo(
    () => new Set<string>((trainingStaffToday || []).map((id: any) => String(id))),
    [trainingStaffToday],
  );

  // ---- OUTING LOGIC PATCH (Chelsea issue) ------------------------------------
  // We only treat outing staff as "off-site" if the outing has NO time window
  const outingStaffSet = useMemo(
    () =>
      new Set<string>(
        ((outingGroup?.staffIds ?? []) as (string | number)[]).map((id) =>
          String(id),
        ),
      ),
    [outingGroup],
  );

  const hasTimedOuting =
    !!outingGroup &&
    typeof outingGroup.startTime === 'string' &&
    outingGroup.startTime.trim().length > 0 &&
    typeof outingGroup.endTime === 'string' &&
    outingGroup.endTime.trim().length > 0;

  // 🔹 Staff actually working at B2 today
  const workingList: Staff[] = useMemo(
    () =>
      (staff || [])
        .filter((s: Staff) => workingSet.has(String(s.id)))
        .slice()
        .sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), 'en-AU'),
        ),
    [staff, workingSet],
  );

  // 🔹 Staff we visually treat as "on outing / off-site" (ALL-DAY only)
  const allDayOutingStaffIds = useMemo(() => {
    if (!outingGroup || hasTimedOuting) {
      // Timed outing → they are still considered onsite in Dream Team
      return new Set<string>();
    }
    return outingStaffSet;
  }, [outingGroup, outingStaffSet, hasTimedOuting]);

  // 🔹 Staff pool = everyone not marked as working
  const staffPool: Staff[] = useMemo(
    () =>
      (staff || [])
        .filter((s: Staff) => !workingSet.has(String(s.id)))
        .slice()
        .sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), 'en-AU'),
        ),
    [staff, workingSet],
  );

  const toggleWorking = (id: string) => {
    if (readOnly) {
      blockReadOnly();
      return;
    }
    const key = String(id);
    const exists = workingSet.has(key);

    const nextWorking = exists
      ? workingStaff.filter((sId: any) => String(sId) !== key)
      : [...workingStaff, key];

    updateSchedule?.({ workingStaff: nextWorking });
  };

  const toggleTraining = (id: string) => {
    if (readOnly) {
      blockReadOnly();
      return;
    }
    const key = String(id);
    const isTraining = trainingSet.has(key);

    const nextTraining = isTraining
      ? trainingStaffToday.filter((sId: any) => String(sId) !== key)
      : [...trainingStaffToday, key];

    // Ensure training staff are also part of working staff
    const nextWorking = workingSet.has(key)
      ? workingStaff
      : [...workingStaff, key];

    updateSchedule?.({
      trainingStaffToday: nextTraining,
      workingStaff: nextWorking,
    });
  };

  const pillForStaff = (s: Staff, mode: 'working' | 'pool') => {
    const id = String(s.id);
    const isWorking = mode === 'working';
    const isTraining = trainingSet.has(id);

    const isAllDayOuting = allDayOutingStaffIds.has(id); // <-- ONLY all-day!
    const gender = String((s as any).gender || '').toLowerCase();
    const isFemale = gender === 'female';
    const isMale = gender === 'male';

    return (
      <TouchableOpacity
        key={id}
        activeOpacity={0.9}
        onPress={() => toggleWorking(id)}
        onLongPress={() => toggleTraining(id)}
        delayLongPress={350}
        style={[
          styles.staffPill,
          mode === 'working' ? styles.staffPillWorking : styles.staffPillPool,
          isTraining && styles.staffPillTraining,
          isAllDayOuting && styles.staffPillOuting,
        ]}
      >
        {/* Score bubble could be added here later if needed */}

        {/* Name + outing / training meta */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Gender dot */}
          <View
            style={[
              styles.genderDot,
              isFemale && { backgroundColor: '#fb7185' },
              isMale && { backgroundColor: '#60a5fa' },
            ]}
          />
          <Text style={styles.staffName} numberOfLines={1}>
            {s.name}
          </Text>
          {isTraining && (
            <Ionicons
              name="school-outline"
              size={14}
              color="#1e293b"
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {/* Right-hand badges */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isAllDayOuting && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Outing / off-site</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="dream-team" />

      {Platform.OS === 'web' && !isMobileWeb && (
        <Ionicons
          name="people-circle-outline"
          size={220}
          color="#FDE68A"
          style={styles.heroIcon}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.wrap}>
          <Text style={styles.heading}>The Dream Team</Text>
          <Text style={styles.subheading}>
            Tap staff to mark who is working at B2 today. Long-press a pill to
            mark staff as in training for today. Staff are sorted alphabetically.
          </Text>

          {/* WORKING AT B2 (Dream Team) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Working at B2 (Dream Team)</Text>
            <View style={styles.pillRow}>
              {workingList.length ? (
                workingList.map((s) => pillForStaff(s, 'working'))
              ) : (
                <Text style={styles.emptyText}>
                  No staff selected yet. Tap a staff member in the pool below to
                  add them to the Dream Team.
                </Text>
              )}
            </View>
          </View>

          {/* STAFF POOL */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Pool</Text>
            <View style={styles.pillRow}>
              {staffPool.length ? (
                staffPool.map((s) => pillForStaff(s, 'pool'))
              ) : (
                <Text style={styles.emptyText}>
                  Everyone is currently marked as working at B2.
                </Text>
              )}
            </View>
          </View>

          {/* LEGEND */}
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Legend</Text>
            <View style={styles.legendCard}>
              {/* Row 1 */}
              <View style={styles.legendRow}>
                <LegendDot color="#F54FA5" />
                <Text style={styles.legendLabel}>On-site at B2</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendSwatch, { borderColor: '#F97316' }]} />
                <Text style={styles.legendLabel}>On outing / off-site (all-day)</Text>
              </View>

              {/* Row 2 */}
              <View style={[styles.legendRow, { marginTop: 8 }]}>
                <LegendDot color="#bfdbfe" />
                <Text style={styles.legendLabel}>Beginner / Junior</Text>
              </View>
              <View style={styles.legendRow}>
                <LegendDot color="#a5b4fc" />
                <Text style={styles.legendLabel}>Intermediate</Text>
              </View>
              <View style={styles.legendRow}>
                <LegendDot color="#facc15" />
                <Text style={styles.legendLabel}>Senior / Experienced</Text>
              </View>

              {/* Row 3 */}
              <View style={[styles.legendRow, { marginTop: 8 }]}>
                <Ionicons
                  name="school-outline"
                  size={16}
                  color="#0f172a"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.legendLabel}>Training (long-press staff pill)</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function LegendDot({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        backgroundColor: color,
        marginRight: 6,
      }}
    />
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },
  heroIcon: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    opacity: 0.9,
    zIndex: 0,
  },
  wrap: {
    flex: 1,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#433F4C',
  },
  subheading: {
    marginTop: 4,
    fontSize: 14,
    color: '#7A7485',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  staffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'space-between',
  },
  staffPillWorking: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  staffPillPool: {
    backgroundColor: '#F1F5F9',
  },
  staffPillTraining: {
    borderColor: '#4F46E5',
  },
  staffPillOuting: {
    backgroundColor: '#FEF9C3',
    borderColor: '#F97316',
  },
  genderDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginRight: 6,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    maxWidth: 140,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FDBA74',
    marginLeft: 8,
  },
  badgeText: {
    color: '#9A3412',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  legendCard: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  legendLabel: {
    fontSize: 13,
    color: '#111827',
  },
  legendSwatch: {
    width: 18,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    marginRight: 6,
  },
});
