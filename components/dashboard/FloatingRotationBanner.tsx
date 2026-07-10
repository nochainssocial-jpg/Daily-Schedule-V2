import React, { useEffect, useMemo } from "react";
import { Image, Platform, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import type { RoomKey } from "./dashboardTypes";
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
const SCROLL_KEYFRAMES_ID = "floating-rotation-banner-keyframes";

// Kept local to avoid the dashboardTheme/dashboardUtils circular runtime dependency
// that occurs when this component is rebuilt independently.
const OFFICIAL_START_MINUTES = 10 * 60;
const FLOATING_END_MINUTES = 14 * 60 + 30;
const ROOM_KEYS: RoomKey[] = ["frontRoom", "scotty", "twins"];
const ROOM_LABELS: Record<RoomKey, string> = {
  frontRoom: "Front Room",
  scotty: "Scotty",
  twins: "Twins / FSO",
};

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  let raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("-")) raw = raw.split("-")[0].trim();
  raw = raw.replace(/\s+/g, "").replace(/\./g, ":");

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3];
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;

  if (suffix === "am") {
    if (hour === 12) hour = 0;
  } else if (suffix === "pm") {
    if (hour !== 12) hour += 12;
  } else if (hour <= 6) {
    hour += 12;
  }

  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

function slotWindow(slot: any): { start: number | null; end: number | null } {
  if (!slot) return { start: null, end: null };
  const display = String(slot.displayTime || slot.display_time || "").trim();
  const displayParts = display.includes("-") ? display.split("-") : [];
  return {
    start:
      parseTimeToMinutes(slot.startTime) ??
      parseTimeToMinutes(slot.start_time) ??
      parseTimeToMinutes(displayParts[0]),
    end:
      parseTimeToMinutes(slot.endTime) ??
      parseTimeToMinutes(slot.end_time) ??
      parseTimeToMinutes(displayParts[1]),
  };
}

function minutesToTimeLabel(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function isFsoSlot(slot: any): boolean {
  const { start, end } = slotWindow(slot);
  if (start === 11 * 60 && end === 11 * 60 + 30) return true;
  if (start === 13 * 60 && end === 13 * 60 + 30) return true;

  const display = String(slot?.displayTime || slot?.display_time || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  return (
    display.includes("11:00am-11:30am") ||
    display.includes("11:00-11:30") ||
    display.includes("1:00pm-1:30pm") ||
    display.includes("13:00-13:30")
  );
}

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
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
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
  if (start < OFFICIAL_START_MINUTES) return null;
  if (start >= FLOATING_END_MINUTES) return null;

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

function FloatingStaffCard({ item }: { item: FloatingBannerAssignment }) {
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
}

function FloatingBannerRow({
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
  const scrollingAssignments = assignments.length ? [...assignments, ...assignments] : assignments;

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
          {scrollingAssignments.map((item, index) => (
            <FloatingStaffCard key={`${item.room}-${item.staffId || "empty"}-${index}`} item={item} />
          ))}
        </View>
      </View>
    </View>
  );
}

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

  if (currentMinutes < OFFICIAL_START_MINUTES) return null;
  if (currentMinutes >= FLOATING_END_MINUTES) return null;
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
        slot.start > OFFICIAL_START_MINUTES &&
        currentMinutes >= slot.start - ROTATION_PREVIEW_BEFORE_MINUTES &&
        currentMinutes < slot.start + ROTATION_PREVIEW_AFTER_MINUTES,
    ) || null;

  const minutesToNext = upNextSlot ? upNextSlot.start - currentMinutes : null;
  const upNextSubtitle = upNextSlot
    ? minutesToNext !== null && minutesToNext > 0
      ? `${upNextSlot.label} · starts in ${minutesToNext} min`
      : `${upNextSlot.label} · rotation window active`
    : "";

  return (
    <View style={styles.floatingBannerOverlay} pointerEvents="none">
      <View style={styles.floatingBannerGlassPanel}>
        <Text style={styles.floatingBannerPanelTitle}>Floating Assignments</Text>
        {upNextSlot ? (
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
