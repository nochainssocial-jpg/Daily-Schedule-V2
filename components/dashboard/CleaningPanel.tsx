import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { styles } from "./dashboardStyles";

export function CleaningPanel({ cleaningRows }: { cleaningRows: any[] }) {
  const assignedRows = useMemo(
    () => cleaningRows.filter((row) => row.complete),
    [cleaningRows],
  );

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>End of shift</Text>
          <Text style={styles.panelTitle}>Cleaning Assignments</Text>
        </View>
        <Text style={styles.progressText}>
          {assignedRows.length} assigned {assignedRows.length === 1 ? "task" : "tasks"}
        </Text>
      </View>

      <ScrollView style={styles.innerScroll} contentContainerStyle={styles.cleaningGrid}>
        {assignedRows.map((row) => (
          <View key={row.id} style={styles.cleaningCard}>
            <Text style={styles.cleaningTask}>{row.chore}</Text>
            <View
              style={[
                styles.cleaningAssignedPill,
                {
                  backgroundColor: row.staffColor,
                  borderColor: row.staffColor,
                },
              ]}
            >
              <Text
                style={[styles.cleaningAssignedText, { color: row.staffTextColor }]}
                numberOfLines={1}
              >
                {row.assigned}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
