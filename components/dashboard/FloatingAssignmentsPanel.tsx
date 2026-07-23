import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ROOM_KEYS, ROOM_LABELS } from "./dashboardTheme";
import { isCurrentSlot, slotLabel } from "./dashboardUtils";
import { styles } from "./dashboardStyles";
import {
  buildFloatingDisplayContext,
  resolveFloatingCellState,
} from "./floatingDisplayLogic";

type RoomKey = "frontRoom" | "scotty" | "twins";

export function FloatingAssignmentsPanel({
  displayTimeSlots,
  floatingAssignments,
  staffById,
  participantsById,
  attendingParticipants,
  activeOutings = [],
  tick,
  currentMinutes,
}: {
  displayTimeSlots: any[];
  floatingAssignments: any;
  staffById: Map<string, any>;
  participantsById: Map<string, any>;
  attendingParticipants: any[];
  activeOutings?: any[];
  tick: number;
  currentMinutes?: number;
}) {
  const displayContext = useMemo(
    () =>
      buildFloatingDisplayContext({
        participantsById,
        attendingParticipants,
        activeOutings,
      }),
    [participantsById, attendingParticipants, activeOutings],
  );

  return (
    <View style={[styles.panel, styles.floatingPanel]}>
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

      <View style={[styles.floatingTable, styles.floatingTableCompact]}>
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
          const current = isCurrentSlot(slot, tick, currentMinutes);

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
                const cell = resolveFloatingCellState({
                  room: roomKey,
                  slot,
                  row,
                  staffById,
                  context: displayContext,
                });
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
