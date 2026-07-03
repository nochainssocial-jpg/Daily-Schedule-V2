import React from "react";
import { Platform, View, Text, useWindowDimensions } from "react-native";
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
  const dashboardScale = isTvDisplay
    ? Math.min(width / 1220, height / 820, width >= 2500 ? 2.2 : 1.42)
    : 1;
  const displayModeLabel = isTvDisplay ? '55\" TV mode' : "Laptop mode";

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.appFrame,
          isTvDisplay && styles.appFrameTv,
          isTvDisplay && { transform: [{ scale: dashboardScale }] },
        ]}
      >
        <View style={styles.topBar}>
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
          </View>
        </View>

        <View style={styles.currentPanelBar}>
          <View style={[styles.currentPanelPill, { backgroundColor: pageTheme.accent }]}>
            <Text style={styles.currentPanelLabel}>
              Now Displaying: <Text style={styles.currentPanelValue}>{pageLabel(currentPage)}</Text>
            </Text>
          </View>
          <Text style={styles.currentPanelCount}>
            Panel {pageIndex + 1} of {pageCount}
          </Text>
        </View>

        <View style={[styles.contentArea, { backgroundColor: pageTheme.background }]}>{children}</View>
      </View>
    </View>
  );
}
