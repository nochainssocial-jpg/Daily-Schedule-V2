import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CompactDashboardTile } from "./CompactDashboardTile";
import { styles } from "./dashboardStyles";

export function DropoffsPanel({ dropoffRows }: { dropoffRows: any[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>Transport home</Text>
          <Text style={styles.panelTitle}>Drop Offs</Text>
        </View>
        <Text style={styles.progressText}>{dropoffRows.length} staff assigned</Text>
      </View>

      {dropoffRows.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="bus-clock" size={44} color="#9CA3AF" />
          <Text style={styles.emptyText}>No drop offs assigned yet.</Text>
        </View>
      ) : (
        <ScrollView style={styles.innerScroll} contentContainerStyle={styles.assignmentGrid}>
          {dropoffRows.map((row) => (
            <View
              key={row.staffId}
              style={[styles.assignmentCard, styles.assignmentCardOnsite]}
            >
              <CompactDashboardTile
                staffName={row.staffName}
                staffColor={row.staffColor}
                staffTextColor={row.staffTextColor}
              >
                <View style={styles.assignmentParticipantList}>
                  {row.items.map((item: any) => {
                    const label = item.locationLabel
                      ? `${item.participantName} · ${item.locationLabel}`
                      : item.participantName;
                    return (
                      <View
                        key={`${row.staffId}-${item.participantName}`}
                        style={[
                          styles.assignmentParticipantChip,
                          styles.assignmentParticipantChipOnsite,
                        ]}
                      >
                        <Text
                          style={[
                            styles.assignmentParticipantName,
                            styles.assignmentParticipantNameOnsite,
                          ]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </CompactDashboardTile>
              {row.note ? (
                <View style={noteStyles.messageArea}>
                  <Text style={noteStyles.message}>{row.note}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const noteStyles = StyleSheet.create({
  messageArea: {
    marginTop: "auto",
    paddingTop: 8,
  },
  message: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
});
