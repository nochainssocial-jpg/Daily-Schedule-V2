import React from "react";
import { Image, Platform, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { EventMeetingVisitRecord } from "./dashboardTypes";
import { eventRelativeLabel, eventTimeRange, shortDateAU } from "./dashboardUtils";
import { styles } from "./dashboardStyles";

function isPdfPoster(item: EventMeetingVisitRecord) {
  if (item.poster_file_type === "application/pdf") return true;
  return /\.pdf(?:$|[?#])/i.test(String(item.poster_url || ""));
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
  const subtitle = `${eventRelativeLabel(item.event_date)} · ${shortDateAU(item.event_date)} · ${eventTimeRange(item)}`;

  return (
    <View style={[styles.panel, styles.eventPosterPanel]}>
      <View style={styles.eventPosterHeader}>
        <View style={styles.eventPosterHeading}>
          <Text style={styles.panelEyebrow}>Upcoming centre event</Text>
          <Text style={styles.eventPosterTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.eventPosterSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={styles.eventPosterBadge}>
          <MaterialCommunityIcons name="image-outline" size={17} color="#92400E" />
          <Text style={styles.eventPosterBadgeText}>
            {total > 1 ? `Event poster ${position} of ${total}` : "Event poster"}
          </Text>
        </View>
      </View>

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
  );
}
