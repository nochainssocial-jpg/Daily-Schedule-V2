import React from "react";
import { Platform, Pressable, View, Text, useWindowDimensions } from "react-native";
import { styles } from "./dashboardStyles";
import { DASHBOARD_REFRESH_MS, HOUSE_ID, ROTATE_MS, pageLabel } from "./dashboardTheme";
import type { DashboardPage } from "./dashboardTypes";
import { formatDateKey, timeLabel, timeNowLabel } from "./dashboardUtils";

type Props = {
  date?: string | null;
  tick: number;
  lastDashboardRefresh: Date | null;
  currentPage: DashboardPage;
  pageIndex: number;
  pageCount: number;
  pageTheme: { background: string; accent: string };
  voiceAnnouncementsEnabled?: boolean;
  voiceAnnouncementsSupported?: boolean;
  onToggleVoiceAnnouncements?: () => void;
  children: React.ReactNode;
};

export function DashboardFrame({
  date,
  tick,
  lastDashboardRefresh,
  currentPage,
  pageIndex,
  pageCount,
  pageTheme,
  voiceAnnouncementsEnabled = false,
  voiceAnnouncementsSupported = false,
  onToggleVoiceAnnouncements,
  children,
}: Props) {
  const { width, height } = useWindowDimensions();

  const displayOverride = (() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    try {
      const value = new URLSearchParams(window.location.search).get("display");
      return value === "tv" || value === "laptop" ? value : null;
    } catch {
      return null;
    }
  })();

  // 55" TV target: most Google TV devices output the browser at a 16:9
  // viewport such as 1920 x 1080. Laptop remains the default profile; TV mode
  // is enabled automatically on large screens or manually with ?display=tv.
  const isLargeScreen = Platform.OS === "web" && (width >= 1500 || height >= 900);
  const isTvDisplay = displayOverride === "tv" || (displayOverride !== "laptop" && isLargeScreen);
  const displayModeLabel = isTvDisplay ? '55\" TV mode' : "Laptop mode";

  const tvViewportStyle = isTvDisplay
    ? ({
        position: "fixed",
        // Small inset protects the dashboard from TV overscan/cast cropping
        // while still keeping it visually full-screen.
        top: 8,
        right: 24,
        bottom: 8,
        left: 24,
        width: "auto",
        height: "auto",
        maxWidth: "none",
        borderRadius: 0,
      } as const)
    : null;

  return (
    <View style={[styles.screen, isTvDisplay && styles.screenTv]}>
      <View
        style={[
          styles.appFrame,
          isTvDisplay && styles.appFrameTv,
          tvViewportStyle,
        ]}
      >
        <View style={[styles.topBar, isTvDisplay && styles.topBarTv]}>
          <View style={styles.topLeftBlock}>
            <Text style={styles.locationText}>Daily Operations Dashboard</Text>
            <Text style={styles.programText}>Location: {HOUSE_ID} Day Program</Text>
            <Text style={styles.dateText}>{formatDateKey(date)}</Text>
          </View>
          <View style={styles.clockBlock}>
            <Text style={styles.clockText}>{timeNowLabel(tick)}</Text>
            <Text style={styles.cycleText}>
              (Cycles through tabs every {Math.round(ROTATE_MS / 1000)} seconds)
            </Text>
            <Text style={styles.cycleText}>
              Soft refresh every {Math.round(DASHBOARD_REFRESH_MS / 1000)} seconds
            </Text>
            <Text style={styles.cycleText}>
              Last updated: {lastDashboardRefresh ? timeLabel(lastDashboardRefresh) : "Loading..."}
            </Text>
            <Text style={styles.cycleText}>Display: {displayModeLabel}</Text>
            {!isTvDisplay && voiceAnnouncementsSupported && onToggleVoiceAnnouncements ? (
              <Pressable
                onPress={onToggleVoiceAnnouncements}
                style={[
                  styles.voiceToggle,
                  voiceAnnouncementsEnabled && styles.voiceToggleEnabled,
                ]}
              >
                <Text style={styles.voiceToggleText}>
                  {voiceAnnouncementsEnabled
                    ? "Voice announcements on"
                    : "Enable voice announcements"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={[styles.currentPanelBar, isTvDisplay && styles.currentPanelBarTv]}>
          <View style={styles.currentPanelLeft}>
            <View style={[styles.currentPanelPill, { backgroundColor: pageTheme.accent }]}>
              <Text style={styles.currentPanelLabel}>
                Now Displaying: <Text style={styles.currentPanelValue}>{pageLabel(currentPage)}</Text>
              </Text>
            </View>
            {isTvDisplay && voiceAnnouncementsSupported && onToggleVoiceAnnouncements ? (
              <Pressable
                onPress={onToggleVoiceAnnouncements}
                style={[
                  styles.voiceToggleBar,
                  voiceAnnouncementsEnabled && styles.voiceToggleBarEnabled,
                ]}
              >
                <Text style={styles.voiceToggleBarText}>
                  {voiceAnnouncementsEnabled ? "Voice on" : "Enable voice"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.currentPanelCount}>
            Panel {pageIndex + 1} of {pageCount}
          </Text>
        </View>

        <View
          style={[
            styles.contentArea,
            isTvDisplay && styles.contentAreaTv,
            { backgroundColor: pageTheme.background },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
