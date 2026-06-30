import { STAFF_FEMALE_COLOR, STAFF_MALE_COLOR, STAFF_OTHER_COLOR } from "./dashboardTheme";
import type { EventMeetingVisitRecord } from "./dashboardTypes";

export function normaliseHexColor(value?: string | null, fallback = STAFF_OTHER_COLOR): string {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
}

export function colorForStaff(person?: any): string {
  const gender = String(person?.gender || "").trim().toLowerCase();
  const fallback =
    gender === "male"
      ? STAFF_MALE_COLOR
      : gender === "female"
        ? STAFF_FEMALE_COLOR
        : STAFF_OTHER_COLOR;
  return normaliseHexColor(person?.color, fallback);
}

export function readableTextColor(backgroundColor: string): string {
  const hex = normaliseHexColor(backgroundColor, STAFF_OTHER_COLOR).replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? "#111827" : "#FFFFFF";
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDateKey(date?: string | null): string {
  if (!date) return "";
  const parts = String(date).slice(0, 10).split("-");
  if (parts.length !== 3) return String(date);
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  let raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes("-")) raw = raw.split("-")[0].trim();
  raw = raw.replace(/\s+/g, "").replace(/\./g, ":");

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3];

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  if (suffix === "am") {
    if (hour === 12) hour = 0;
  } else if (suffix === "pm") {
    if (hour !== 12) hour += 12;
  } else if (hour <= 6) {
    // Match existing app behaviour for bare afternoon times such as 2:00.
    hour += 12;
  }

  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

export function slotWindow(slot: any): { start: number | null; end: number | null } {
  if (!slot) return { start: null, end: null };

  const display = String(slot.displayTime || slot.display_time || "").trim();
  const displayParts = display.includes("-") ? display.split("-") : [];

  const start =
    parseTimeToMinutes(slot.startTime) ??
    parseTimeToMinutes(slot.start_time) ??
    parseTimeToMinutes(displayParts[0]);

  const end =
    parseTimeToMinutes(slot.endTime) ??
    parseTimeToMinutes(slot.end_time) ??
    parseTimeToMinutes(displayParts[1]);

  return { start, end };
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function isCurrentSlot(slot: any, tick: number): boolean {
  void tick;
  const { start, end } = slotWindow(slot);
  if (start == null || end == null || end <= start) return false;
  const now = nowMinutes();
  return now >= start && now < end;
}

export function slotLabel(slot: any): string {
  const display = slot?.displayTime || slot?.display_time;
  if (display) return String(display);
  const start = slot?.startTime || slot?.start_time || "";
  const end = slot?.endTime || slot?.end_time || "";
  return `${start} - ${end}`.trim();
}

export function isFsoSlot(slot: any): boolean {
  const { start, end } = slotWindow(slot);

  // Twins FSO / nappy-change slots: 11:00–11:30 and 1:00–1:30.
  if (start === 11 * 60 && end === 11 * 60 + 30) return true;
  if (start === 13 * 60 && end === 13 * 60 + 30) return true;

  const label = slotLabel(slot).replace(/\s+/g, "").toLowerCase();
  return (
    label.includes("11:00am-11:30am") ||
    label.includes("11:00-11:30") ||
    label.includes("1:00pm-1:30pm") ||
    label.includes("13:00-13:30")
  );
}

export function hasOutingContent(outing: any): boolean {
  return Boolean(
    String(outing?.name || "").trim() ||
      String(outing?.startTime || "").trim() ||
      String(outing?.endTime || "").trim() ||
      String(outing?.notes || "").trim() ||
      (outing?.staffIds?.length ?? 0) > 0 ||
      (outing?.participantIds?.length ?? 0) > 0,
  );
}


export type OutingPhase = "none" | "upcoming" | "startingSoon" | "active" | "complete";

export const OUTING_STARTING_SOON_WINDOW_MINUTES = 15;
export const OUTING_COMPLETE_VISIBLE_WINDOW_MINUTES = 5;

export function getOutingPhase(
  outing: any,
  currentMinutes = nowMinutes(),
): OutingPhase {
  if (!outing || !hasOutingContent(outing)) return "none";

  const startMinutes = parseTimeToMinutes(outing.startTime);
  const endMinutes = parseTimeToMinutes(outing.endTime);

  // If a basic outing has been entered but no usable times exist, keep it as
  // upcoming rather than treating it as permanently active.
  if (startMinutes === null && endMinutes === null) return "upcoming";

  if (startMinutes !== null && currentMinutes < startMinutes) {
    return startMinutes - currentMinutes <= OUTING_STARTING_SOON_WINDOW_MINUTES
      ? "startingSoon"
      : "upcoming";
  }

  // Once started, keep it visible until the end time. If no end time exists,
  // there is no safe way to auto-hide it, so keep it active.
  if (endMinutes === null) return "active";

  if (currentMinutes <= endMinutes) return "active";

  // Give staff a very brief completed state, then remove it from the dashboard.
  if (currentMinutes - endMinutes <= OUTING_COMPLETE_VISIBLE_WINDOW_MINUTES) {
    return "complete";
  }

  return "none";
}

export function outingPhaseLabel(phase: OutingPhase): string {
  if (phase === "startingSoon") return "Starting soon";
  if (phase === "active") return "In progress";
  if (phase === "complete") return "Complete";
  if (phase === "upcoming") return "Upcoming";
  return "";
}

export function namesFromIds(
  ids: any[] | undefined,
  peopleById: Map<string, any>,
): string[] {
  return (ids || [])
    .map((id) => peopleById.get(String(id))?.name || String(id))
    .filter(Boolean);
}

export function shortNames(names: string[]): string {
  return names.length ? names.join(", ") : "—";
}

export function timeNowLabel(tick: number): string {
  void tick;
  return new Date().toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeLabel(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function shortDateAU(dateString?: string | null): string {
  if (!dateString) return "";
  const parts = String(dateString).slice(0, 10).split("-");
  if (parts.length !== 3) return String(dateString);
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function eventRelativeLabel(dateString: string): string {
  const [year, month, day] = String(dateString).slice(0, 10).split("-").map(Number);
  const eventDate = new Date(year, month - 1, day);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((eventDate.getTime() - todayStart.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return "Yesterday";
  return `${Math.abs(diffDays)} days ago`;
}

export function eventTimeRange(item: EventMeetingVisitRecord): string {
  if (item.all_day) return "All day";
  const start = item.start_time ? item.start_time.slice(0, 5) : "";
  const end = item.end_time ? item.end_time.slice(0, 5) : "";
  if (start && end) return `${start} – ${end}`;
  return start || end || "Time not set";
}

export function isEventDashboardVisible(item: EventMeetingVisitRecord, tick: number): boolean {
  void tick;
  if (!item.dashboard_visible) return false;
  if (item.status === "Cancelled" || item.status === "Archived") return false;

  const now = Date.now();
  const from = item.display_from ? new Date(item.display_from).getTime() : null;
  const until = item.display_until ? new Date(item.display_until).getTime() : null;

  if (from != null && Number.isFinite(from) && now < from) return false;
  if (until != null && Number.isFinite(until) && now > until) return false;
  return true;
}

export function sortEventsMeetingsVisits(
  a: EventMeetingVisitRecord,
  b: EventMeetingVisitRecord,
): number {
  const dateCompare = String(a.event_date).localeCompare(String(b.event_date));
  if (dateCompare !== 0) return dateCompare;
  return String(a.start_time || "23:59").localeCompare(String(b.start_time || "23:59"));
}
