import React, { memo, useMemo } from "react";
import { Image, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { DASHBOARD_OPERATIONAL_TIMES, ROOM_KEYS, ROOM_LABELS } from "./dashboardTheme";
import type { RoomKey } from "./dashboardTypes";
import { minutesToTimeLabel, slotWindow } from "./dashboardUtils";
import { STAFF_PHOTO_ASSETS, type StaffPhotoKey } from "./staffPhotoAssets";
import { styles } from "./dashboardStyles";
import {
  buildFloatingDisplayContext,
  resolveFloatingCellState,
  type FloatingCellVariant,
} from "./floatingDisplayLogic";

type FloatingBannerAssignment = {
  room: RoomKey;
  roomLabel: string;
  isFso: boolean;
  staffId: string | null;
  staffName: string;
  photoSource: ImageSourcePropType | null;
  initials: string;
  variant: FloatingCellVariant;
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
  participantsById: Map<string, any>;
  attendingParticipants: any[];
  activeOutings?: any[];
};

const ROTATION_PREVIEW_BEFORE_MINUTES = 3;

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

function buildSlotAssignments({
  slot,
  index,
  floatingAssignments,
  staffById,
  displayContext,
}: {
  slot: any;
  index: number;
  floatingAssignments: any;
  staffById: Map<string, any>;
  displayContext: ReturnType<typeof buildFloatingDisplayContext>;
}): FloatingBannerSlot | null {
  const { start, end } = slotWindow(slot);
  if (start == null || end == null || end <= start) return null;
  if (start < DASHBOARD_OPERATIONAL_TIMES.officialStart) return null;
  if (start >= DASHBOARD_OPERATIONAL_TIMES.floatingEnds) return null;

  const slotId = String(slot.id ?? index);
  const row = floatingAssignments?.[slotId] || {};

  const assignments = ROOM_KEYS.map((room) => {
    const cell = resolveFloatingCellState({
      room,
      slot,
      row,
      staffById,
      context: displayContext,
    });
    const staffName = cell.label;

    return {
      room,
      roomLabel:
        room === "twins"
          ? cell.showFso
            ? "Twins (FSO)"
            : "Twins"
          : ROOM_LABELS[room],
      isFso: cell.showFso,
      staffId: cell.staffId,
      staffName,
      photoSource:
        cell.variant === "normal" && cell.staffPerson
          ? getStaffPhotoSource(cell.staffPerson)
          : null,
      initials: staffInitials(staffName),
      variant: cell.variant,
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
    <View
      style={[
        styles.floatingBannerStaffCard,
        item.variant === "offsite" ? styles.floatingBannerStaffCardOffsite : null,
        item.variant === "notAttending"
          ? styles.floatingBannerStaffCardNotAttending
          : null,
      ]}
    >
      <View style={styles.floatingBannerAvatarWrap}>
        {item.photoSource ? (
          <Image source={item.photoSource} style={styles.floatingBannerAvatar} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.floatingBannerInitialsAvatar,
              item.variant === "offsite"
                ? styles.floatingBannerInitialsAvatarOffsite
                : null,
              item.variant === "notAttending"
                ? styles.floatingBannerInitialsAvatarNotAttending
                : null,
            ]}
          >
            <Text style={styles.floatingBannerInitialsText}>{item.initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.floatingBannerStaffTextBlock}>
        <Text
          style={[
            styles.floatingBannerStaffName,
            item.variant === "offsite" ? styles.floatingBannerStaffNameOffsite : null,
            item.variant === "notAttending"
              ? styles.floatingBannerStaffNameNotAttending
              : null,
          ]}
          numberOfLines={1}
        >
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

      <View style={styles.floatingBannerAssignmentsGrid}>
        {assignments.map((item) => (
          <FloatingStaffCard
            key={`${item.room}-${item.staffId || "empty"}`}
            item={item}
          />
        ))}
      </View>
    </View>
  );
});

export function FloatingRotationBanner({
  displayTimeSlots,
  floatingAssignments,
  staffById,
  currentMinutes,
  participantsById,
  attendingParticipants,
  activeOutings = [],
}: Props) {
  const displayContext = useMemo(
    () =>
      buildFloatingDisplayContext({
        participantsById,
        attendingParticipants,
        activeOutings,
      }),
    [participantsById, attendingParticipants, activeOutings],
  );

  const slots = useMemo(() => {
    return (displayTimeSlots || [])
      .map((slot, index) =>
        buildSlotAssignments({
          slot,
          index,
          floatingAssignments,
          staffById,
          displayContext,
        }),
      )
      .filter(Boolean) as FloatingBannerSlot[];
  }, [displayTimeSlots, floatingAssignments, staffById, displayContext]);

  if (currentMinutes < DASHBOARD_OPERATIONAL_TIMES.officialStart) return null;
  if (currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.floatingEnds) return null;
  if (!slots.length) return null;

  const activeIndex = slots.findIndex(
    (slot) => currentMinutes >= slot.start && currentMinutes < slot.end,
  );
  if (activeIndex < 0) return null;

  // Keep the banner's On Now row locked to the same slot highlighted in the table.
  const currentSlot = slots[activeIndex];

  // Only preview a genuinely future slot. Once it starts, it becomes On Now immediately.
  const upNextSlot =
    slots.find(
      (slot) =>
        slot.start > currentMinutes &&
        currentMinutes >= slot.start - ROTATION_PREVIEW_BEFORE_MINUTES,
    ) || null;

  const minutesToNext = upNextSlot ? upNextSlot.start - currentMinutes : null;
  const upNextSubtitle =
    upNextSlot && minutesToNext !== null && minutesToNext > 0
      ? `${upNextSlot.label} · starts in ${minutesToNext} min`
      : "";
  const showUpNext =
    upNextSlot !== null && upNextSlot.start > DASHBOARD_OPERATIONAL_TIMES.officialStart;

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
