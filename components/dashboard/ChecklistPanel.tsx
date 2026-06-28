import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./dashboardStyles";

export function ChecklistPanel({
  checklistRows,
  completedChecklist,
  selectedFinalStaff,
  selectedFinalStaffColor,
  selectedFinalStaffTextColor,
}: {
  checklistRows: any[];
  completedChecklist: number;
  selectedFinalStaff: string;
  selectedFinalStaffColor: string;
  selectedFinalStaffTextColor: string;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.panelEyebrow}>Close of day</Text>
          <Text style={styles.panelTitle}>End of Shift Checklist</Text>

          <View style={styles.finalStaffLeftBlock}>
            <Text style={styles.finalStaffLabel}>Last to leave</Text>
            <View
              style={[
                styles.finalStaffPill,
                {
                  backgroundColor: selectedFinalStaffColor,
                  borderColor: selectedFinalStaffColor,
                },
              ]}
            >
              <Text style={[styles.finalStaffPillText, { color: selectedFinalStaffTextColor }]}>
                {selectedFinalStaff}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.progressBlock}>
          <Text style={styles.progressText}>
            {completedChecklist} / {checklistRows.length} complete
          </Text>
        </View>
      </View>

      <View style={styles.checklistProgressOuter}>
        <View
          style={[
            styles.checklistProgressInner,
            {
              width: checklistRows.length
                ? `${Math.round((completedChecklist / checklistRows.length) * 100)}%`
                : "0%",
            },
          ]}
        />
      </View>

      <ScrollView style={styles.innerScroll} contentContainerStyle={styles.checklistList}>
        {checklistRows.map((item) => (
          <View key={item.id} style={[styles.checklistRow, item.checked && styles.checklistRowDone]}>
            <Ionicons
              name={item.checked ? "checkmark-circle" : "ellipse-outline"}
              size={28}
              color={item.checked ? "#10B981" : "#9CA3AF"}
            />
            <Text style={[styles.checklistText, item.checked && styles.checklistTextDone]}>
              {item.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
