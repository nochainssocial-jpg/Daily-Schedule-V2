import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getOutingPhase, namesFromIds, outingPhaseLabel, shortNames } from "./dashboardUtils";
import { styles } from "./dashboardStyles";
import { getOutingSlot } from "@/lib/outingSlots";

export function OutingsPanel({
  activeOutings,
  staffById,
  participantsById,
  currentMinutes,
}: {
  activeOutings: any[];
  staffById: Map<string, any>;
  participantsById: Map<string, any>;
  currentMinutes?: number;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>Scheduled off-site activity</Text>
      <Text style={styles.panelTitle}>Drive / Outings</Text>

      {activeOutings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={42} color="#9CA3AF" />
          <Text style={styles.emptyText}>No outings scheduled today.</Text>
        </View>
      ) : (
        <View style={styles.outingGrid}>
          {activeOutings.map((outing: any, index: number) => {
            const slot = getOutingSlot(outing, index);
            const isSecond = slot === 1;
            const isSafety = slot === 2;
            const staffNames = namesFromIds(outing.staffIds, staffById);
            const participantNames = namesFromIds(outing.participantIds, participantsById);
            const phase = getOutingPhase(outing, currentMinutes);
            const phaseLabel = outingPhaseLabel(phase);
            return (
              <View
                key={outing.id || `outing-${index}`}
                style={[
                  styles.outingCard,
                  isSafety
                    ? styles.outingCardRed
                    : isSecond
                      ? styles.outingCardPurple
                      : styles.outingCardOrange,
                ]}
              >
                <View style={styles.outingTitleRow}>
                  <View
                    style={[
                      styles.outingIcon,
                      isSafety
                        ? styles.outingIconRed
                        : isSecond
                          ? styles.outingIconPurple
                          : styles.outingIconOrange,
                    ]}
                  >
                    <Ionicons name="car-outline" size={26} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.outingLabel,
                        isSafety
                          ? styles.redText
                          : isSecond
                            ? styles.purpleText
                            : styles.orangeText,
                      ]}
                    >
                      {isSafety ? "Additional Transport" : isSecond ? "Outing 2" : "Outing 1"}
                      {phaseLabel ? ` · ${phaseLabel}` : ""}
                    </Text>
                    <Text style={styles.outingName}>
                      {isSafety
                        ? `Linked to ${outing.linkedOutingName || "main outing"}`
                        : outing.name || "Unnamed outing"}
                    </Text>
                    <Text style={styles.outingTime}>{(outing.startTime || "?") + " – " + (outing.endTime || "?")}</Text>
                  </View>
                </View>

                <View style={styles.outingSection}>
                  <Text style={styles.outingSectionTitle}>Staff</Text>
                  <Text style={styles.outingSectionText}>{shortNames(staffNames)}</Text>
                </View>
                <View style={styles.outingSection}>
                  <Text style={styles.outingSectionTitle}>Participants</Text>
                  <Text style={styles.outingSectionText}>{shortNames(participantNames)}</Text>
                </View>
                <View style={styles.outingSection}>
                  <Text style={styles.outingSectionTitle}>Notes</Text>
                  <Text style={styles.outingSectionText}>{String(outing.notes || "").trim() || "No notes entered."}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
