import React from "react";
import { ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./dashboardStyles";

export function TeamAssignmentsPanel({ teamAssignmentRows }: { teamAssignmentRows: any[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>Today’s participant support</Text>
          <Text style={styles.panelTitle}>Team Daily Assignments</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendPill, styles.legendBlue]}>
            <Text style={styles.legendText}>Onsite</Text>
          </View>
          <View style={[styles.legendPill, styles.legendOrange]}>
            <Text style={styles.legendTextOrange}>Outing 1</Text>
          </View>
          <View style={[styles.legendPill, styles.legendPurple]}>
            <Text style={styles.legendTextPurple}>Outing 2</Text>
          </View>
          <View style={[styles.legendPill, styles.legendRed]}>
            <Text style={styles.legendTextRed}>Additional Transport</Text>
          </View>
        </View>
      </View>

      {teamAssignmentRows.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-group-outline" size={44} color="#9CA3AF" />
          <Text style={styles.emptyText}>No team daily assignments saved yet.</Text>
        </View>
      ) : (
        <ScrollView style={styles.innerScroll} contentContainerStyle={styles.assignmentGrid}>
          {teamAssignmentRows.map((row) => (
            <View
              key={row.staffId}
              style={[
                styles.assignmentCard,
                row.theme === "outing1"
                  ? styles.assignmentCardOuting1
                  : row.theme === "outing2"
                    ? styles.assignmentCardOuting2
                    : row.theme === "outing3"
                      ? styles.assignmentCardOuting3
                      : styles.assignmentCardOnsite,
              ]}
            >
              <View
                style={[
                  styles.assignmentStaffPill,
                  {
                    backgroundColor: row.staffColor,
                    borderColor: row.staffColor,
                  },
                ]}
              >
                <Text
                  style={[styles.assignmentStaffName, { color: row.staffTextColor }]}
                  numberOfLines={1}
                >
                  {row.staffName}
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color="#9CA3AF"
                style={styles.assignmentChevron}
              />

              <View style={styles.assignmentParticipantList}>
                {row.participantItems.length === 0 && (
                  <View style={styles.assignmentUnassignedChip}>
                    <Text style={styles.assignmentUnassignedText} numberOfLines={1}>
                      No participant assigned
                    </Text>
                  </View>
                )}
                {row.participantItems.map((participant: any) => (
                  <View
                    key={participant.id}
                    style={[
                      styles.assignmentParticipantChip,
                      participant.theme === "outing1"
                        ? styles.assignmentParticipantChipOuting1
                        : participant.theme === "outing2"
                          ? styles.assignmentParticipantChipOuting2
                          : participant.theme === "outing3"
                            ? styles.assignmentParticipantChipOuting3
                            : styles.assignmentParticipantChipOnsite,
                    ]}
                  >
                    <Text
                      style={[
                        styles.assignmentParticipantName,
                        participant.theme === "outing1"
                          ? styles.assignmentParticipantNameOuting1
                          : participant.theme === "outing2"
                            ? styles.assignmentParticipantNameOuting2
                            : participant.theme === "outing3"
                              ? styles.assignmentParticipantNameOuting3
                              : styles.assignmentParticipantNameOnsite,
                      ]}
                      numberOfLines={1}
                    >
                      {participant.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
