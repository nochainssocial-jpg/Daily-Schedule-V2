import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./dashboardStyles";

type Props = {
  message: string;
  position: number;
  total: number;
};

function getFeedbackTypography(message: string) {
  const clean = String(message || "").trim();
  const characters = clean.length;
  const paragraphs = clean
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean).length;

  // Paragraph breaks consume extra vertical space, so include them in the
  // sizing score rather than relying on character count alone.
  const score = characters + Math.max(0, paragraphs - 1) * 55;

  if (score > 1_050) return { fontSize: 13, lineHeight: 18 };
  if (score > 850) return { fontSize: 14, lineHeight: 19 };
  if (score > 680) return { fontSize: 15, lineHeight: 21 };
  if (score > 520) return { fontSize: 16, lineHeight: 22 };
  if (score > 360) return { fontSize: 17, lineHeight: 24 };
  return { fontSize: 18, lineHeight: 26 };
}

export function StaffFeedbackPanel({ message, position, total }: Props) {
  const messageTypography = useMemo(
    () => getFeedbackTypography(message),
    [message],
  );

  return (
    <View style={[styles.panel, styles.feedbackPanel]}>
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
        <MaterialCommunityIcons name="heart" size={17} color="#D97706" />
        <Text style={styles.feedbackFooterText}>
          Thank you for the difference you make every day.
        </Text>
      </View>
    </View>
  );
}
