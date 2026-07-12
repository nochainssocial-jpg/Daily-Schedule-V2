import React, { useMemo } from "react";
import { Text, View } from "react-native";
import type { EventMeetingVisitRecord } from "./dashboardTypes";
import { DASHBOARD_OPERATIONAL_TIMES } from "./dashboardTheme";
import { getOutingPhase, todayISODate } from "./dashboardUtils";
import { styles } from "./dashboardStyles";

type PillTone =
  | "morning"
  | "active"
  | "outing"
  | "meeting"
  | "lunch"
  | "cleaning"
  | "lounge"
  | "dropoffs"
  | "complete";

type DailyPhasePill = {
  key: string;
  label: string;
  tone: PillTone;
};

type Props = {
  currentMinutes: number;
  dashboardNow: Date;
  outings: any[];
  todayEventsMeetingsVisits: EventMeetingVisitRecord[];
};

const LUNCH_START = 11 * 60;
const LUNCH_END = 12 * 60;
const CLEANING_END = 14 * 60;
const LOUNGE_START = 14 * 60;
const LOUNGE_END = 14 * 60 + 15;
const OUTING_WINDOW_END = 14 * 60;

function parseEventTime(value?: string | null): number | null {
  if (!value) return null;

  const match = String(value)
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/);

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3];

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;

  if (suffix === "am" && hour === 12) hour = 0;
  if (suffix === "pm" && hour !== 12) hour += 12;

  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

function isMeetingOrVisitActive(
  item: EventMeetingVisitRecord,
  currentMinutes: number,
  dashboardNow: Date,
): boolean {
  if (item.main_category !== "Meeting" && item.main_category !== "Visit") return false;
  if (String(item.event_date).slice(0, 10) !== todayISODate(dashboardNow)) return false;
  if (item.status === "Cancelled" || item.status === "Archived" || item.status === "Completed") {
    return false;
  }

  if (item.all_day) {
    return (
      currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.officialStart &&
      currentMinutes < DASHBOARD_OPERATIONAL_TIMES.programEnds
    );
  }

  const start = parseEventTime(item.start_time);
  const end = parseEventTime(item.end_time);

  if (start !== null && end !== null) return currentMinutes >= start && currentMinutes < end;
  if (start !== null) return currentMinutes >= start && currentMinutes < start + 60;
  if (end !== null) {
    return currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.officialStart && currentMinutes < end;
  }

  return (
    currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.officialStart &&
    currentMinutes < DASHBOARD_OPERATIONAL_TIMES.programEnds
  );
}

const toneStyles: Record<PillTone, { pill: any; dot: any; text: any }> = {
  morning: {
    pill: styles.dailyPhasePillMorning,
    dot: styles.dailyPhaseDotMorning,
    text: styles.dailyPhaseTextMorning,
  },
  active: {
    pill: styles.dailyPhasePillActive,
    dot: styles.dailyPhaseDotActive,
    text: styles.dailyPhaseTextActive,
  },
  outing: {
    pill: styles.dailyPhasePillOuting,
    dot: styles.dailyPhaseDotOuting,
    text: styles.dailyPhaseTextOuting,
  },
  meeting: {
    pill: styles.dailyPhasePillMeeting,
    dot: styles.dailyPhaseDotMeeting,
    text: styles.dailyPhaseTextMeeting,
  },
  lunch: {
    pill: styles.dailyPhasePillLunch,
    dot: styles.dailyPhaseDotLunch,
    text: styles.dailyPhaseTextLunch,
  },
  cleaning: {
    pill: styles.dailyPhasePillCleaning,
    dot: styles.dailyPhaseDotCleaning,
    text: styles.dailyPhaseTextCleaning,
  },
  lounge: {
    pill: styles.dailyPhasePillLounge,
    dot: styles.dailyPhaseDotLounge,
    text: styles.dailyPhaseTextLounge,
  },
  dropoffs: {
    pill: styles.dailyPhasePillDropoffs,
    dot: styles.dailyPhaseDotDropoffs,
    text: styles.dailyPhaseTextDropoffs,
  },
  complete: {
    pill: styles.dailyPhasePillComplete,
    dot: styles.dailyPhaseDotComplete,
    text: styles.dailyPhaseTextComplete,
  },
};

export function DailyPhasePills({
  currentMinutes,
  dashboardNow,
  outings,
  todayEventsMeetingsVisits,
}: Props) {
  const pills = useMemo<DailyPhasePill[]>(() => {
    const next: DailyPhasePill[] = [];
    const times = DASHBOARD_OPERATIONAL_TIMES;

    if (currentMinutes >= times.arrivalsStart && currentMinutes < times.officialStart) {
      next.push({ key: "morning", label: "Morning Setup", tone: "morning" });
    }

    if (currentMinutes >= times.officialStart && currentMinutes < times.programEnds) {
      next.push({ key: "active", label: "Day Program Active", tone: "active" });
    }

    const outingInProgress =
      currentMinutes >= times.officialStart &&
      currentMinutes < OUTING_WINDOW_END &&
      (outings || []).some((outing) => getOutingPhase(outing, currentMinutes) === "active");

    if (outingInProgress) {
      next.push({ key: "outing", label: "Outing in Progress", tone: "outing" });
    }

    const meetingOrVisitInProgress = (todayEventsMeetingsVisits || []).some((item) =>
      isMeetingOrVisitActive(item, currentMinutes, dashboardNow),
    );

    if (meetingOrVisitInProgress) {
      next.push({
        key: "meeting",
        label: "Meeting / Visit in Progress",
        tone: "meeting",
      });
    }

    if (currentMinutes >= LUNCH_START && currentMinutes < LUNCH_END) {
      next.push({ key: "lunch", label: "Lunch Time", tone: "lunch" });
    }

    if (currentMinutes >= times.cleaningStarts && currentMinutes < CLEANING_END) {
      next.push({ key: "cleaning", label: "Cleaning in Progress", tone: "cleaning" });
    }

    if (currentMinutes >= times.dropoffsStart && currentMinutes < times.programEnds) {
      next.push({ key: "dropoffs", label: "Drop Offs", tone: "dropoffs" });
    }

    if (currentMinutes >= LOUNGE_START && currentMinutes < LOUNGE_END) {
      next.push({ key: "lounge", label: "Move to Lounge Room", tone: "lounge" });
    }

    if (currentMinutes >= times.programEnds) {
      return [{ key: "complete", label: "Day Program Complete", tone: "complete" }];
    }

    return next;
  }, [currentMinutes, dashboardNow, outings, todayEventsMeetingsVisits]);

  if (!pills.length) return null;

  return (
    <View style={styles.dailyPhasePillOverlay} pointerEvents="none">
      {pills.map((pill) => {
        const tone = toneStyles[pill.tone];
        return (
          <View key={pill.key} style={[styles.dailyPhasePill, tone.pill]}>
            <View style={[styles.dailyPhaseDot, tone.dot]} />
            <Text style={[styles.dailyPhaseText, tone.text]} numberOfLines={1}>
              {pill.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
