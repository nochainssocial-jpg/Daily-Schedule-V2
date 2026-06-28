import React from "react";
import { ScrollView, Text, View } from "react-native";
import { styles } from "./dashboardStyles";

export function CleaningPanel({ cleaningRows }: { cleaningRows: any[] }) {
  const assignedCount = cleaningRows.filter((row) => row.complete).length;
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>End of shift</Text>
          <Text style={styles.panelTitle}>Cleaning Assignments</Text>
        </View>
        <Text style={styles.progressText}>
          {assignedCount} / {cleaningRows.length} assigned
        </Text>
      </View>

      <ScrollView style={styles.innerScroll} contentContainerStyle={styles.cleaningGrid}>
        {cleaningRows.map((row) => (
          <View key={row.id} style={styles.cleaningCard}>
            <Text style={styles.cleaningTask}>{row.chore}</Text>
            {row.complete ? (
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
            ) : (
              <Text style={styles.cleaningUnassigned}>{row.assigned}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
