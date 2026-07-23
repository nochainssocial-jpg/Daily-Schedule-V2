import { getSydneyMinutesSinceMidnight } from '@/lib/sydneyDate';
import { DEFAULT_LOCATION_ID } from '@/constants/location';
// app/edit/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { STAFF_PHOTO_ASSETS, type StaffPhotoKey } from "@/components/dashboard/staffPhotoAssets";
import { useAccessControl } from "@/hooks/access-control";

import Footer from "@/components/Footer";
import ScheduleBanner from "@/components/ScheduleBanner";
import OutingSummaryBanner from "@/components/OutingSummaryBanner";
import { initScheduleForToday, useSchedule } from "@/hooks/schedule-store";
import { getOutingSlot, resolveOutingTiming } from "@/lib/outingSlots";

const MAX_WIDTH = 960;
const showWebBranding = Platform.OS === "web";

type AdminIdentity = {
  name: string;
  photoKey: StaffPhotoKey;
};

const ADMIN_IDENTITIES = {
  "admin-md": { name: "Dalida", photoKey: "Dalida" },
  "admin-bruno": { name: "Bruno", photoKey: "Bruno" },
  "admin-jessica": { name: "Jessica", photoKey: "Jessica" },
} satisfies Record<string, AdminIdentity>;

type CardConfig = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  route: string; // absolute path
};

const SCHEDULE_CARDS: CardConfig[] = [
  {
    key: "dream-team",
    title: "The Dream Team (Working at B2)",
    description: "Choose who is working at B2 today and who is away.",
    icon: "people-circle-outline",
    iconBg: "#ffd5b4",
    route: "/edit/dream-team",
  },
  {
    key: "participants",
    title: "Attending Participants",
    description: "Confirm who is attending for the day (onsite or on outing).",
    icon: "happy-outline",
    iconBg: "#E0F2FE",
    route: "/edit/participants",
  },
  {
    key: "assignments",
    title: "Team Daily Assignments",
    description: "Assign participants to staff for the day.",
    icon: "clipboard-outline",
    iconBg: "#E5DEFF",
    route: "/edit/assignments",
  },
  {
    key: "floating",
    title: "Floating Assignments (Front Room, Scotty, Twins)",
    description:
      "Plan floating support across the key shared spaces throughout the day.",
    icon: "refresh-circle-outline",
    iconBg: "#FDF2FF",
    route: "/edit/floating",
  },
  {
    key: "cleaning",
    title: "End of Shift Cleaning Assignments",
    description:
      "Distribute cleaning tasks fairly so no one is stuck with the same jobs.",
    icon: "sparkles-outline" as keyof typeof Ionicons.glyphMap,
    iconBg: "#DCFCE7",
    route: "/edit/cleaning",
  },
  {
    key: "pickups-dropoffs",
    title: "Pickups and Dropoffs with Helpers",
    description:
      "Organise transport, helpers and dropoff locations for each participant.",
    icon: "bus-outline",
    iconBg: "#FFE4E6",
    route: "/edit/pickups-dropoffs",
  },
  {
    key: "checklist",
    title: "End of Shift Checklist",
    description:
      "Final checklist to confirm everything is complete before handing over.",
    icon: "checkbox-outline",
    iconBg: "#E0E7FF",
    route: "/edit/checklist",
  },
];

const ADDITIONAL_OPERATION_CARDS: CardConfig[] = [
  {
    key: "outings",
    title: "Drive / Outing / Off-site",
    description:
      "Set up drives and outings independently while keeping onsite availability accurate.",
    icon: "car-outline",
    iconBg: "#FFE4CC",
    route: "/edit/outings",
  },
  {
    key: "property-support",
    title: "Property Support",
    description:
      "Assign Day Program staff to property visits and record the tasks required.",
    icon: "home-outline",
    iconBg: "#CCFBF1",
    route: "/edit/property-support",
  },
  {
    key: "events-meetings-visits",
    title: "Events | Meetings | Visits",
    description:
      "Add centre events, meetings and external visits for the dashboard.",
    icon: "calendar-outline",
    iconBg: "#FEF3C7",
    route: "/edit/events-meetings-visits",
  },
];
type OutingGroup = {
  id?: string | null;
  name?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  staffIds?: (string | number)[];
  participantIds?: (string | number)[];
  notes?: string | null;
  linkedOutingId?: string | null;
  linkedOutingName?: string | null;
};

type OutingPhase = "none" | "upcoming" | "startingSoon" | "active" | "complete";

const STARTING_SOON_WINDOW_MINUTES = 15;
const COMPLETE_VISIBLE_WINDOW_MINUTES = 5;

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "pm" && hours !== 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

function getNowMinutes() {
  return getSydneyMinutesSinceMidnight();
}

function hasOutingPeople(outingGroup: OutingGroup | null | undefined) {
  const staffCount = outingGroup?.staffIds?.length ?? 0;
  const participantCount = outingGroup?.participantIds?.length ?? 0;
  return staffCount > 0 || participantCount > 0;
}

function getOutingPhase(
  outingGroup: OutingGroup | null | undefined,
  currentMinutes: number,
): OutingPhase {
  if (!outingGroup || !hasOutingPeople(outingGroup)) return "none";

  const startMinutes = parseTimeToMinutes(outingGroup.startTime);
  const parsedEndMinutes = parseTimeToMinutes(outingGroup.endTime);

  // Staff sometimes enter an afternoon end time without an AM/PM suffix
  // (for example, 10:30 to 2:00). When the parsed end is earlier than the
  // start and falls before midday, treat it as PM. This matches the dashboard
  // outing logic and prevents a live outing being mistaken for one that ended
  // at 2:00 am.
  const endMinutes =
    startMinutes !== null &&
    parsedEndMinutes !== null &&
    parsedEndMinutes <= startMinutes &&
    parsedEndMinutes < 12 * 60
      ? parsedEndMinutes + 12 * 60
      : parsedEndMinutes;

  // If no usable time has been entered, keep the banner as a general planned
  // reminder instead of calling it active forever.
  if (startMinutes === null && endMinutes === null) return "upcoming";

  if (startMinutes !== null && currentMinutes < startMinutes) {
    return startMinutes - currentMinutes <= STARTING_SOON_WINDOW_MINUTES
      ? "startingSoon"
      : "upcoming";
  }

  // Once the start time has passed, show the outing as in progress until the
  // end time. If no end time exists, we cannot safely mark it complete.
  if (endMinutes === null) return "active";

  if (currentMinutes <= endMinutes) return "active";

  // Show "complete" briefly after the outing ends, then hide it from Edit Hub.
  if (currentMinutes - endMinutes <= COMPLETE_VISIBLE_WINDOW_MINUTES) {
    return "complete";
  }

  return "none";
}

function buildVisibleOutings(
  outingGroups: OutingGroup[] = [],
  currentMinutes = getNowMinutes(),
) {
  return outingGroups
    .map((rawGroup, index) => {
      const group = resolveOutingTiming(rawGroup, outingGroups);
      const slot = getOutingSlot(rawGroup, index);
      const phase = getOutingPhase(group, currentMinutes);
      const staffCount = group.staffIds?.length ?? 0;
      const participantCount = group.participantIds?.length ?? 0;
      const hasTime =
        (group.startTime && group.startTime.trim() !== "") ||
        (group.endTime && group.endTime.trim() !== "");
      const timeRange = hasTime
        ? `${group.startTime || "?"}–${group.endTime || "?"}`
        : "";

      return {
        group,
        index: slot,
        phase,
        staffCount,
        participantCount,
        timeRange,
      };
    })
    .filter((item) => item.phase !== "none")
    .slice(0, 3);
}

function AdminIdentityCard({ identity }: { identity: AdminIdentity }) {
  const photoSource = STAFF_PHOTO_ASSETS[identity.photoKey];

  return (
    <View style={styles.adminIdentityCard}>
      <View style={styles.adminPhotoFrame}>
        {photoSource ? (
          <Image
            source={photoSource}
            style={styles.adminPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.adminPhotoFallback}>
            <Text style={styles.adminPhotoFallbackText}>
              {identity.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.adminOnlineDot} />
      </View>

      <View style={styles.adminIdentityText}>
        <Text style={styles.adminIdentityEyebrow}>ADMIN ACCESS</Text>
        <Text style={styles.adminIdentityName} numberOfLines={1}>
          {identity.name}
        </Text>
        <Text style={styles.adminIdentityStatus}>Logged in</Text>
      </View>
    </View>
  );
}

export default function EditHubScreen() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const isCompactLayout = viewportWidth < 900;
  const useInlineAdminIdentity = viewportWidth < 1240;
  const accessMode = useAccessControl((state) => state.mode);
  const adminIdentity =
    accessMode in ADMIN_IDENTITIES
      ? ADMIN_IDENTITIES[accessMode as keyof typeof ADMIN_IDENTITIES]
      : null;
  const { outingGroups = [], staff = [], participants = [] } = useSchedule() as {
    outingGroups?: OutingGroup[];
    staff?: { id: string | number; name?: string | null }[];
    participants?: { id: string | number; name?: string | null }[];
  };

  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    void initScheduleForToday(DEFAULT_LOCATION_ID).catch((e) => {
      console.error("initScheduleForToday failed (edit hub):", e);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClockTick((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const visibleOutings = useMemo(() => {
    void clockTick;
    return buildVisibleOutings(outingGroups);
  }, [outingGroups, clockTick]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "Edit Hub",
          headerShown: true,
        }}
      />

      {showWebBranding && (
        <Image
          source={require("@/assets/images/nochains-bg.png")}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.pageFrame}>
          {adminIdentity && !useInlineAdminIdentity ? (
            <View style={styles.adminIdentityDock}>
              <AdminIdentityCard identity={adminIdentity} />
            </View>
          ) : null}

          <View style={styles.inner}>
            {adminIdentity && useInlineAdminIdentity ? (
              <View style={styles.adminIdentityInline}>
                <AdminIdentityCard identity={adminIdentity} />
              </View>
            ) : null}

            <ScheduleBanner />

          {visibleOutings.length > 0 && (
            <View style={styles.outingSummaryRow}>
              {visibleOutings.map(
                ({
                  group,
                  index,
                  phase,
                  staffCount,
                  participantCount,
                  timeRange,
                }) => (
                  <OutingSummaryBanner
                    key={group.id || `outing-${index}`}
                    outingGroup={group}
                    outingIndex={index}
                    phase={phase}
                    staffCount={staffCount}
                    participantCount={participantCount}
                    timeRange={timeRange}
                    staff={staff}
                    participants={participants}
                  />
                ),
              )}
            </View>
          )}

          <View
            style={[
              styles.columns,
              isCompactLayout && styles.columnsStacked,
            ]}
          >
            <View
              style={[
                styles.sectionPanel,
                styles.scheduleSection,
                isCompactLayout && styles.sectionPanelStacked,
              ]}
            >
              <View style={styles.sectionHeadingRow}>
                <View style={[styles.sectionHeadingIcon, styles.scheduleHeadingIcon]}>
                  <Ionicons name="create-outline" size={18} color="#9D174D" />
                </View>
                <View style={styles.sectionHeadingText}>
                  <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
                  <Text style={styles.sectionDescription}>
                    Edit the people, assignments and end-of-day duties stored in today&apos;s schedule.
                  </Text>
                </View>
              </View>

              <View style={styles.cardList}>
                {SCHEDULE_CARDS.map((card) => (
                  <Pressable
                    key={card.key}
                    style={({ pressed }) => [
                      styles.card,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => router.push(card.route)}
                  >
                    <View
                      style={[styles.iconBubble, { backgroundColor: card.iconBg }]}
                    >
                      {card.key === "floating" ? (
                        <MaterialCommunityIcons
                          name="account-clock"
                          size={20}
                          color="#4B5563"
                        />
                      ) : (
                        <Ionicons name={card.icon} size={20} color="#4B5563" />
                      )}
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{card.title}</Text>
                      <Text style={styles.cardDescription}>{card.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </Pressable>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.sectionPanel,
                styles.operationsSection,
                isCompactLayout && styles.sectionPanelStacked,
              ]}
            >
              <View style={styles.sectionHeadingRow}>
                <View style={[styles.sectionHeadingIcon, styles.operationsHeadingIcon]}>
                  <Ionicons name="options-outline" size={18} color="#0F766E" />
                </View>
                <View style={styles.sectionHeadingText}>
                  <Text style={styles.sectionTitle}>Additional Operations</Text>
                  <Text style={styles.sectionDescription}>
                    Manage operational items that can exist independently of schedule creation.
                  </Text>
                </View>
              </View>

              <View style={styles.cardList}>
                {ADDITIONAL_OPERATION_CARDS.map((card) => (
                  <Pressable
                    key={card.key}
                    style={({ pressed }) => [
                      styles.card,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => router.push(card.route)}
                  >
                    <View
                      style={[styles.iconBubble, { backgroundColor: card.iconBg }]}
                    >
                      <Ionicons name={card.icon} size={20} color="#4B5563" />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{card.title}</Text>
                      <Text style={styles.cardDescription}>{card.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
        </View>
      </ScrollView>

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fef5fb",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
    alignItems: "center",
    paddingBottom: 200,
  },
  inner: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: 16,
  },
  bgLogo: {
    position: "absolute",
    width: 1400,
    height: 1400,
    opacity: 0.1,
    left: -600,
    top: 10,
    pointerEvents: "none",
  },
  pageFrame: {
    width: "100%",
    alignItems: "center",
    position: "relative",
  },
  adminIdentityDock: {
    position: "absolute",
    left: 24,
    top: 0,
    zIndex: 5,
  },
  adminIdentityInline: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  adminIdentityCard: {
    width: 174,
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: 1,
    borderColor: "rgba(245,79,165,0.22)",
    shadowColor: "#6B2149",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  adminPhotoFrame: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.92)",
    marginRight: 10,
    position: "relative",
    shadowColor: "#9D174D",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  adminPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
  },
  adminPhotoFallback: {
    flex: 1,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCE7F3",
  },
  adminPhotoFallbackText: {
    color: "#9D174D",
    fontSize: 20,
    fontWeight: "800",
  },
  adminOnlineDot: {
    position: "absolute",
    right: 0,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  adminIdentityText: {
    flex: 1,
    minWidth: 0,
  },
  adminIdentityEyebrow: {
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.7,
    color: "#9D174D",
    fontWeight: "800",
  },
  adminIdentityName: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 17,
    color: "#1F2937",
    fontWeight: "700",
  },
  adminIdentityStatus: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
    color: "#6B7280",
  },
  columns: {
    marginTop: 18,
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18,
  },
  columnsStacked: {
    flexDirection: "column",
  },
  sectionPanel: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    minWidth: 0,
  },
  scheduleSection: {
    flex: 1.55,
    backgroundColor: "rgba(255,255,255,0.48)",
    borderColor: "#F3D7E7",
  },
  operationsSection: {
    flex: 1,
    backgroundColor: "rgba(240,253,250,0.72)",
    borderColor: "#BFE8E1",
  },
  sectionPanelStacked: {
    width: "100%",
    flex: 0,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 48,
  },
  sectionHeadingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  scheduleHeadingIcon: {
    backgroundColor: "#FCE7F3",
  },
  operationsHeadingIcon: {
    backgroundColor: "#CCFBF1",
  },
  sectionHeadingText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },
  sectionDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: "#6B7280",
  },
  cardList: {
    marginTop: 12,
    width: "100%",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.997 }],
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  cardDescription: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  outingSummaryRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
    flexWrap: "wrap",
  },
  outingSummary: {
    width: "40%",
    minWidth: 300,
    flexGrow: 1,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outingSummarySecond: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE",
  },
  outingSummaryUpcoming: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  outingSummaryComplete: {
    backgroundColor: "#ECFDF3",
    borderColor: "#BBF7D0",
  },
  outingSummaryInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  outingSummaryIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  outingSummaryIconBubbleSecond: {
    backgroundColor: "#DDD6FE",
  },
  outingSummaryIconBubbleComplete: {
    backgroundColor: "#BBF7D0",
  },
  outingSummaryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9A3412",
  },
  outingSummaryTitleSecond: {
    color: "#5B21B6",
  },
  outingSummaryTitleComplete: {
    color: "#166534",
  },
  outingSummaryLine: {
    fontSize: 12,
    color: "#7C2D12",
  },
  outingSummaryLineSecond: {
    color: "#4C1D95",
  },
  outingSummaryLineComplete: {
    color: "#166534",
  },
});
