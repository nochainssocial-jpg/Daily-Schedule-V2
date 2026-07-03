import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./dashboardStyles";
import { celebrationDateLabel, type StaffCelebrationItem } from "./staffCelebrationData";
import { STAFF_PHOTO_ASSETS } from "./staffPhotoAssets";

const celebrationLightImage = require("../../assets/images/celebrations-light.png");

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
  if (item.photoKey && STAFF_PHOTO_ASSETS[item.photoKey]) return STAFF_PHOTO_ASSETS[item.photoKey] || null;
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

function TodayCelebrationCard({ item, wide }: { item: StaffCelebrationItem; wide: boolean }) {
  const isBirthday = item.kind === "birthday";

  return (
    <View
      style={[
        styles.celebrationTodayCard,
        isBirthday ? styles.celebrationBirthdayCard : styles.celebrationMilestoneCard,
        { width: wide ? "100%" : "48.8%" },
      ]}
    >
      <View style={styles.celebrationConfettiCorner}>
        <MaterialCommunityIcons
          name={isBirthday ? "cake-variant" : "star"}
          size={26}
          color={isBirthday ? "#7C3AED" : "#B7791F"}
        />
      </View>

      <View style={styles.celebrationTodayCardInner}>
        <StaffPhoto item={item} size={84} />

        <View style={styles.celebrationTodayTextBlock}>
          <View style={[styles.celebrationTypePill, isBirthday ? styles.celebrationBirthdayPill : styles.celebrationMilestonePill]}>
            <MaterialCommunityIcons
              name={isBirthday ? "cake-variant" : "briefcase-check"}
              size={13}
              color={isBirthday ? "#7C3AED" : "#B7791F"}
            />
            <Text style={[styles.celebrationTypeText, isBirthday ? styles.celebrationBirthdayText : styles.celebrationMilestoneText]}>
              {item.label}
            </Text>
          </View>

          <Text style={[styles.celebrationTodayTitle, isBirthday ? styles.celebrationBirthdayTitle : styles.celebrationMilestoneTitle]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.celebrationTodayMessage} numberOfLines={3}>{item.message}</Text>
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
    <View style={styles.celebrationUpcomingRow}>
      <StaffPhoto item={item} size={46} />
      <View style={styles.celebrationUpcomingTextBlock}>
        <Text style={styles.celebrationUpcomingName} numberOfLines={1}>{item.firstName}</Text>
        <Text style={[styles.celebrationUpcomingLabel, isBirthday ? styles.celebrationBirthdayText : styles.celebrationMilestoneText]} numberOfLines={1}>
          {isBirthday ? "Birthday" : item.label}
        </Text>
      </View>
      <Text style={styles.celebrationUpcomingDate}>{celebrationDateLabel(item)}</Text>
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
  const wideCards = true;

  return (
    <View style={[styles.panel, styles.celebrationPanel]}>
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

      <View style={[styles.celebrationLayout, { gap: 12 }]}>
        <View style={[styles.celebrationMainColumn, { flex: 2.45, minWidth: 0 }]}>
          <View style={styles.celebrationSectionTitleRow}>
            <MaterialCommunityIcons name="sparkles" size={22} color="#7C3AED" />
            <Text style={styles.celebrationSectionTitle} numberOfLines={1}>Today’s Celebrations</Text>
          </View>

          {todayCelebrations.length === 0 ? (
            <View style={styles.celebrationEmptyTodayBox}>
              <Image
                source={celebrationLightImage}
                style={styles.celebrationEmptyWatermark}
                resizeMode="contain"
              />
              <View style={styles.celebrationEmptyContent}>
                <MaterialCommunityIcons name="calendar-heart" size={34} color="#7C3AED" />
                <Text style={styles.celebrationEmptyTitle}>No staff celebration today.</Text>
                <Text style={styles.celebrationEmptyText}>Upcoming birthdays and anniversaries are shown on the right.</Text>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.innerScroll} contentContainerStyle={[styles.celebrationTodayGrid, { flexDirection: "column", flexWrap: "nowrap", gap: 10, paddingRight: 2 }]}>
              {todayCelebrations.map((item) => (
                <TodayCelebrationCard key={item.id} item={item} wide={wideCards} />
              ))}
            </ScrollView>
          )}

          <View style={[styles.celebrationFooterBanner, { marginTop: 10, paddingVertical: 10 }]}>
            <MaterialCommunityIcons name="heart-outline" size={24} color="#7C3AED" />
            <Text style={styles.celebrationFooterText}>Great people make a great team. Today, we celebrate you!</Text>
            <MaterialCommunityIcons name="heart" size={22} color="#7C3AED" />
          </View>
        </View>

        <View style={[styles.celebrationSideColumn, { flex: 0.95, minWidth: 260 }]}>
          <View style={styles.celebrationUpcomingHeader}>
            <MaterialCommunityIcons name="calendar-star" size={22} color="#6D28D9" />
            <Text style={styles.celebrationUpcomingTitle} numberOfLines={1}>Upcoming Celebrations</Text>
          </View>

          {visibleUpcoming.length === 0 ? (
            <View style={styles.celebrationUpcomingEmpty}>
              <Text style={styles.celebrationEmptyText}>No upcoming birthdays or milestones in the display window.</Text>
            </View>
          ) : (
            <View style={styles.celebrationUpcomingList}>
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
