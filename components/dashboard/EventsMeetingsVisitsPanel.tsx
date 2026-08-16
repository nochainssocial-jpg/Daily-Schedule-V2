import React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EVENT_CARD_THEMES } from "./dashboardTheme";
import type { EventMeetingVisitRecord } from "./dashboardTypes";
import { eventRelativeLabel, eventTimeRange, shortDateAU } from "./dashboardUtils";
import { styles } from "./dashboardStyles";

const MAX_VISIBLE_PER_SECTION = 4;

type DashboardEventItem = EventMeetingVisitRecord & {
  related_participant?: string | null;
};

function ActiveTodayEventCard({
  item,
  number,
}: {
  item: EventMeetingVisitRecord;
  number: number;
}) {
  const activeItem = item as DashboardEventItem;
  const theme = EVENT_CARD_THEMES.active;

  const detailRows = [
    { label: "Title", value: item.title || "—" },
    { label: "Time", value: eventTimeRange(item) || "—" },
    { label: "Type", value: item.event_type || item.main_category || "—" },
    { label: "Responsible Staff", value: item.responsible_staff || "—" },
    { label: "Participant", value: activeItem.related_participant || "—" },
    { label: "Visitor", value: item.visitor_name || "—" },
    { label: "Organisation", value: item.organisation || "—" },
  ];

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
          <MaterialCommunityIcons name="calendar-check" size={22} color={theme.icon} />
        </View>
        <View style={[styles.eventNumberBadge, { backgroundColor: theme.label }]}>
          <Text style={styles.eventNumberText}>{number}</Text>
        </View>
      </View>

      <View style={styles.eventCardBody}>
        <View style={styles.eventCardHeader}>
          <View style={styles.eventHeadingBlock}>
            <Text style={[styles.eventStatusLabel, { color: theme.label }]}>
              ACTIVE TODAY
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

        {detailRows.map((detail) => (
          <Text
            key={detail.label}
            style={styles.eventDetailText}
            numberOfLines={1}
          >
            <Text style={{ color: theme.label, fontWeight: "900" }}>
              {detail.label}:
            </Text>
            {" "}
            {detail.value}
          </Text>
        ))}
      </View>
    </View>
  );
}

function UpcomingEventCard({
  item,
  number,
}: {
  item: EventMeetingVisitRecord;
  number: number;
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
  const theme = EVENT_CARD_THEMES.future;
  const iconName = item.all_day ? "calendar-star" : "calendar-clock";

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
            <Text style={[styles.eventStatusLabel, { color: theme.label }]}>UPCOMING</Text>
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
        {visibleItems.map((item, index) =>
          highlight ? (
            <ActiveTodayEventCard
              key={item.id}
              item={item}
              number={index + 1}
            />
          ) : (
            <UpcomingEventCard
              key={item.id}
              item={item}
              number={index + 1}
            />
          ),
        )}
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
