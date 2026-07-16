import { getSydneyDateKey, getSydneyMinutesSinceMidnight, SYDNEY_TIMEZONE } from "@/lib/sydneyDate";
import {
  DASHBOARD_OPERATIONAL_TIMES,
  STAFF_FEMALE_COLOR,
  STAFF_MALE_COLOR,
  STAFF_OTHER_COLOR,
} from "./dashboardTheme";
import type { DashboardOperationalPhase, EventMeetingVisitRecord } from "./dashboardTypes";

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

export function parsePreviewTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!/^\d{1,2}:\d{2}$/.test(raw)) return null;

  const [hourRaw, minuteRaw] = raw.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

export function minutesToTimeLabel(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildDashboardDateAtMinutes(
  scheduleDate?: string | null,
  minutes?: number | null,
): Date {
  const base = scheduleDate ? new Date(`${String(scheduleDate).slice(0, 10)}T00:00:00`) : new Date();
  const d = Number.isNaN(base.getTime()) ? new Date() : base;

  if (minutes == null) return new Date();

  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export function getDashboardOperationalPhase(
  currentMinutes: number,
): DashboardOperationalPhase {
  const times = DASHBOARD_OPERATIONAL_TIMES;

  if (currentMinutes >= times.programEnds) return "dayComplete";
  if (currentMinutes >= times.checklistStarts) return "endOfShift";
  if (currentMinutes >= times.dropoffsStart) return "departureWindow";
  if (currentMinutes >= times.cleaningStarts) return "cleaningActive";
  if (currentMinutes >= times.officialStart) return "activeProgram";
  return "arrivalSetup";
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
  return getSydneyMinutesSinceMidnight();
}

export function isCurrentSlot(
  slot: any,
  tick: number,
  currentMinutes = nowMinutes(),
): boolean {
  void tick;
  const { start, end } = slotWindow(slot);
  if (start == null || end == null || end <= start) return false;
  return currentMinutes >= start && currentMinutes < end;
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
  if (!outing) return false;

  const startMinutes = parseTimeToMinutes(
    outing.startTime ?? outing.start_time,
  );
  const endMinutes = parseTimeToMinutes(
    outing.endTime ?? outing.end_time,
  );

  const staffIds = outing.staffIds ?? outing.staff_ids ?? [];
  const participantIds =
    outing.participantIds ?? outing.participant_ids ?? [];

  const hasValidTimeWindow =
    startMinutes !== null &&
    endMinutes !== null &&
    endMinutes > startMinutes;

  const hasAssignedPeople =
    (Array.isArray(staffIds) && staffIds.length > 0) ||
    (Array.isArray(participantIds) && participantIds.length > 0);

  // A default label such as "DRIVE" is only a placeholder. The dashboard
  // should show an outing only after it has a valid time window and at least
  // one assigned staff member or participant.
  return hasValidTimeWindow && hasAssignedPeople;
}


export type OutingPhase = "none" | "upcoming" | "startingSoon" | "active" | "complete";

export const OUTING_STARTING_SOON_WINDOW_MINUTES = 15;
export const OUTING_COMPLETE_VISIBLE_WINDOW_MINUTES = 5;

export function getOutingPhase(
  outing: any,
  currentMinutes = nowMinutes(),
): OutingPhase {
  if (!outing || !hasOutingContent(outing)) return "none";

  const startMinutes = parseTimeToMinutes(
    outing.startTime ?? outing.start_time,
  );
  const endMinutes = parseTimeToMinutes(
    outing.endTime ?? outing.end_time,
  );

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

export function timeNowLabel(tick: number, currentMinutes?: number | null): string {
  void tick;
  if (currentMinutes != null) return minutesToTimeLabel(currentMinutes);
  return new Date().toLocaleTimeString("en-AU", {
    timeZone: SYDNEY_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeLabel(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    timeZone: SYDNEY_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todayISODate(referenceDate = new Date()): string {
  return getSydneyDateKey(referenceDate);
}

export function shortDateAU(dateString?: string | null): string {
  if (!dateString) return "";
  const parts = String(dateString).slice(0, 10).split("-");
  if (parts.length !== 3) return String(dateString);
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function eventRelativeLabel(dateString: string, referenceDate = new Date()): string {
  const toUtcDay = (dateKey: string) => {
    const [year, month, day] = dateKey.slice(0, 10).split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };

  const eventKey = String(dateString).slice(0, 10);
  const todayKey = getSydneyDateKey(referenceDate);
  const eventDay = toUtcDay(eventKey);
  const todayDay = toUtcDay(todayKey);
  if (!Number.isFinite(eventDay) || !Number.isFinite(todayDay)) return "";

  const diffDays = Math.round((eventDay - todayDay) / 86400000);
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

function localEventTimestamp(
  eventDate?: string | null,
  time?: string | null,
): number | null {
  const datePart = String(eventDate || "").slice(0, 10);
  const timePart = String(time || "").slice(0, 5);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  if (!/^\d{2}:\d{2}$/.test(timePart)) return null;

  const timestamp = new Date(`${datePart}T${timePart}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function eventDashboardExpiryTimestamp(
  item: EventMeetingVisitRecord,
): number | null {
  const explicitUntilDate = item.display_until ? new Date(item.display_until) : null;
  const explicitUntil =
    explicitUntilDate && Number.isFinite(explicitUntilDate.getTime())
      ? explicitUntilDate.getTime()
      : null;

  const datePart = String(item.event_date || "").slice(0, 10);
  const endOfEventDay = /^\d{4}-\d{2}-\d{2}$/.test(datePart)
    ? new Date(`${datePart}T23:59:59.999`).getTime()
    : null;

  let eventEnd = item.all_day
    ? endOfEventDay
    : localEventTimestamp(item.event_date, item.end_time) ?? endOfEventDay;

  const eventStart = item.all_day
    ? null
    : localEventTimestamp(item.event_date, item.start_time);

  // Support the rare case where an item ends after midnight.
  if (eventStart != null && eventEnd != null && eventEnd <= eventStart) {
    eventEnd += 24 * 60 * 60 * 1000;
  }

  if (explicitUntil != null && explicitUntilDate) {
    const explicitLocalDate = [
      explicitUntilDate.getFullYear(),
      pad2(explicitUntilDate.getMonth() + 1),
      pad2(explicitUntilDate.getDate()),
    ].join("-");
    const explicitMinutes =
      explicitUntilDate.getHours() * 60 + explicitUntilDate.getMinutes();

    // Older records used 11:59 pm on the event day as an automatic default.
    // For timed items, treat that legacy value as the event's own end time.
    const isLegacyEndOfDayDefault =
      !item.all_day &&
      eventEnd != null &&
      explicitLocalDate === datePart &&
      explicitMinutes >= 23 * 60 + 58;

    if (!isLegacyEndOfDayDefault) return explicitUntil;
  }

  return eventEnd ?? explicitUntil;
}

export function isEventDashboardExpired(
  item: EventMeetingVisitRecord,
  nowTimestamp = Date.now(),
): boolean {
  const expiry = eventDashboardExpiryTimestamp(item);
  return expiry != null && nowTimestamp >= expiry;
}

export function isEventDashboardVisible(
  item: EventMeetingVisitRecord,
  tick: number,
  nowTimestamp = Date.now(),
): boolean {
  void tick;
  if (!item.dashboard_visible) return false;
  if (
    item.status === "Completed" ||
    item.status === "Cancelled" ||
    item.status === "Archived"
  ) {
    return false;
  }

  const now = nowTimestamp;
  const from = item.display_from ? new Date(item.display_from).getTime() : null;

  if (from != null && Number.isFinite(from) && now < from) return false;
  if (isEventDashboardExpired(item, now)) return false;
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
