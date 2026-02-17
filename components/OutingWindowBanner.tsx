// components/OutingWindowBanner.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSchedule } from '@/hooks/schedule-store';

const PINK = '#F54FA5';
const DARK = '#2b2230';

function hhmmToMinutes(hhmm?: string): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function OutingWindowBanner() {
  const { outingGroup } = useSchedule(s => ({
    outingGroup: s.outingGroup,
  }));

  // keep time “live” so the banner appears/disappears without refresh
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30_000); // every 30s
    return () => clearInterval(t);
  }, []);

  const status = useMemo(() => {
    void tick;

    if (!outingGroup) return { show: false as const };

    const startM = hhmmToMinutes(outingGroup.startTime);
    const endM = hhmmToMinutes(outingGroup.endTime);

    // Only show during a valid window
    if (startM == null || endM == null) return { show: false as const };
    if (endM <= startM) return { show: false as const }; // (we can support overnight later if needed)

    const nowM = nowMinutes();
    const inWindow = nowM >= startM && nowM < endM;

    if (!inWindow) return { show: false as const };

    const name = outingGroup.name?.trim() || 'Drive / Outing';
    const pCount = outingGroup.participantIds?.length ?? 0;
    const sCount = outingGroup.staffIds?.length ?? 0;

    return {
      show: true as const,
      title: `${name} in progress`,
      sub: `${outingGroup.startTime}–${outingGroup.endTime} • ${pCount} participant${pCount === 1 ? '' : 's'} • ${sCount} staff`,
    };
  }, [outingGroup, tick]);

  if (!status.show) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        <View style={styles.iconPill}>
          <Ionicons name="car-sport" size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {status.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {status.sub}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(245,79,165,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconPill: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK,
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(43,34,48,0.65)',
  },
});
