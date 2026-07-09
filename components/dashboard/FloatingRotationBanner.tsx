import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { ROOM_KEYS, ROOM_LABELS } from "./dashboardTheme";
import { slotLabel, slotWindow } from "./dashboardUtils";

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
const MARQUEE_WIDTH = 980;

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

function readableTextColor(hex?: string) {
  if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) return "#111827";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 168 ? "#111827" : "#FFFFFF";
}

function staffForRoom(row: any, room: string, staffById: Map<string, any>) {
  const staffId = row?.[room] ? String(row[room]) : "";
  const staff = staffId ? staffById.get(staffId) : null;
  const name = staff ? String(staff.name || staffId) : staffId || "Unallocated";
  const color = staff?.color || "#FFFFFF";
  return { name, color, textColor: readableTextColor(color), unallocated: !staffId || name === "Unallocated" };
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
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          minWidth: 82,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.72)",
          backgroundColor: "rgba(255,255,255,0.14)",
          paddingHorizontal: 10,
          paddingVertical: 6,
          marginRight: 8,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "900",
            color: "#FFFFFF",
            textAlign: "center",
            textShadowColor: "rgba(0,0,0,0.35)",
            textShadowRadius: 2,
          }}
        >
          {slotLabel(rotationSlot.slot)}
        </Text>
      </View>

      {ROOM_KEYS.map((room) => {
        const staff = staffForRoom(row, room, staffById);
        const backgroundColor = staff.unallocated ? "#FEE2E2" : staff.color;
        const textColor = staff.unallocated ? "#991B1B" : staff.textColor;
        return (
          <View
            key={`${rotationSlot.slotId}-${room}`}
            style={{
              minWidth: 136,
              borderRadius: 16,
              backgroundColor,
              borderWidth: 1,
              borderColor: staff.unallocated ? "#FCA5A5" : "rgba(255,255,255,0.68)",
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginRight: 8,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.16,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 10,
                fontWeight: "900",
                color: textColor,
                opacity: staff.unallocated ? 1 : 0.82,
                textTransform: "uppercase",
              }}
            >
              {ROOM_LABELS[room]}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                marginTop: 1,
                fontSize: 16,
                fontWeight: "900",
                color: textColor,
              }}
            >
              {staff.name}
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
  isUpNext,
}: {
  label: string;
  rotationSlot: RotationSlot;
  floatingAssignments: any;
  staffById: Map<string, any>;
  isUpNext?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 3 }}>
      <View
        style={{
          width: 82,
          alignItems: "center",
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isUpNext ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.5)",
          backgroundColor: isUpNext ? "rgba(124,58,237,0.32)" : "rgba(17,24,39,0.2)",
          paddingVertical: 6,
          marginRight: 8,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "900",
            color: "#FFFFFF",
            letterSpacing: 0.6,
            textShadowColor: "rgba(0,0,0,0.38)",
            textShadowRadius: 2,
          }}
        >
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
        duration: 24000,
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
    outputRange: [0, -MARQUEE_WIDTH],
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: "20%",
        right: "20%",
        bottom: 12,
        minHeight: upNextSlot ? 104 : 58,
        overflow: "hidden",
        justifyContent: "center",
        backgroundColor: "transparent",
      }}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          transform: [{ translateX }],
        }}
      >
        {[0, 1, 2].map((copy) => (
          <View key={copy} style={{ minWidth: MARQUEE_WIDTH, paddingRight: 18 }}>
            {upNextSlot ? (
              <BannerRow
                label="UP NEXT"
                rotationSlot={upNextSlot}
                floatingAssignments={floatingAssignments}
                staffById={staffById}
                isUpNext
              />
            ) : null}
            <BannerRow label="NOW" rotationSlot={currentSlot} floatingAssignments={floatingAssignments} staffById={staffById} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
