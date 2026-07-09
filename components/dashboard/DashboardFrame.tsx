import React from "react";
import { Platform, Pressable, View, Text, useWindowDimensions } from "react-native";
import { styles } from "./dashboardStyles";
import {
  DASHBOARD_PHASE_LABELS,
  DASHBOARD_REFRESH_MS,
  HOUSE_ID,
  ROTATE_MS,
  pageLabel,
} from "./dashboardTheme";
import type { DashboardOperationalPhase, DashboardPage } from "./dashboardTypes";
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
  currentMinutes?: number | null;
  isPreviewMode?: boolean;
  previewTimeLabel?: string | null;
  operationalPhase?: DashboardOperationalPhase;
  autoRotationEnabled?: boolean;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  onToggleAutoRotation?: () => void;
  children: React.ReactNode;
};

const TV_CANVAS_WIDTH = 1280;
const TV_CANVAS_HEIGHT = 720;
const TV_PREVIEW_SAFE_SCALE = 0.985;

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
  currentMinutes = null,
  isPreviewMode = false,
  previewTimeLabel = null,
  operationalPhase,
  autoRotationEnabled = true,
  onPreviousPage,
  onNextPage,
  onToggleAutoRotation,
  children,
}: Props) {
  const { width, height } = useWindowDimensions();

  const displayOverride = (() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    try {
      const value = new URLSearchParams(window.location.search).get("display")?.toLowerCase();
      return value === "tv" || value === "laptop" ? value : null;
    } catch {
      return null;
    }
  })();

  // TV mode is now an explicit 16:9 canvas. This gives the iMac and the 55" TV
  // the same layout proportions: on a computer it previews the TV canvas, and on
  // the TV it scales safely inside the available viewport without edge cropping.
  const isTvDisplay = displayOverride === "tv";
  const displayModeLabel = isTvDisplay ? '55" TV mode' : "Laptop mode";
  const tvScale = isTvDisplay
    ? Math.min(width / TV_CANVAS_WIDTH, height / TV_CANVAS_HEIGHT) * TV_PREVIEW_SAFE_SCALE
    : 1;

  const frame = (
    <View style={[styles.appFrame, isTvDisplay && styles.appFrameTv]}>
      <View style={[styles.topBar, isTvDisplay && styles.topBarTv]}>
        <View style={styles.topLeftBlock}>
          <Text style={[styles.locationText, isTvDisplay && styles.locationTextTv]}>
            Daily Operations Dashboard
          </Text>
          <Text style={[styles.programText, isTvDisplay && styles.programTextTv]}>
            Location: {HOUSE_ID} Day Program
          </Text>
          <Text style={[styles.dateText, isTvDisplay && styles.dateTextTv]}>{formatDateKey(date)}</Text>
          {operationalPhase ? (
            <Text style={[styles.phaseText, isTvDisplay && styles.phaseTextTv]}>
              Phase: {DASHBOARD_PHASE_LABELS[operationalPhase]}
            </Text>
          ) : null}
        </View>
        <View style={styles.clockBlock}>
          <Text style={[styles.clockText, isTvDisplay && styles.clockTextTv]}>{timeNowLabel(tick, currentMinutes)}</Text>
          {isPreviewMode ? (
            <Text style={[styles.previewClockText, isTvDisplay && styles.previewClockTextTv]}>
              Preview time: {previewTimeLabel || timeNowLabel(tick, currentMinutes)}
            </Text>
          ) : null}
          {isTvDisplay ? (
            <>
              <Text style={styles.cycleInlineTextTv}>
                (Cycles every {Math.round(ROTATE_MS / 1000)}s   |   Refresh every {Math.round(DASHBOARD_REFRESH_MS / 1000)}s)
              </Text>
              <Text style={styles.cycleTextTv}>
                Last updated: {lastDashboardRefresh ? timeLabel(lastDashboardRefresh) : "Loading..."}
              </Text>
              <Text style={styles.cycleTextTv}>Display: {displayModeLabel}</Text>
            </>
          ) : (
            <>
              <Text style={styles.cycleText}>
                Cycles every {Math.round(ROTATE_MS / 1000)}s
              </Text>
              <Text style={styles.cycleText}>
                Refresh every {Math.round(DASHBOARD_REFRESH_MS / 1000)}s
              </Text>
              <Text style={styles.cycleText}>
                Updated: {lastDashboardRefresh ? timeLabel(lastDashboardRefresh) : "Loading..."}
              </Text>
              <Text style={styles.cycleText}>Display: {displayModeLabel}</Text>
            </>
          )}
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
            <Text style={[styles.currentPanelLabel, isTvDisplay && styles.currentPanelLabelTv]}>
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
        <View style={styles.panelControlsRow}>
          {onPreviousPage && onNextPage && onToggleAutoRotation ? (
            <View style={[styles.manualNavControls, isTvDisplay && styles.manualNavControlsTv]}>
              <Pressable onPress={onPreviousPage} style={styles.manualNavButton}>
                <Text style={styles.manualNavButtonText}>←</Text>
              </Pressable>
              <Pressable
                onPress={onToggleAutoRotation}
                style={[
                  styles.manualAutoButton,
                  autoRotationEnabled && styles.manualAutoButtonEnabled,
                ]}
              >
                <Text style={styles.manualAutoButtonText}>
                  {autoRotationEnabled ? "Auto" : "Manual"}
                </Text>
              </Pressable>
              <Pressable onPress={onNextPage} style={styles.manualNavButton}>
                <Text style={styles.manualNavButtonText}>→</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={[styles.currentPanelCount, isTvDisplay && styles.currentPanelCountTv]}>
            Panel {pageIndex + 1} of {pageCount}
          </Text>
        </View>
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
  );

  if (isTvDisplay) {
    return (
      <View style={styles.screenTvPreview}>
        <View
          style={[
            styles.tvCanvasViewport,
            {
              width: TV_CANVAS_WIDTH * tvScale,
              height: TV_CANVAS_HEIGHT * tvScale,
            },
          ]}
        >
          <View
            style={[
              styles.tvCanvasSurface,
              {
                width: TV_CANVAS_WIDTH,
                height: TV_CANVAS_HEIGHT,
                transform: [{ scale: tvScale }],
              } as any,
            ]}
          >
            {frame}
          </View>
        </View>
      </View>
    );
  }

  return <View style={styles.screen}>{frame}</View>;
}
