import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSchedule } from '@/hooks/schedule-store';

const PINK = '#F54FA5';
const DARK = '#2b2230';

function parseTimeToMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // Supports:
  // - "14:00"
  // - "2:00" (interpreted as 02:00 unless corrected by window heuristic below)
  // - "2:00 pm" / "2:00pm"
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(s);
  if (!m) return null;

  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ap = m[3];

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (mm < 0 || mm > 59) return null;

  if (ap) {
    // 12h clock
    if (hh < 1 || hh > 12) return null;
    if (ap === 'pm' && hh !== 12) hh += 12;
    if (ap === 'am' && hh === 12) hh = 0;
  } else {
    // 24h clock (or loose input)
    if (hh < 0 || hh > 23) return null;
  }

  return hh * 60 + mm;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function OutingWindowBanner() {
  const { outingGroup } = useSchedule((s: any) => ({ outingGroup: s.outingGroup }));

  // Keep time “live” so banner appears/disappears without refresh.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const status = useMemo(() => {
    void tick;

    if (!outingGroup) return { show: false as const };

    const startM0 = parseTimeToMinutes(outingGroup.startTime);
    let endM0 = parseTimeToMinutes(outingGroup.endTime);

    if (startM0 == null || endM0 == null) return { show: false as const };

    // Heuristic:
    // If user enters "12:00" to "2:00" they almost always mean 12pm–2pm.
    // If end is earlier than start and end < 12:00, assume end is PM (add 12h).
    let startM = startM0;
    let endM = endM0;
    if (endM <= startM && endM < 12 * 60) {
      endM += 12 * 60;
    }
    // If still invalid, don't show.
    if (endM <= startM) return { show: false as const };

    const nowM = nowMinutes();
    const inWindow = nowM >= startM && nowM < endM;
    if (!inWindow) return { show: false as const };

    const name = (outingGroup.name || '').trim() || 'Drive / Outing';
    const pCount = outingGroup.participantIds?.length ?? 0;
    const sCount = outingGroup.staffIds?.length ?? 0;

    const startLabel = outingGroup.startTime || '?';
    const endLabel = outingGroup.endTime || '?';

    return {
      show: true as const,
      title: `${name} in progress`,
      sub: `${startLabel}–${endLabel} • ${pCount} participant${pCount === 1 ? '' : 's'} • ${sCount} staff`,
    };
  }, [outingGroup, tick]);

  if (!status.show) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        <View style={styles.iconPill}>
          <Ionicons name="car-outline" size={16} color="#fff" />
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
    marginRight: 10,
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
