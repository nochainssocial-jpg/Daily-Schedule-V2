import React from "react";
import { ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EVENT_CARD_THEMES } from "./dashboardTheme";
import type { EventMeetingVisitRecord } from "./dashboardTypes";
import { eventRelativeLabel, eventTimeRange, shortDateAU } from "./dashboardUtils";
import { styles } from "./dashboardStyles";

function EventCard({ item, highlight = false }: { item: EventMeetingVisitRecord; highlight?: boolean }) {
  const detailRows = [
    item.responsible_staff ? `Host: ${item.responsible_staff}` : "",
    item.visitor_name ? `Visitor: ${item.visitor_name}` : "",
    item.organisation ? `Organisation: ${item.organisation}` : "",
    item.location ? `Location: ${item.location}` : "",
  ].filter(Boolean);

  const safeNote = item.main_category === "Event" ? String(item.notes || "").trim() : "";
  const theme = highlight ? EVENT_CARD_THEMES.active : EVENT_CARD_THEMES.future;
  const labelText = highlight ? "ACTIVE TODAY" : "UPCOMING";
  const iconName = highlight ? "calendar-check" : item.all_day ? "calendar-star" : "calendar-clock";

  return (
    <View
      key={item.id}
      style={[
        styles.eventCard,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.eventIconCircle, { backgroundColor: theme.iconBackground }]}>
        <MaterialCommunityIcons name={iconName} size={29} color={theme.icon} />
      </View>

      <View style={styles.eventCardBody}>
        <View style={styles.eventCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eventStatusLabel, { color: theme.label }]}>{labelText}</Text>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.eventSubtitle, { color: theme.muted }]}>
              {eventRelativeLabel(item.event_date)} · {shortDateAU(item.event_date)} · {eventTimeRange(item)}
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
            <Text style={[styles.eventCategoryText, { color: theme.pillText }]}>{item.main_category}</Text>
          </View>
        </View>

        {item.event_type ? <Text style={styles.eventTypeText}>{item.event_type}</Text> : null}

        {detailRows.map((detail) => (
          <Text key={detail} style={styles.eventDetailText} numberOfLines={1}>
            {detail}
          </Text>
        ))}

        {safeNote ? (
          <View style={[styles.eventNoteBox, { backgroundColor: theme.noteBackground }]}>
            <Text style={[styles.eventNoteText, { color: theme.label }]} numberOfLines={2}>
              Reminder: {safeNote}
            </Text>
          </View>
        ) : null}
      </View>
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
          {todayEventsMeetingsVisits.length === 0 ? (
            <View style={styles.eventEmptyBox}>
              <Text style={styles.eventEmptyText}>Nothing scheduled for today.</Text>
            </View>
          ) : (
            <ScrollView style={styles.innerScroll} contentContainerStyle={styles.eventsList}>
              {todayEventsMeetingsVisits.map((item) => (
                <EventCard key={item.id} item={item} highlight />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.eventsColumn}>
          <Text style={styles.eventsSectionTitle}>Upcoming Events | Meetings | Visits</Text>
          {upcomingEventsMeetingsVisits.length === 0 ? (
            <View style={styles.eventEmptyBox}>
              <Text style={styles.eventEmptyText}>No upcoming items in the display window.</Text>
            </View>
          ) : (
            <ScrollView style={styles.innerScroll} contentContainerStyle={styles.eventsList}>
              {upcomingEventsMeetingsVisits.map((item) => (
                <EventCard key={item.id} item={item} />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}
