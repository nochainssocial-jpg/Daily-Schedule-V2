import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { ROOM_KEYS, ROOM_LABELS } from "./dashboardTheme";
import { parseTimeToMinutes, slotLabel, slotWindow } from "./dashboardUtils";

type RotationSlot = {
  slot: any;
  slotId: string;
  start: number;
  end: number;
};

const BANNER_START_MINUTES = 10 * 60;
const BANNER_END_MINUTES = 14 * 60 + 30;
const UP_NEXT_BEFORE_MINUTES = 2;
const UP_NEXT_AFTER_MINUTES = 5;

function toRotationSlots(displayTimeSlots: any[]): RotationSlot[] {
  return (displayTimeSlots || [])
    .map((slot: any, index: number) => {
      const { start, end } = slotWindow(slot);
      if (start == null || end == null || end <= start) return null;
      if (end <= BANNER_START_MINUTES || start >= BANNER_END_MINUTES) return null;
      return {
        slot,
        slotId: String(slot.id ?? index),
        start,
        end,
      };
    })
    .filter(Boolean) as RotationSlot[];
}

function staffNameForRoom(row: any, room: string, staffById: Map<string, any>): string {
  const staffId = row?.[room] ? String(row[room]) : "";
  if (!staffId) return "Unallocated";
  return String(staffById.get(staffId)?.name || staffId || "Unallocated");
}

function BannerCards({
  rotationSlot,
  floatingAssignments,
  staffById,
}: {
  rotationSlot: RotationSlot;
  floatingAssignments: any;
  staffById: Map<string, any>;
}) {
  const row = floatingAssignments?.[rotationSlot.slotId] || {};

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.72)",
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "900", color: "#4B5563" }}>{slotLabel(rotationSlot.slot)}</Text>
      </View>

      {ROOM_KEYS.map((room) => {
        const name = staffNameForRoom(row, room, staffById);
        const unallocated = name === "Unallocated";
        return (
          <View
            key={`${rotationSlot.slotId}-${room}`}
            style={{
              minWidth: 132,
              borderRadius: 14,
              backgroundColor: unallocated ? "#FEE2E2" : "#FFFFFF",
              borderWidth: 1,
              borderColor: unallocated ? "#FCA5A5" : "#E5E7EB",
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "900", color: unallocated ? "#991B1B" : "#6B7280" }}>
              {ROOM_LABELS[room]}
            </Text>
            <Text style={{ marginTop: 1, fontSize: 15, fontWeight: "900", color: unallocated ? "#991B1B" : "#111827" }}>
              {name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function BannerRow({
  label,
  rotationSlot,
  floatingAssignments,
  staffById,
}: {
  label: string;
  rotationSlot: RotationSlot;
  floatingAssignments: any;
  staffById: Map<string, any>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 2 }}>
      <View style={{ width: 72, alignItems: "flex-end" }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.28)", textShadowRadius: 2 }}>
          {label}
        </Text>
      </View>
      <BannerCards rotationSlot={rotationSlot} floatingAssignments={floatingAssignments} staffById={staffById} />
    </View>
  );
}

export function FloatingRotationBanner({
  displayTimeSlots,
  floatingAssignments,
  staffById,
  currentMinutes,
}: {
  displayTimeSlots: any[];
  floatingAssignments: any;
  staffById: Map<string, any>;
  currentMinutes: number;
}) {
  const animated = useRef(new Animated.Value(0)).current;

  const { currentSlot, upNextSlot } = useMemo(() => {
    const slots = toRotationSlots(displayTimeSlots);
    if (!slots.length || currentMinutes < BANNER_START_MINUTES || currentMinutes > BANNER_END_MINUTES) {
      return { currentSlot: null as RotationSlot | null, upNextSlot: null as RotationSlot | null };
    }

    const current =
      slots.find((entry) => currentMinutes >= entry.start && currentMinutes < entry.end) ||
      slots.find((entry) => currentMinutes < entry.start) ||
      slots[slots.length - 1];

    const upNext = slots.find(
      (entry) =>
        currentMinutes >= entry.start - UP_NEXT_BEFORE_MINUTES &&
        currentMinutes <= entry.start + UP_NEXT_AFTER_MINUTES,
    ) || null;

    return { currentSlot: current, upNextSlot: upNext };
  }, [currentMinutes, displayTimeSlots]);

  useEffect(() => {
    animated.setValue(0);
    const animation = Animated.loop(
      Animated.timing(animated, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [animated, currentSlot?.slotId, upNextSlot?.slotId]);

  if (!currentSlot) return null;

  const translateX = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -360],
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: "20%",
        right: "20%",
        bottom: 10,
        minHeight: upNextSlot ? 94 : 54,
        overflow: "hidden",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          transform: [{ translateX }],
        }}
      >
        {[0, 1, 2].map((copy) => (
          <View key={copy} style={{ minWidth: 720 }}>
            {upNextSlot ? (
              <BannerRow label="UP NEXT" rotationSlot={upNextSlot} floatingAssignments={floatingAssignments} staffById={staffById} />
            ) : null}
            <BannerRow label="NOW" rotationSlot={currentSlot} floatingAssignments={floatingAssignments} staffById={staffById} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
