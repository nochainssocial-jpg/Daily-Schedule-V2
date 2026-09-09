import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./dashboardStyles";

type Props = {
  message: string;
  position: number;
  total: number;
  floatingRows?: 0 | 1 | 2;
};

function getFeedbackTypography(message: string, floatingRows: number) {
  const clean = String(message || "").trim();
  const characters = clean.length;
  const paragraphs = clean
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean).length;

  // Paragraphs use extra height. During the two-row floating state,
  // long messages scale down a little more to preserve safe clearance.
  const overlayPenalty = floatingRows >= 2 ? 220 : floatingRows === 1 ? 90 : 0;
  const score = characters + Math.max(0, paragraphs - 1) * 45 + overlayPenalty;

  if (score > 1_100) return { fontSize: 12, lineHeight: 16 };
  if (score > 930) return { fontSize: 13, lineHeight: 18 };
  if (score > 760) return { fontSize: 14, lineHeight: 19 };
  if (score > 610) return { fontSize: 15, lineHeight: 20 };
  if (score > 450) return { fontSize: 16, lineHeight: 22 };
  return { fontSize: 17, lineHeight: 24 };
}

export function StaffFeedbackPanel({
  message,
  position,
  total,
  floatingRows = 0,
}: Props) {
  const messageTypography = useMemo(
    () => getFeedbackTypography(message, floatingRows),
    [floatingRows, message],
  );

  // Reserve only the space actually required by the live floating overlay.
  const bottomClearance =
    floatingRows >= 2 ? 178 : floatingRows === 1 ? 132 : 92;

  return (
    <View
      style={[
        styles.panel,
        styles.feedbackPanel,
        { paddingBottom: bottomClearance },
      ]}
    >
      <View style={styles.feedbackHeaderRow}>
        <View style={styles.feedbackHeaderLeft}>
          <View>
            <Text style={styles.feedbackEyebrow}>Family Feedback</Text>
            <Text style={styles.feedbackTitle}>Well Done Team 👏🏽</Text>
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
        <Text
          style={[styles.feedbackMessageText, messageTypography]}
          adjustsFontSizeToFit
        >
          {message}
        </Text>
      </View>

      <View style={styles.feedbackFooter}>
        <MaterialCommunityIcons name="heart" size={16} color="#D97706" />
        <Text style={styles.feedbackFooterText}>
          Thank you for the difference you make every day.
        </Text>
      </View>
    </View>
  );
}
