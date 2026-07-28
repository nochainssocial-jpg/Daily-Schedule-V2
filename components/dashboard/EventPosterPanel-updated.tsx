import React from "react";
import { Image, Platform, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { EventMeetingVisitRecord } from "./dashboardTypes";
import { eventRelativeLabel } from "./dashboardUtils";
import { styles } from "./dashboardStyles";

function isPdfPoster(item: EventMeetingVisitRecord) {
  if (item.poster_file_type === "application/pdf") return true;
  return /\.pdf(?:$|[?#])/i.test(String(item.poster_url || ""));
}

function formatLongDate(dateString?: string | null) {
  const [year, month, day] = String(dateString || "")
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return "Date to be confirmed";

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatClock(time?: string | null) {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";

  const hour = Number(match[1]);
  const minutes = match[2];
  const suffix = hour >= 12 ? "pm" : "am";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${minutes} ${suffix}`;
}

function formatFriendlyTimeRange(item: EventMeetingVisitRecord) {
  if (item.all_day) return "All day";

  const start = formatClock(item.start_time);
  const end = formatClock(item.end_time);
  if (start && end) return `${start} – ${end}`;
  return start || end || "Time to be confirmed";
}

function countdownParts(relativeLabel: string) {
  if (relativeLabel === "Today") {
    return { value: "TODAY", label: "THE BIG DAY IS HERE" };
  }

  if (relativeLabel === "Tomorrow") {
    return { value: "1", label: "DAY TO GO" };
  }

  const futureMatch = relativeLabel.match(/^In (\d+) days$/i);
  if (futureMatch) {
    const days = Number(futureMatch[1]);
    return { value: String(days), label: days === 1 ? "DAY TO GO" : "DAYS TO GO" };
  }

  return { value: relativeLabel.toUpperCase(), label: "EVENT COUNTDOWN" };
}

function eventHighlights(item: EventMeetingVisitRecord) {
  const title = item.title.toLowerCase();

  if (title.includes("hair") && title.includes("sock")) {
    return [
      { icon: "sock" as const, label: "Wear crazy socks" },
      { icon: "hair-dryer-outline" as const, label: "Rock your crazy hair" },
    ];
  }

  return [
    {
      icon: "star-circle-outline" as const,
      label: item.event_type || "Special centre event",
    },
    {
      icon: "account-group-outline" as const,
      label: item.location ? `Meet at ${item.location}` : "Join in and have fun",
    },
  ];
}

export function EventPosterPanel({
  item,
  position = 1,
  total = 1,
}: {
  item: EventMeetingVisitRecord;
  position?: number;
  total?: number;
}) {
  const posterUrl = String(item.poster_url || "").trim();
  const relativeLabel = eventRelativeLabel(item.event_date);
  const countdown = countdownParts(relativeLabel);
  const highlights = eventHighlights(item);

  return (
    <View style={[styles.panel, styles.eventPosterPanel]}>
      <View style={styles.eventPosterLayout}>
        <View style={styles.eventPosterVisualColumn}>
          <View style={styles.eventPosterMediaFrame}>
            {isPdfPoster(item) ? (
              Platform.OS === "web"
                ? React.createElement("iframe", {
                    src: `${posterUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`,
                    title: item.poster_file_name || item.title,
                    style: {
                      width: "100%",
                      height: "100%",
                      border: "0",
                      backgroundColor: "#FFFFFF",
                    },
                  })
                : (
                  <View style={styles.eventPosterPdfFallback}>
                    <MaterialCommunityIcons name="file-pdf-box" size={54} color="#B91C1C" />
                    <Text style={styles.eventPosterPdfText}>PDF event poster</Text>
                  </View>
                )
            ) : (
              <Image
                source={{ uri: posterUrl }}
                style={styles.eventPosterImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>

        <View style={styles.eventPosterDetailsCard}>
          <View style={styles.eventPosterDetailsHeader}>
            <Text style={styles.eventPosterCardEyebrow}>Upcoming centre event</Text>
            {total > 1 ? (
              <Text style={styles.eventPosterSequenceText}>{position} of {total}</Text>
            ) : null}
          </View>

          <Text style={styles.eventPosterCardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.eventPosterCountdownCard}>
            <Text style={styles.eventPosterCountdownValue}>{countdown.value}</Text>
            <Text style={styles.eventPosterCountdownLabel}>{countdown.label}</Text>
          </View>

          <View style={styles.eventPosterMetaList}>
            <View style={styles.eventPosterMetaRow}>
              <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#7C3AED" />
              <Text style={styles.eventPosterMetaText} numberOfLines={1}>
                {formatLongDate(item.event_date)}
              </Text>
            </View>
            <View style={styles.eventPosterMetaRow}>
              <MaterialCommunityIcons name="clock-outline" size={18} color="#7C3AED" />
              <Text style={styles.eventPosterMetaText} numberOfLines={1}>
                {formatFriendlyTimeRange(item)}
              </Text>
            </View>
            {item.location ? (
              <View style={styles.eventPosterMetaRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color="#7C3AED" />
                <Text style={styles.eventPosterMetaText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.eventPosterHighlights}>
            {highlights.map((highlight) => (
              <View key={highlight.label} style={styles.eventPosterHighlightCard}>
                <MaterialCommunityIcons name={highlight.icon} size={21} color="#BE185D" />
                <Text style={styles.eventPosterHighlightText} numberOfLines={2}>
                  {highlight.label}
                </Text>
              </View>
            ))}
          </View>

          {item.notes ? (
            <View style={styles.eventPosterNotesBox}>
              <MaterialCommunityIcons name="information-outline" size={17} color="#475569" />
              <Text style={styles.eventPosterNotesText} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
