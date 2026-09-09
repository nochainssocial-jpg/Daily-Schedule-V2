import React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./dashboardStyles";

type Props = {
  message: string;
  position: number;
  total: number;
};

export function StaffFeedbackPanel({ message, position, total }: Props) {
  return (
    <View style={[styles.panel, styles.feedbackPanel]}>
      <View style={styles.feedbackHeaderRow}>
        <View style={styles.feedbackHeaderLeft}>
          <View style={styles.feedbackIconCircle}>
            <MaterialCommunityIcons
              name="message-heart-outline"
              size={28}
              color="#D97706"
            />
          </View>
          <View>
            <Text style={styles.feedbackEyebrow}>Family feedback</Text>
            <Text style={styles.feedbackTitle}>Well Done Staff 👏🏽</Text>
          </View>
        </View>

        {total > 1 ? (
          <View style={styles.feedbackCounterPill}>
            <Text style={styles.feedbackCounterText}>
              Message {position} of {total}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.feedbackMessageCard}>
        <Text style={styles.feedbackQuoteMark}>“</Text>
        <Text style={styles.feedbackMessageText}>{message}</Text>
      </View>

      <View style={styles.feedbackFooter}>
        <MaterialCommunityIcons name="heart" size={18} color="#D97706" />
        <Text style={styles.feedbackFooterText}>
          Thank you for the difference you make every day.
        </Text>
      </View>
    </View>
  );
}
