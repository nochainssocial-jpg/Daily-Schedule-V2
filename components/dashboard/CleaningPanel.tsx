import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { CompactDashboardTile } from "./CompactDashboardTile";
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
          <CompactDashboardTile
            key={row.id}
            staffName={row.assigned}
            staffColor={row.staffColor}
            staffTextColor={row.staffTextColor}
            style={styles.cleaningCard}
          >
            <Text style={styles.cleaningTask} numberOfLines={3}>
              {row.chore}
            </Text>
          </CompactDashboardTile>
        ))}
      </ScrollView>
    </View>
  );
}
