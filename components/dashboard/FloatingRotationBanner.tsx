import React, { memo, useEffect, useMemo } from "react";
import { Image, Platform, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { DASHBOARD_OPERATIONAL_TIMES, ROOM_KEYS, ROOM_LABELS } from "./dashboardTheme";
import type { RoomKey } from "./dashboardTypes";
import { isFsoSlot, minutesToTimeLabel, slotWindow } from "./dashboardUtils";
import { STAFF_PHOTO_ASSETS, type StaffPhotoKey } from "./staffPhotoAssets";
import { styles } from "./dashboardStyles";

type FloatingBannerAssignment = {
  room: RoomKey;
  roomLabel: string;
  isFso: boolean;
  staffId: string | null;
  staffName: string;
  photoSource: ImageSourcePropType | null;
  initials: string;
};

type FloatingBannerSlot = {
  slotId: string;
  start: number;
  end: number;
  label: string;
  assignments: FloatingBannerAssignment[];
};

type Props = {
  displayTimeSlots: any[];
  floatingAssignments: any;
  staffById: Map<string, any>;
  currentMinutes: number;
};

const ROTATION_PREVIEW_BEFORE_MINUTES = 2;
const ROTATION_PREVIEW_AFTER_MINUTES = 5;
const FIRST_UP_NEXT_DISPLAY_MINUTES = 10 * 60 + 30;
const SCROLL_KEYFRAMES_ID = "floating-rotation-banner-keyframes";

function staffInitials(name: string): string {
  const parts = String(name || "")
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "—";
}

function normalisePhotoKey(name?: string | null): StaffPhotoKey | null {
  const raw = String(name || "").trim();
  if (!raw) return null;

  const candidates = [
    raw,
    raw.replace(/\s*\([^)]*\)\s*/g, "").trim(),
    raw.match(/\(([^)]*)\)/)?.[1]?.trim() || "",
    raw.split(/\s+/)[0],
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate in STAFF_PHOTO_ASSETS) return candidate as StaffPhotoKey;
  }

  // Common display aliases used in the live staff table.
  if (/liya/i.test(raw)) return "Liya";
  if (/tema|temalesi/i.test(raw)) return "Tema";
  if (/juliette|juliet/i.test(raw)) return "Juliet";

  return null;
}

function getStaffPhotoSource(person: any): ImageSourcePropType | null {
  const key = normalisePhotoKey(person?.name);
  return key ? STAFF_PHOTO_ASSETS[key] || null : null;
}

function injectScrollingKeyframes() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById(SCROLL_KEYFRAMES_ID)) return;

  const style = document.createElement("style");
  style.id = SCROLL_KEYFRAMES_ID;
  style.innerHTML = `
    @keyframes floatingRotationBannerScroll {
      0% { transform: translate3d(0, 0, 0); }
      100% { transform: translate3d(-50%, 0, 0); }
    }
  `;
  document.head.appendChild(style);
}

function buildSlotAssignments({
  slot,
  index,
  floatingAssignments,
  staffById,
}: {
  slot: any;
  index: number;
  floatingAssignments: any;
  staffById: Map<string, any>;
}): FloatingBannerSlot | null {
  const { start, end } = slotWindow(slot);
  if (start == null || end == null || end <= start) return null;
  if (start < DASHBOARD_OPERATIONAL_TIMES.officialStart) return null;
  if (start >= DASHBOARD_OPERATIONAL_TIMES.floatingEnds) return null;

  const slotId = String(slot.id ?? index);
  const row = floatingAssignments?.[slotId] || {};

  const assignments = ROOM_KEYS.map((room) => {
    const staffId = row?.[room] ? String(row[room]) : null;
    const person = staffId ? staffById.get(staffId) : null;
    const staffName = person?.name ? String(person.name) : "Unassigned";
    const fso = room === "twins" && isFsoSlot(slot);

    return {
      room,
      roomLabel: room === "twins" ? (fso ? "Twins (FSO)" : "Twins") : ROOM_LABELS[room],
      isFso: fso,
      staffId,
      staffName,
      photoSource: person ? getStaffPhotoSource(person) : null,
      initials: staffInitials(staffName),
    };
  });

  return {
    slotId,
    start,
    end,
    label: `${minutesToTimeLabel(start)} – ${minutesToTimeLabel(end)}`,
    assignments,
  };
}

const FloatingStaffCard = memo(function FloatingStaffCard({ item }: { item: FloatingBannerAssignment }) {
  return (
    <View style={styles.floatingBannerStaffCard}>
      <View style={styles.floatingBannerAvatarWrap}>
        {item.photoSource ? (
          <Image source={item.photoSource} style={styles.floatingBannerAvatar} resizeMode="cover" />
        ) : (
          <View style={styles.floatingBannerInitialsAvatar}>
            <Text style={styles.floatingBannerInitialsText}>{item.initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.floatingBannerStaffTextBlock}>
        <Text style={styles.floatingBannerStaffName} numberOfLines={1}>
          {item.staffName}
        </Text>
        <Text style={styles.floatingBannerRoomName} numberOfLines={1}>
          {item.roomLabel}
        </Text>
      </View>
    </View>
  );
});

const FloatingBannerRow = memo(function FloatingBannerRow({
  title,
  subtitle,
  assignments,
  variant,
}: {
  title: string;
  subtitle: string;
  assignments: FloatingBannerAssignment[];
  variant: "upNext" | "current";
}) {
  const assignmentKey = assignments
    .map((item) => `${item.room}:${item.staffId || "empty"}:${item.staffName}`)
    .join("|");

  const renderAssignmentGroup = (copy: "primary" | "duplicate") => (
    <View
      key={`${copy}-${assignmentKey}`}
      style={[
        styles.floatingBannerScrollerGroup,
        Platform.OS === "web" ? (styles.floatingBannerScrollerGroupWeb as any) : null,
      ]}
      aria-hidden={copy === "duplicate" ? true : undefined}
    >
      {assignments.map((item) => (
        <FloatingStaffCard
          key={`${copy}-${item.room}-${item.staffId || "empty"}`}
          item={item}
        />
      ))}
    </View>
  );

  return (
    <View
      style={[
        styles.floatingBannerRow,
        variant === "upNext" ? styles.floatingBannerRowUpNext : styles.floatingBannerRowCurrent,
      ]}
    >
      <View
        style={[
          styles.floatingBannerRowLabelBlock,
          variant === "upNext"
            ? styles.floatingBannerRowLabelBlockUpNext
            : styles.floatingBannerRowLabelBlockCurrent,
        ]}
      >
        <Text
          style={[
            styles.floatingBannerRowTitle,
            variant === "upNext"
              ? styles.floatingBannerRowTitleUpNext
              : styles.floatingBannerRowTitleCurrent,
          ]}
        >
          {title}
        </Text>
        <Text style={styles.floatingBannerRowSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.floatingBannerScrollerWindow}>
        <View
          style={[
            styles.floatingBannerScrollerTrack,
            Platform.OS === "web" ? (styles.floatingBannerScrollerTrackWeb as any) : null,
          ]}
        >
          {renderAssignmentGroup("primary")}
          {renderAssignmentGroup("duplicate")}
        </View>
      </View>
    </View>
  );
});

export function FloatingRotationBanner({
  displayTimeSlots,
  floatingAssignments,
  staffById,
  currentMinutes,
}: Props) {
  useEffect(() => {
    injectScrollingKeyframes();
  }, []);

  const slots = useMemo(() => {
    return (displayTimeSlots || [])
      .map((slot, index) =>
        buildSlotAssignments({ slot, index, floatingAssignments, staffById }),
      )
      .filter(Boolean) as FloatingBannerSlot[];
  }, [displayTimeSlots, floatingAssignments, staffById]);

  if (currentMinutes < DASHBOARD_OPERATIONAL_TIMES.officialStart) return null;
  if (currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.floatingEnds) return null;
  if (!slots.length) return null;

  const activeIndex = slots.findIndex(
    (slot) => currentMinutes >= slot.start && currentMinutes < slot.end,
  );
  if (activeIndex < 0) return null;

  const activeSlot = slots[activeIndex];
  const previousSlot = activeIndex > 0 ? slots[activeIndex - 1] : null;
  const activeSlotStillSettling =
    currentMinutes >= activeSlot.start &&
    currentMinutes < activeSlot.start + ROTATION_PREVIEW_AFTER_MINUTES &&
    previousSlot !== null;
  const currentSlot = activeSlotStillSettling ? previousSlot : activeSlot;

  const upNextSlot =
    slots.find(
      (slot) =>
        currentMinutes >= slot.start - ROTATION_PREVIEW_BEFORE_MINUTES &&
        currentMinutes < slot.start + ROTATION_PREVIEW_AFTER_MINUTES,
    ) || null;

  const minutesToNext = upNextSlot ? upNextSlot.start - currentMinutes : null;
  const upNextSubtitle =
    upNextSlot && minutesToNext !== null && minutesToNext > 0
      ? `${upNextSlot.label} · starts in ${minutesToNext} min`
      : "";
  const showUpNext =
    currentMinutes >= FIRST_UP_NEXT_DISPLAY_MINUTES && upNextSlot !== null;

  return (
    <View style={styles.floatingBannerOverlay} pointerEvents="none">
      <View style={styles.floatingBannerGlassPanel}>
        <Text style={styles.floatingBannerPanelTitle}>Floating Assignments</Text>
        {showUpNext && upNextSlot ? (
          <FloatingBannerRow
            title="Up Next"
            subtitle={upNextSubtitle}
            assignments={upNextSlot.assignments}
            variant="upNext"
          />
        ) : null}
        <FloatingBannerRow
          title="On Now"
          subtitle={currentSlot.label}
          assignments={currentSlot.assignments}
          variant="current"
        />
      </View>
    </View>
  );
}
