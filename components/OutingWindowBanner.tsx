import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSchedule } from "@/hooks/schedule-store";
import { getSydneyMinutesSinceMidnight } from "@/lib/sydneyDate";

const PINK = "#F54FA5";
const PURPLE = "#7C3AED";
const DARK = "#2b2230";

type OutingGroup = {
  id?: string;
  name?: string;
  staffIds?: string[];
  participantIds?: string[];
  startTime?: string;
  endTime?: string;
};

function parseTimeToMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(s);
  if (!m) return null;

  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ap = m[3];

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (mm < 0 || mm > 59) return null;

  if (ap) {
    if (hh < 1 || hh > 12) return null;
    if (ap === "pm" && hh !== 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
  } else if (hh < 0 || hh > 23) {
    return null;
  }

  return hh * 60 + mm;
}

function nowMinutes(): number {
  return getSydneyMinutesSinceMidnight();
}

function getActiveOutingStatus(outingGroup: OutingGroup, index: number) {
  const startM0 = parseTimeToMinutes(outingGroup.startTime);
  const endM0 = parseTimeToMinutes(outingGroup.endTime);

  if (startM0 == null || endM0 == null) return null;

  let startM = startM0;
  let endM = endM0;
  if (endM <= startM && endM < 12 * 60) {
    endM += 12 * 60;
  }
  if (endM <= startM) return null;

  const nowM = nowMinutes();
  const inWindow = nowM >= startM && nowM < endM;
  if (!inWindow) return null;

  const name = (outingGroup.name || "").trim() || `Drive / Outing ${index + 1}`;
  const pCount = outingGroup.participantIds?.length ?? 0;
  const sCount = outingGroup.staffIds?.length ?? 0;
  const startLabel = outingGroup.startTime || "?";
  const endLabel = outingGroup.endTime || "?";

  return {
    id: outingGroup.id || `outing-${index + 1}`,
    title: `${name} in progress`,
    sub: `${startLabel}–${endLabel} • ${pCount} participant${pCount === 1 ? "" : "s"} • ${sCount} staff`,
    isSecond: index === 1,
  };
}

export default function OutingWindowBanner() {
  const { outingGroups = [], maybeAutoResetOutings } = useSchedule((s: any) => ({
    outingGroups: s.outingGroups || (s.outingGroup ? [s.outingGroup] : []),
    maybeAutoResetOutings: s.maybeAutoResetOutings,
  }));

  const [tick, setTick] = useState(0);
  useEffect(() => {
    void maybeAutoResetOutings?.();

    const t = setInterval(() => {
      setTick((x) => x + 1);
      void maybeAutoResetOutings?.();
    }, 30_000);

    return () => clearInterval(t);
  }, [maybeAutoResetOutings]);

  const activeOutings = useMemo(() => {
    void tick;
    return outingGroups
      .slice(0, 2)
      .map((outingGroup: OutingGroup, index: number) =>
        getActiveOutingStatus(outingGroup, index),
      )
      .filter(Boolean);
  }, [outingGroups, tick]);

  if (activeOutings.length === 0) return null;

  return (
    <View style={styles.root}>
      <View style={styles.stack}>
        {activeOutings.map((status: any) => (
          <View
            key={status.id}
            style={[styles.banner, status.isSecond && styles.bannerSecond]}
          >
            <View
              style={[
                styles.iconPill,
                status.isSecond && styles.iconPillSecond,
              ]}
            >
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
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 92,
    left: 24,
    right: 24,
    zIndex: 150,
    alignItems: "center",
    pointerEvents: "none",
  },
  stack: {
    width: "100%",
    maxWidth: 720,
    gap: 8,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "rgba(245,79,165,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    width: "100%",
  },
  bannerSecond: {
    borderColor: "rgba(124,58,237,0.35)",
  },
  iconPill: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconPillSecond: {
    backgroundColor: PURPLE,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: DARK,
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b5b72",
    fontWeight: "600",
  },
});
