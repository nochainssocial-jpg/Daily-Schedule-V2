import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ROOM_KEYS, ROOM_LABELS } from "./dashboardTheme";
import {
  isCurrentSlot,
  isFsoSlot,
  parseTimeToMinutes,
  slotLabel,
  slotWindow,
} from "./dashboardUtils";
import { styles } from "./dashboardStyles";

type RoomKey = "frontRoom" | "scotty" | "twins";

type CellState = {
  label: string;
  variant: "normal" | "empty" | "offsite" | "notAttending";
  showFso: boolean;
};

const ROOM_PARTICIPANT_NAMES: Record<RoomKey, string[]> = {
  frontRoom: ["Paul", "Jessica", "Naveed", "Tiffany", "Sumera", "Jacob"],
  scotty: ["Scott"],
  twins: ["Zara", "Zoya"],
};

function getOutingWindowMinutes(outing: any): { start: number | null; end: number | null } {
  const start = parseTimeToMinutes(outing?.startTime);
  const end = parseTimeToMinutes(outing?.endTime);
  if (start == null || end == null || end <= start) {
    return { start: null, end: null };
  }
  return { start, end };
}

function timesOverlap(
  firstStart: number | null,
  firstEnd: number | null,
  secondStart: number | null,
  secondEnd: number | null,
): boolean {
  if (firstStart == null || firstEnd == null) return false;
  if (secondStart == null || secondEnd == null) return false;
  return firstStart < secondEnd && secondStart < firstEnd;
}

function getOutingIdsForSlot(
  slot: any,
  outings: any[],
  key: "staffIds" | "participantIds",
): Set<string> {
  const ids = new Set<string>();
  const window = slotWindow(slot);

  (outings || []).forEach((outing) => {
    const outingWindow = getOutingWindowMinutes(outing);

    // If no valid outing time is entered, treat it as all-day offsite.
    const overlaps =
      outingWindow.start == null || outingWindow.end == null
        ? true
        : timesOverlap(window.start, window.end, outingWindow.start, outingWindow.end);

    if (!overlaps) return;

    ((outing?.[key] ?? []) as any[]).forEach((id) => ids.add(String(id)));
  });

  return ids;
}

function buildParticipantGroups(participantsById: Map<string, any>): Record<RoomKey, string[]> {
  const idByName = new Map<string, string>();

  participantsById.forEach((participant, id) => {
    const name = String(participant?.name || "").trim().toLowerCase();
    if (name) idByName.set(name, String(id));
  });

  const pick = (names: string[]) =>
    names
      .map((name) => idByName.get(name.trim().toLowerCase()))
      .filter(Boolean) as string[];

  return {
    frontRoom: pick(ROOM_PARTICIPANT_NAMES.frontRoom),
    scotty: pick(ROOM_PARTICIPANT_NAMES.scotty),
    twins: pick(ROOM_PARTICIPANT_NAMES.twins),
  };
}

export function FloatingAssignmentsPanel({
  displayTimeSlots,
  floatingAssignments,
  staffById,
  participantsById,
  attendingParticipants,
  activeOutings,
  tick,
}: {
  displayTimeSlots: any[];
  floatingAssignments: any;
  staffById: Map<string, any>;
  participantsById: Map<string, any>;
  attendingParticipants: any[];
  activeOutings: any[];
  tick: number;
}) {
  const participantGroups = useMemo(
    () => buildParticipantGroups(participantsById),
    [participantsById],
  );

  const attendingSet = useMemo(
    () => new Set<string>((attendingParticipants || []).map(String)),
    [attendingParticipants],
  );

  const roomNotAttending = useMemo(() => {
    const check = (room: RoomKey) => {
      const ids = participantGroups[room] || [];
      return ids.length > 0 && ids.every((id) => !attendingSet.has(String(id)));
    };

    return {
      frontRoom: check("frontRoom"),
      scotty: check("scotty"),
      twins: check("twins"),
    } as Record<RoomKey, boolean>;
  }, [participantGroups, attendingSet]);

  const isRoomOffsiteForSlot = (room: RoomKey, slot: any): boolean => {
    const ids = participantGroups[room] || [];
    if (!ids.length) return false;

    const attendingRoomIds = ids.filter((id) => attendingSet.has(String(id)));
    if (!attendingRoomIds.length) return false;

    const outingParticipantIds = getOutingIdsForSlot(slot, activeOutings, "participantIds");
    const offsiteCount = attendingRoomIds.filter((id) =>
      outingParticipantIds.has(String(id)),
    ).length;
    const onsiteCount = attendingRoomIds.length - offsiteCount;

    // Mirror the edit Floating screen: a room is offsite only when all attending
    // participants in that room are on the outing during this time slot.
    return offsiteCount > 0 && onsiteCount === 0;
  };

  const isStaffOffsiteForSlot = (slot: any, staffId?: string | null): boolean => {
    if (!staffId) return false;
    return getOutingIdsForSlot(slot, activeOutings, "staffIds").has(String(staffId));
  };

  const slotHasOuting = (slot: any): boolean => {
    const window = slotWindow(slot);

    return (activeOutings || []).some((outing) => {
      const outingWindow = getOutingWindowMinutes(outing);

      // If no valid outing time is entered, treat it as all-day offsite.
      if (outingWindow.start == null || outingWindow.end == null) return true;

      return timesOverlap(window.start, window.end, outingWindow.start, outingWindow.end);
    });
  };

  const getCellState = (room: RoomKey, slot: any, row: any): CellState => {
    const fso = room === "twins" && isFsoSlot(slot);

    if (isRoomOffsiteForSlot(room, slot)) {
      return { label: "On Outing (Offsite)", variant: "offsite", showFso: false };
    }

    if (roomNotAttending[room]) {
      return { label: "Not attending", variant: "notAttending", showFso: false };
    }

    const staffId = row?.[room] ? String(row[room]) : null;

    if (staffId && isStaffOffsiteForSlot(slot, staffId)) {
      return { label: "On Outing (Offsite)", variant: "offsite", showFso: false };
    }

    const staffPerson = staffId ? staffById.get(staffId) : null;
    const name = staffPerson?.name ? String(staffPerson.name) : "—";

    if (name === "—" && slotHasOuting(slot)) {
      return { label: "On Outing (Offsite)", variant: "offsite", showFso: false };
    }

    return {
      label: name,
      variant: name === "—" ? "empty" : "normal",
      showFso: fso && name !== "—",
    };
  };

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>Current operational view</Text>
          <Text style={styles.panelTitle}>Floating Assignments</Text>
        </View>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="account-clock" size={18} color="#059669" />
          <Text style={styles.badgeText}>Current Slot Highlighted</Text>
        </View>
      </View>

      <View style={styles.floatingTable}>
        <View style={[styles.floatRow, styles.floatHeaderRow]}>
          <Text style={[styles.floatCell, styles.floatTimeCell, styles.floatHeaderText]}>Time</Text>
          {ROOM_KEYS.map((room) => (
            <Text key={room} style={[styles.floatCell, styles.floatHeaderText]}>
              {ROOM_LABELS[room]}
            </Text>
          ))}
        </View>

        {(displayTimeSlots || []).map((slot: any, index: number) => {
          const slotId = String(slot.id ?? index);
          const row = floatingAssignments?.[slotId] || {};
          const current = isCurrentSlot(slot, tick);

          return (
            <View
              key={slotId}
              style={[
                styles.floatRow,
                index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                current && styles.currentFloatRow,
              ]}
            >
              <View style={[styles.floatCellBox, styles.floatTimeCellBox]}>
                <Text style={[styles.floatTimeText, current && styles.currentText]}>{slotLabel(slot)}</Text>
                {current && <Text style={styles.nowLabel}>NOW</Text>}
              </View>

              {ROOM_KEYS.map((room) => {
                const roomKey = room as RoomKey;
                const cell = getCellState(roomKey, slot, row);
                const isOffsite = cell.variant === "offsite";
                const isNotAttending = cell.variant === "notAttending";
                const isEmpty = cell.variant === "empty";

                return (
                  <View
                    key={room}
                    style={[
                      styles.floatCellBox,
                      isOffsite
                        ? { backgroundColor: "#FEE2E2", opacity: 0.78 }
                        : null,
                      isNotAttending
                        ? { backgroundColor: "#E5E7EB", opacity: 0.78 }
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        isEmpty ? styles.floatEmptyText : styles.floatNameText,
                        isOffsite ? { color: "#991B1B" } : null,
                        isNotAttending ? { color: "#6B7280" } : null,
                        current && !isOffsite && !isNotAttending ? styles.currentText : null,
                      ]}
                    >
                      {cell.label}
                      {cell.showFso && <Text style={styles.fsoText}> (FSO)</Text>}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}
