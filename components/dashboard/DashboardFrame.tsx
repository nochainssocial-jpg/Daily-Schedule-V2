import React from "react";
import { View, Text } from "react-native";
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
  return (
    <View style={styles.screen}>
      <View style={styles.appFrame}>
        <View style={styles.topBar}>
          <View style={styles.topLeftBlock}>
            <Text style={styles.locationText}>No Chains Daily Dashboard</Text>
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
