import { ROOM_KEYS, ROOM_LABELS } from "./dashboardTheme";
import { nowMinutes, parseTimeToMinutes, slotLabel, slotWindow } from "./dashboardUtils";

type StaffLookup = Map<string, any>;

type FloatingAnnouncementResult = {
  key: string;
  message: string;
  slotLabel: string;
  minutesUntil: number;
};

function getSpeechApi(): {
  synth: SpeechSynthesis;
  Utterance: typeof SpeechSynthesisUtterance;
} | null {
  if (typeof window === "undefined") return null;

  const maybeWindow = window as typeof window & {
    speechSynthesis?: SpeechSynthesis;
    SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  };

  if (!maybeWindow.speechSynthesis || !maybeWindow.SpeechSynthesisUtterance) {
    return null;
  }

  return {
    synth: maybeWindow.speechSynthesis,
    Utterance: maybeWindow.SpeechSynthesisUtterance,
  };
}

export function isDashboardSpeechSupported(): boolean {
  return Boolean(getSpeechApi());
}

export function speakDashboardAnnouncement(message: string): boolean {
  const api = getSpeechApi();
  if (!api || !message.trim()) return false;

  try {
    api.synth.cancel();

    const utterance = new api.Utterance(message);
    utterance.lang = "en-AU";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;

    api.synth.speak(utterance);
    return true;
  } catch (error) {
    console.error("[dashboard voice] failed to speak announcement", error);
    return false;
  }
}

function getSlotStartMinutes(slot: any): number | null {
  const window = slotWindow(slot);
  if (window.start != null) return window.start;
  return (
    parseTimeToMinutes(slot?.startTime) ??
    parseTimeToMinutes(slot?.start_time) ??
    parseTimeToMinutes(String(slotLabel(slot)).split("-")[0])
  );
}

export function buildUpcomingFloatingRotationAnnouncement({
  date,
  displayTimeSlots,
  floatingAssignments,
  staffById,
  tick,
  currentMinutes,
  noticeMinutes = 1,
}: {
  date?: string | null;
  displayTimeSlots: any[];
  floatingAssignments: any;
  staffById: StaffLookup;
  tick: number;
  currentMinutes?: number;
  noticeMinutes?: number;
}): FloatingAnnouncementResult | null {
  void tick;

  const comparisonMinutes = currentMinutes ?? nowMinutes();

  for (const [index, slot] of (displayTimeSlots || []).entries()) {
    const slotId = String(slot?.id ?? index);
    const start = getSlotStartMinutes(slot);
    if (start == null) continue;

    const minutesUntil = start - comparisonMinutes;
    if (minutesUntil < 0 || minutesUntil > noticeMinutes) continue;

    const row = floatingAssignments?.[slotId] || {};
    const assignmentPhrases = ROOM_KEYS.map((room) => {
      const staffId = row?.[room] ? String(row[room]) : "";
      const staffName = staffId ? String(staffById.get(staffId)?.name || "").trim() : "";
      if (!staffName || staffName === "—") return null;
      return `${staffName} to ${ROOM_LABELS[room]}`;
    }).filter(Boolean) as string[];

    if (!assignmentPhrases.length) continue;

    return {
      key: `${date || "today"}:floating:${slotId}:${assignmentPhrases.join("|")}`,
      message: `Upcoming floating rotation. ${assignmentPhrases.join(". ")}. Please prepare to transition.`,
      slotLabel: slotLabel(slot),
      minutesUntil,
    };
  }

  return null;
}
