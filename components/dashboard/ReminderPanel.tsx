import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { REMINDER_CONTENT } from "./dashboardTheme";
import type { ReminderPage } from "./dashboardTypes";
import { styles } from "./dashboardStyles";

const NoChainsRoundLogo = require("@/assets/images/nochains-round.png");

export function ReminderPanel({ currentPage }: { currentPage: ReminderPage }) {
  const reminder = REMINDER_CONTENT[currentPage];
  return (
    <View style={[styles.panel, styles.reminderPanel]}>
      <View style={styles.reminderHeaderRow}>
        <Image source={NoChainsRoundLogo} style={styles.reminderLogo} resizeMode="contain" />
        <View style={styles.reminderHeaderText}>
          <Text style={styles.panelEyebrow}>{reminder.eyebrow}</Text>
          <Text style={styles.panelTitle}>{reminder.title}</Text>
        </View>
        <View style={styles.reminderIconCircle}>
          <MaterialCommunityIcons name={reminder.icon as any} size={28} color="#F54FA5" />
        </View>
      </View>

      <ScrollView style={styles.innerScroll} contentContainerStyle={styles.reminderBody}>
        <View style={styles.reminderLeadBox}>
          <Text style={styles.reminderLeadText}>{reminder.lead}</Text>
        </View>

        <View style={styles.reminderPointList}>
          {reminder.points.map((point) => (
            <View key={point} style={styles.reminderPointRow}>
              <View style={styles.reminderBullet}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.reminderPointText}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={styles.reminderFooterBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={21} color="#BE185D" />
          <Text style={styles.reminderFooterText}>{reminder.footer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
