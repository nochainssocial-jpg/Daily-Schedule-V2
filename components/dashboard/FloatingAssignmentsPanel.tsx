import React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ROOM_KEYS, ROOM_LABELS } from "./dashboardTheme";
import { isCurrentSlot, isFsoSlot, slotLabel } from "./dashboardUtils";
import { styles } from "./dashboardStyles";

export function FloatingAssignmentsPanel({
  displayTimeSlots,
  floatingAssignments,
  staffById,
  tick,
}: {
  displayTimeSlots: any[];
  floatingAssignments: any;
  staffById: Map<string, any>;
  tick: number;
}) {
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
                const staffId = row?.[room];
                const staffPerson = staffId ? staffById.get(String(staffId)) : null;
                const name = staffPerson?.name || "—";
                const showFso = room === "twins" && isFsoSlot(slot) && name !== "—";
                return (
                  <View key={room} style={styles.floatCellBox}>
                    {name === "—" ? (
                      <Text style={styles.floatEmptyText}>—</Text>
                    ) : (
                      <Text style={styles.floatNameText} numberOfLines={1}>
                        {name}{showFso ? " (FSO)" : ""}
                      </Text>
                    )}
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
