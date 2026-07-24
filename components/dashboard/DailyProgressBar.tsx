import React, { useMemo } from "react";
import { View } from "react-native";
import {
  Car,
  CheckSquare,
  Sparkles,
  Star,
  Utensils,
  Users,
  Wrench,
} from "lucide-react-native";
import { styles } from "./dashboardStyles";
import { DASHBOARD_OPERATIONAL_TIMES } from "./dashboardTheme";

type ProgressState = "completed" | "current" | "upcoming";

type Segment = {
  key: string;
  label: string;
  start: number;
  end: number | null;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

type Props = {
  currentMinutes: number;
};

const SEGMENTS: Segment[] = [
  {
    key: "setup",
    label: "Morning Setup",
    start: DASHBOARD_OPERATIONAL_TIMES.arrivalsStart,
    end: DASHBOARD_OPERATIONAL_TIMES.officialStart,
    Icon: Wrench,
  },
  {
    key: "start",
    label: "Day Program Start",
    start: DASHBOARD_OPERATIONAL_TIMES.officialStart,
    end: DASHBOARD_OPERATIONAL_TIMES.dayProgramStartEnds,
    Icon: Users,
  },
  {
    key: "activities-am",
    label: "Morning Activities",
    start: DASHBOARD_OPERATIONAL_TIMES.dayProgramStartEnds,
    end: DASHBOARD_OPERATIONAL_TIMES.lunchStarts,
    Icon: Star,
  },
  {
    key: "lunch",
    label: "Lunch",
    start: DASHBOARD_OPERATIONAL_TIMES.lunchStarts,
    end: DASHBOARD_OPERATIONAL_TIMES.afternoonActivitiesStart,
    Icon: Utensils,
  },
  {
    key: "activities-pm",
    label: "Afternoon Activities",
    start: DASHBOARD_OPERATIONAL_TIMES.afternoonActivitiesStart,
    end: DASHBOARD_OPERATIONAL_TIMES.cleaningStarts,
    Icon: Star,
  },
  {
    key: "cleaning",
    label: "Cleaning",
    start: DASHBOARD_OPERATIONAL_TIMES.cleaningStarts,
    end: DASHBOARD_OPERATIONAL_TIMES.dropoffsStart,
    Icon: Sparkles,
  },
  {
    key: "dropoffs",
    label: "Drop-offs / Lounge Transition",
    start: DASHBOARD_OPERATIONAL_TIMES.dropoffsStart,
    end: DASHBOARD_OPERATIONAL_TIMES.checklistStarts,
    Icon: Car,
  },
  {
    key: "checklist",
    label: "End-of-Shift Checklist",
    start: DASHBOARD_OPERATIONAL_TIMES.checklistStarts,
    end: DASHBOARD_OPERATIONAL_TIMES.programEnds,
    Icon: CheckSquare,
  },
  {
    key: "complete",
    label: "Day Program Complete",
    start: DASHBOARD_OPERATIONAL_TIMES.programEnds,
    end: null,
    Icon: CheckSquare,
  },
];

function getState(segment: Segment, currentMinutes: number): ProgressState {
  if (currentMinutes < segment.start) return "upcoming";
  if (segment.end === null) return "current";
  if (currentMinutes >= segment.end) return "completed";
  return "current";
}

function getCurrentFill(segment: Segment, currentMinutes: number): number {
  if (segment.end === null) return 100;
  const duration = Math.max(1, segment.end - segment.start);
  return Math.max(0, Math.min(100, ((currentMinutes - segment.start) / duration) * 100));
}

export function DailyProgressBar({ currentMinutes }: Props) {
  const segments = useMemo(
    () =>
      SEGMENTS.map((segment) => ({
        ...segment,
        state: getState(segment, currentMinutes),
        fill: getCurrentFill(segment, currentMinutes),
      })),
    [currentMinutes],
  );

  return (
    <View
      style={styles.dailyProgressOverlay}
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityLabel="Daily program progress"
    >
      <View style={styles.dailyProgressTrack}>
        {segments.map((segment, index) => {
          const isCompleted = segment.state === "completed";
          const isCurrent = segment.state === "current";
          const iconColor = isCompleted || isCurrent ? "#FFFFFF" : "#8B9BA3";
          const Icon = segment.Icon;

          return (
            <View
              key={segment.key}
              style={[
                styles.dailyProgressSegment,
                index === 0 && styles.dailyProgressSegmentFirst,
                index === segments.length - 1 && styles.dailyProgressSegmentLast,
                index > 0 && styles.dailyProgressSegmentDivider,
                isCompleted && styles.dailyProgressSegmentCompleted,
                isCurrent && styles.dailyProgressSegmentCurrent,
              ]}
              accessibilityLabel={segment.label}
            >
              {isCurrent && segment.end !== null ? (
                <View
                  style={[
                    styles.dailyProgressCurrentFill,
                    { width: `${segment.fill}%` as any },
                  ]}
                />
              ) : null}
              {isCurrent ? (
                <View
                  style={[
                    styles.dailyProgressCurrentGlow,
                    index === 0 && styles.dailyProgressCurrentGlowFirst,
                    index === segments.length - 1 && styles.dailyProgressCurrentGlowLast,
                  ]}
                />
              ) : null}
              <View style={styles.dailyProgressIconWrap}>
                <Icon size={15} color={iconColor} strokeWidth={2.7} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
