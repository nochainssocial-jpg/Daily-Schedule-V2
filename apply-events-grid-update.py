#!/usr/bin/env python3
"""Apply the Events | Meetings | Visits dashboard grid update.

Run from the Daily Schedule App repository root:
    python3 apply-events-grid-update.py

The script only changes the event/visit-specific sections so newer banner,
cleaning-card, celebration and pill positioning work is preserved.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path.cwd()

FILES = {
    "panel": ROOT / "components/dashboard/EventsMeetingsVisitsPanel.tsx",
    "styles": ROOT / "components/dashboard/dashboardStyles.ts",
    "utils": ROOT / "components/dashboard/dashboardUtils.ts",
    "dashboard": ROOT / "app/dashboard.tsx",
    "editor": ROOT / "app/edit/events-meetings-visits.tsx",
}

PANEL_SOURCE = r'''import React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EVENT_CARD_THEMES } from "./dashboardTheme";
import type { EventMeetingVisitRecord } from "./dashboardTypes";
import { eventRelativeLabel, eventTimeRange, shortDateAU } from "./dashboardUtils";
import { styles } from "./dashboardStyles";

const MAX_VISIBLE_PER_SECTION = 4;

function EventCard({
  item,
  number,
  highlight = false,
}: {
  item: EventMeetingVisitRecord;
  number: number;
  highlight?: boolean;
}) {
  const peopleRow = [
    item.responsible_staff ? `Host: ${item.responsible_staff}` : "",
    item.visitor_name ? `Visitor: ${item.visitor_name}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const placeRow = [
    item.organisation ? `Organisation: ${item.organisation}` : "",
    item.location ? `Location: ${item.location}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const detailRows = [peopleRow, placeRow].filter(Boolean);
  const safeNote = item.main_category === "Event" ? String(item.notes || "").trim() : "";
  const theme = highlight ? EVENT_CARD_THEMES.active : EVENT_CARD_THEMES.future;
  const labelText = highlight ? "ACTIVE TODAY" : "UPCOMING";
  const iconName = highlight ? "calendar-check" : item.all_day ? "calendar-star" : "calendar-clock";

  return (
    <View
      style={[
        styles.eventCard,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.eventIconWrap}>
        <View style={[styles.eventIconCircle, { backgroundColor: theme.iconBackground }]}>
          <MaterialCommunityIcons name={iconName} size={22} color={theme.icon} />
        </View>
        <View style={[styles.eventNumberBadge, { backgroundColor: theme.label }]}>
          <Text style={styles.eventNumberText}>{number}</Text>
        </View>
      </View>

      <View style={styles.eventCardBody}>
        <View style={styles.eventCardHeader}>
          <View style={styles.eventHeadingBlock}>
            <Text style={[styles.eventStatusLabel, { color: theme.label }]}>{labelText}</Text>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <View
            style={[
              styles.eventCategoryPill,
              {
                backgroundColor: theme.pillBackground,
                borderColor: theme.pillBorder,
              },
            ]}
          >
            <Text style={[styles.eventCategoryText, { color: theme.pillText }]}>
              {item.main_category}
            </Text>
          </View>
        </View>

        <Text style={[styles.eventSubtitle, { color: theme.muted }]} numberOfLines={1}>
          {eventRelativeLabel(item.event_date)} · {shortDateAU(item.event_date)} · {eventTimeRange(item)}
        </Text>

        {item.event_type ? (
          <Text style={styles.eventTypeText} numberOfLines={1}>
            {item.event_type}
          </Text>
        ) : null}

        {detailRows.map((detail) => (
          <Text key={detail} style={styles.eventDetailText} numberOfLines={1}>
            {detail}
          </Text>
        ))}

        {safeNote ? (
          <View style={[styles.eventNoteBox, { backgroundColor: theme.noteBackground }]}>
            <Text style={[styles.eventNoteText, { color: theme.label }]} numberOfLines={1}>
              Reminder: {safeNote}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function EventSection({
  items,
  highlight = false,
  emptyText,
}: {
  items: EventMeetingVisitRecord[];
  highlight?: boolean;
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.eventEmptyBox}>
        <Text style={styles.eventEmptyText}>{emptyText}</Text>
      </View>
    );
  }

  const visibleItems = items.slice(0, MAX_VISIBLE_PER_SECTION);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  return (
    <View style={styles.eventsSectionBody}>
      <View style={styles.eventsList}>
        {visibleItems.map((item, index) => (
          <EventCard
            key={item.id}
            item={item}
            number={index + 1}
            highlight={highlight}
          />
        ))}
      </View>

      {remainingCount > 0 ? (
        <View style={styles.eventsMoreBadge}>
          <Text style={styles.eventsMoreBadgeText}>+{remainingCount} more in this section</Text>
        </View>
      ) : null}
    </View>
  );
}

export function EventsMeetingsVisitsPanel({
  visibleEventsMeetingsVisits,
  todayEventsMeetingsVisits,
  upcomingEventsMeetingsVisits,
}: {
  visibleEventsMeetingsVisits: EventMeetingVisitRecord[];
  todayEventsMeetingsVisits: EventMeetingVisitRecord[];
  upcomingEventsMeetingsVisits: EventMeetingVisitRecord[];
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>Centre operations</Text>
          <Text style={styles.panelTitle}>Events | Meetings | Visits</Text>
        </View>
        <View style={styles.eventSummaryBadge}>
          <MaterialCommunityIcons name="calendar-clock" size={18} color="#92400E" />
          <Text style={styles.eventSummaryBadgeText}>{visibleEventsMeetingsVisits.length} active</Text>
        </View>
      </View>

      <View style={styles.eventsGrid}>
        <View style={styles.eventsColumn}>
          <Text style={styles.eventsSectionTitle}>Today’s Events | Meetings | Visits</Text>
          <EventSection
            items={todayEventsMeetingsVisits}
            highlight
            emptyText="Nothing scheduled for today."
          />
        </View>

        <View style={styles.eventsColumn}>
          <Text style={styles.eventsSectionTitle}>Upcoming Events | Meetings | Visits</Text>
          <EventSection
            items={upcomingEventsMeetingsVisits}
            emptyText="No upcoming items in the display window."
          />
        </View>
      </View>
    </View>
  );
}
'''

EVENT_STYLES = r'''eventsGrid: {
flex: 1,
flexDirection: "row",
gap: 12,
marginTop: 4,
// Keep the event cards above the floating assignment banner.
paddingBottom: 108,
},
eventsColumn: {
flex: 1,
borderRadius: 18,
borderWidth: 1,
borderColor: "#F3E8FF",
backgroundColor: "#FFF7FD",
padding: 9,
},
eventsSectionTitle: {
fontSize: 13,
fontWeight: "900",
color: "#111827",
marginBottom: 7,
},
eventsSectionBody: {
flex: 1,
},
eventsList: {
flexDirection: "row",
flexWrap: "wrap",
alignContent: "flex-start",
justifyContent: "space-between",
rowGap: 8 as any,
columnGap: 0 as any,
},
eventCard: {
width: "49.25%",
minHeight: 116,
flexDirection: "row",
alignItems: "flex-start",
gap: 7,
borderRadius: 15,
borderWidth: 1.5,
paddingHorizontal: 8,
paddingVertical: 8,
},
eventIconWrap: {
position: "relative" as any,
width: 31,
height: 31,
marginTop: 1,
},
eventIconCircle: {
width: 31,
height: 31,
borderRadius: 16,
alignItems: "center",
justifyContent: "center",
},
eventNumberBadge: {
position: "absolute" as any,
top: -6,
left: -6,
minWidth: 18,
height: 18,
borderRadius: 9,
alignItems: "center",
justifyContent: "center",
borderWidth: 2,
borderColor: "#FFFFFF",
paddingHorizontal: 4,
},
eventNumberText: {
color: "#FFFFFF",
fontSize: 9,
lineHeight: 11,
fontWeight: "900",
textAlign: "center",
},
eventCardBody: {
flex: 1,
minWidth: 0,
},
eventCardHeader: {
flexDirection: "row",
alignItems: "flex-start",
gap: 5,
},
eventHeadingBlock: {
flex: 1,
minWidth: 0,
},
eventStatusLabel: {
fontSize: 8,
lineHeight: 10,
fontWeight: "900",
textTransform: "uppercase",
letterSpacing: 0.65,
},
eventSubtitle: {
marginTop: 2,
fontSize: 9,
lineHeight: 11,
fontWeight: "800",
},
eventTitle: {
marginTop: 1,
fontSize: 14,
lineHeight: 16,
fontWeight: "900",
color: "#111827",
},
eventCategoryPill: {
borderRadius: 999,
borderWidth: 1,
paddingHorizontal: 7,
paddingVertical: 3,
},
eventCategoryText: {
fontSize: 9,
lineHeight: 11,
fontWeight: "900",
},
eventTypeText: {
marginTop: 3,
fontSize: 10,
lineHeight: 12,
fontWeight: "900",
color: "#4B5563",
},
eventDetailText: {
marginTop: 1,
fontSize: 9,
lineHeight: 11,
fontWeight: "700",
color: "#374151",
},
eventNoteBox: {
marginTop: 4,
borderRadius: 9,
paddingHorizontal: 7,
paddingVertical: 4,
},
eventNoteText: {
fontSize: 10,
lineHeight: 12,
fontWeight: "800",
},
eventSummaryBadge: {
flexDirection: "row",
alignItems: "center",
gap: 8,
backgroundColor: "#FEF3C7",
borderColor: "#FDE68A",
borderWidth: 1,
borderRadius: 999,
paddingHorizontal: 14,
paddingVertical: 8,
},
eventSummaryBadgeText: {
color: "#92400E",
fontWeight: "900",
fontSize: 12,
},
eventsMoreBadge: {
alignSelf: "flex-end",
marginTop: 7,
borderRadius: 999,
borderWidth: 1,
borderColor: "#E9D5FF",
backgroundColor: "#FAF5FF",
paddingHorizontal: 10,
paddingVertical: 4,
},
eventsMoreBadgeText: {
fontSize: 9,
lineHeight: 11,
fontWeight: "900",
color: "#7E22CE",
},
eventEmptyBox: {
flex: 1,
borderRadius: 16,
borderWidth: 1,
borderColor: "#E5E7EB",
backgroundColor: "#FFFFFF",
alignItems: "center",
justifyContent: "center",
padding: 16,
},
eventEmptyText: {
fontSize: 15,
fontWeight: "800",
color: "#6B7280",
textAlign: "center",
},
'''

EVENT_VISIBILITY_UTILS = r'''function localEventTimestamp(
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

'''

AUTO_ARCHIVE_BLOCK = r'''const records = (data || []) as EventMeetingVisitRecord[];
let nextRecords = records;

// Auto-archive is never run while using previewTime, so testing the dashboard
// cannot modify live records.
if (!isPreviewMode) {
const expiredAutoArchiveIds = records
.filter(
(item) =>
item.auto_archive &&
item.status !== "Archived" &&
item.status !== "Cancelled" &&
isEventDashboardExpired(item, Date.now()),
)
.map((item) => item.id);

if (expiredAutoArchiveIds.length > 0) {
const { error: archiveError } = await supabase
.from("events_meetings_visits")
.update({ status: "Archived" })
.eq("house", HOUSE_ID)
.in("id", expiredAutoArchiveIds);

if (archiveError) {
console.error("[dashboard] failed to auto-archive expired events", archiveError);
} else {
const archivedIds = new Set(expiredAutoArchiveIds);
nextRecords = records.map((item) =>
archivedIds.has(item.id) ? { ...item, status: "Archived" as const } : item,
);
}
}
}

setEventsMeetingsVisits(nextRecords);'''

DISPLAY_UNTIL_FUNCTION = r'''    function displayUntilForEvent(eventDateISO: string) {
      if (displayUntilOffset !== null) {
        return auDateToDeviceLocalISOString(
          isoDateToAU(
            localDateToISODate(
              addDays(isoDateToLocalDate(eventDateISO), displayUntilOffset),
            ),
          ),
          "23:59",
        );
      }

      // Timed items leave the dashboard at their own end time. All-day items
      // remain visible until the end of the event day.
      const defaultDisplayUntilTime = !form.allDay && endTime ? endTime : "23:59";
      return auDateToDeviceLocalISOString(
        isoDateToAU(eventDateISO),
        defaultDisplayUntilTime,
      );
    }
'''


def require_files() -> None:
    missing = [str(path) for path in FILES.values() if not path.exists()]
    if missing:
        raise SystemExit("Missing expected project files:\n  " + "\n  ".join(missing))


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise ValueError(f"Could not find start marker: {start_marker}")
    end = text.find(end_marker, start)
    if end < 0:
        raise ValueError(f"Could not find end marker: {end_marker}")
    return text[:start] + replacement + text[end:]


def build_updates() -> dict[Path, str]:
    original = {key: path.read_text() for key, path in FILES.items()}
    updates: dict[Path, str] = {}

    updates[FILES["panel"]] = PANEL_SOURCE

    styles = replace_between(
        original["styles"],
        "eventsGrid: {",
        "emptyState: {",
        EVENT_STYLES,
    )
    updates[FILES["styles"]] = styles

    utils = original["utils"]
    if "export function eventDashboardExpiryTimestamp" not in utils:
        utils = replace_between(
            utils,
            "export function isEventDashboardVisible(",
            "export function sortEventsMeetingsVisits(",
            EVENT_VISIBILITY_UTILS,
        )
    updates[FILES["utils"]] = utils

    dashboard = original["dashboard"]
    if "isEventDashboardExpired," not in dashboard:
        import_target = "  hasOutingContent,\n"
        if import_target not in dashboard:
            raise ValueError("Could not add isEventDashboardExpired import.")
        dashboard = dashboard.replace(
            import_target,
            import_target + "  isEventDashboardExpired,\n",
            1,
        )

    if "failed to auto-archive expired events" not in dashboard:
        old_set = "setEventsMeetingsVisits((data || []) as EventMeetingVisitRecord[]);"
        if old_set not in dashboard:
            raise ValueError("Could not find dashboard event setState line.")
        dashboard = dashboard.replace(old_set, AUTO_ARCHIVE_BLOCK, 1)
    updates[FILES["dashboard"]] = dashboard

    editor = original["editor"]
    if "defaultDisplayUntilTime" not in editor:
        pattern = re.compile(
            r"    function displayUntilForEvent\(eventDateISO: string\) \{.*?\n    \}\n\n    setSaving\(true\);",
            re.DOTALL,
        )
        match = pattern.search(editor)
        if not match:
            raise ValueError("Could not find displayUntilForEvent function.")
        editor = (
            editor[: match.start()]
            + DISPLAY_UNTIL_FUNCTION
            + "\n    setSaving(true);"
            + editor[match.end() :]
        )
    editor = editor.replace(
        'placeholder="Leave blank for event day"',
        'placeholder="Blank = event end time"',
        1,
    )
    updates[FILES["editor"]] = editor

    return updates


def write_updates(updates: dict[Path, str]) -> None:
    for path, new_text in updates.items():
        backup = path.with_name(path.name + ".before-events-grid")
        if not backup.exists():
            shutil.copy2(path, backup)
        path.write_text(new_text)


if __name__ == "__main__":
    require_files()
    try:
        pending = build_updates()
    except ValueError as exc:
        raise SystemExit(f"Update stopped without changing files: {exc}") from exc

    write_updates(pending)
    print("Events | Meetings | Visits update applied successfully.")
    print("Updated:")
    for path in pending:
        print(f"  - {path.relative_to(ROOT)}")
    print("\nBackup copies were created beside each changed file with the suffix:")
    print("  .before-events-grid")
