#!/usr/bin/env python3
"""Match Staff Celebrations dashboard layout to Events | Meetings | Visits.

Run from the Daily Schedule App repository root:
    python3 apply-staff-celebrations-layout.py

Only components/dashboard/StaffCelebrationsPanel.tsx is replaced.
A .before-celebrations-layout backup is created first.
"""

from pathlib import Path
import shutil

ROOT = Path.cwd()
TARGET = ROOT / "components/dashboard/StaffCelebrationsPanel.tsx"
BACKUP = TARGET.with_name(TARGET.name + ".before-celebrations-layout")

SOURCE = r'''import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./dashboardStyles";
import { celebrationDateLabel, type StaffCelebrationItem } from "./staffCelebrationData";
import { STAFF_PHOTO_ASSETS } from "./staffPhotoAssets";

const celebrationLightImage = require("../../assets/images/celebrations-light.png");

const localStyles = StyleSheet.create({
  // Mirrors the final Events | Meetings | Visits panel proportions.
  celebrationGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    height: 300,
  },
  column: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3E8FF",
    backgroundColor: "#FFF7FD",
    padding: 10,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 7,
  },
  quoteBanner: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 8,
  },
  quoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    color: "#3B0764",
    textAlign: "center",
  },
  todayContent: {
    flex: 1,
    minHeight: 0,
  },
  todayScrollContent: {
    gap: 8,
    paddingRight: 2,
    paddingBottom: 2,
  },
  todayCardCompact: {
    width: "100%",
    minHeight: 164,
    padding: 12,
    borderRadius: 18,
  },
  emptyPreviewBox: {
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyWatermarkImage: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 8,
    bottom: 8,
    width: "96%",
    height: "96%",
    opacity: 0.19,
  },
  emptySoftWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  emptyMessageBadge: {
    width: "88%",
    maxWidth: 560,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 2,
  },
  emptyMessageTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  emptyMessageTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
    color: "#3B0764",
  },
  emptyMessageText: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#6B21A8",
  },
  upcomingList: {
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  upcomingRow: {
    minHeight: 0,
    height: 55,
    paddingVertical: 6,
    gap: 9,
  },
  upcomingName: {
    fontSize: 14,
    lineHeight: 17,
  },
  upcomingLabel: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  upcomingDate: {
    fontSize: 11,
    lineHeight: 14,
  },
  upcomingEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
});

function initialsFor(name: string): string {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

function photoSource(item: StaffCelebrationItem): ImageSourcePropType | null {
  if (item.photoUrl) return { uri: item.photoUrl };
  if (item.photoKey && STAFF_PHOTO_ASSETS[item.photoKey]) {
    return STAFF_PHOTO_ASSETS[item.photoKey] || null;
  }
  return null;
}

function StaffPhoto({ item, size = 88 }: { item: StaffCelebrationItem; size?: number }) {
  const source = photoSource(item);
  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (source) {
    return <Image source={source} style={[styles.celebrationPhoto, circleStyle]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.celebrationInitialsCircle, circleStyle]}>
      <Text style={styles.celebrationInitialsText}>{initialsFor(item.firstName)}</Text>
    </View>
  );
}

function TodayCelebrationCard({ item }: { item: StaffCelebrationItem }) {
  const isBirthday = item.kind === "birthday";

  return (
    <View
      style={[
        styles.celebrationTodayCard,
        localStyles.todayCardCompact,
        isBirthday ? styles.celebrationBirthdayCard : styles.celebrationMilestoneCard,
      ]}
    >
      <View style={styles.celebrationConfettiCorner}>
        <MaterialCommunityIcons
          name={isBirthday ? "cake-variant" : "star"}
          size={24}
          color={isBirthday ? "#7C3AED" : "#B7791F"}
        />
      </View>

      <View style={styles.celebrationTodayCardInner}>
        <StaffPhoto item={item} size={76} />

        <View style={styles.celebrationTodayTextBlock}>
          <View
            style={[
              styles.celebrationTypePill,
              isBirthday ? styles.celebrationBirthdayPill : styles.celebrationMilestonePill,
            ]}
          >
            <MaterialCommunityIcons
              name={isBirthday ? "cake-variant" : "briefcase-check"}
              size={13}
              color={isBirthday ? "#7C3AED" : "#B7791F"}
            />
            <Text
              style={[
                styles.celebrationTypeText,
                isBirthday ? styles.celebrationBirthdayText : styles.celebrationMilestoneText,
              ]}
            >
              {item.label}
            </Text>
          </View>

          <Text
            style={[
              styles.celebrationTodayTitle,
              isBirthday ? styles.celebrationBirthdayTitle : styles.celebrationMilestoneTitle,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={styles.celebrationTodayMessage} numberOfLines={3}>
            {item.message}
          </Text>
        </View>

        {!isBirthday && item.years ? (
          <View style={styles.celebrationYearsMedal}>
            <Text style={styles.celebrationYearsNumber}>{item.years}</Text>
            <Text style={styles.celebrationYearsLabel}>{item.years === 1 ? "YEAR" : "YEARS"}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function UpcomingCelebrationRow({ item }: { item: StaffCelebrationItem }) {
  const isBirthday = item.kind === "birthday";

  return (
    <View style={[styles.celebrationUpcomingRow, localStyles.upcomingRow]}>
      <StaffPhoto item={item} size={38} />
      <View style={styles.celebrationUpcomingTextBlock}>
        <Text style={[styles.celebrationUpcomingName, localStyles.upcomingName]} numberOfLines={1}>
          {item.firstName}
        </Text>
        <Text
          style={[
            styles.celebrationUpcomingLabel,
            localStyles.upcomingLabel,
            isBirthday ? styles.celebrationBirthdayText : styles.celebrationMilestoneText,
          ]}
          numberOfLines={1}
        >
          {isBirthday ? "Birthday" : item.label}
        </Text>
      </View>
      <Text style={[styles.celebrationUpcomingDate, localStyles.upcomingDate]}>
        {celebrationDateLabel(item)}
      </Text>
    </View>
  );
}

export function StaffCelebrationsPanel({
  todayCelebrations,
  upcomingCelebrations,
}: {
  todayCelebrations: StaffCelebrationItem[];
  upcomingCelebrations: StaffCelebrationItem[];
}) {
  const visibleUpcoming = upcomingCelebrations.slice(0, 4);
  const todayCount = todayCelebrations.length;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>People & culture</Text>
          <Text style={styles.panelTitle}>Staff Birthdays & Milestones 🎉</Text>
        </View>
        <View style={styles.celebrationSummaryBadge}>
          <MaterialCommunityIcons name="party-popper" size={18} color="#6D28D9" />
          <Text style={styles.celebrationSummaryBadgeText}>{todayCount} today</Text>
        </View>
      </View>

      <View style={localStyles.celebrationGrid}>
        <View style={localStyles.column}>
          <View style={localStyles.quoteBanner}>
            <MaterialCommunityIcons name="heart-outline" size={20} color="#7C3AED" />
            <Text style={localStyles.quoteText} numberOfLines={1}>
              Great people make a great team. Today, we celebrate you!
            </Text>
            <MaterialCommunityIcons name="heart" size={18} color="#7C3AED" />
          </View>

          <View style={localStyles.todayContent}>
            {todayCelebrations.length === 0 ? (
              <View style={localStyles.emptyPreviewBox}>
                <Image
                  source={celebrationLightImage}
                  style={localStyles.emptyWatermarkImage}
                  resizeMode="contain"
                />
                <View style={localStyles.emptySoftWash} />
                <View style={localStyles.emptyMessageBadge}>
                  <MaterialCommunityIcons name="calendar-heart" size={25} color="#7C3AED" />
                  <View style={localStyles.emptyMessageTextBlock}>
                    <Text style={localStyles.emptyMessageTitle}>No staff celebration today</Text>
                    <Text style={localStyles.emptyMessageText}>
                      Birthday and milestone cards will appear here when scheduled.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <ScrollView
                style={styles.innerScroll}
                contentContainerStyle={localStyles.todayScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {todayCelebrations.map((item) => (
                  <TodayCelebrationCard key={item.id} item={item} />
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={localStyles.column}>
          <Text style={localStyles.sectionTitle}>Upcoming Celebrations</Text>

          {visibleUpcoming.length === 0 ? (
            <View style={[localStyles.upcomingList, localStyles.upcomingEmpty]}>
              <Text style={styles.celebrationEmptyText}>
                No upcoming birthdays or milestones in the display window.
              </Text>
            </View>
          ) : (
            <View style={localStyles.upcomingList}>
              {visibleUpcoming.map((item) => (
                <UpcomingCelebrationRow key={item.id} item={item} />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
'''

if not TARGET.exists():
    raise SystemExit(f"Could not find {TARGET}. Run this from the repository root.")

if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)

TARGET.write_text(SOURCE, encoding="utf-8")

print("Updated:", TARGET)
print("Backup:", BACKUP)
print("Next run: npm run build")
