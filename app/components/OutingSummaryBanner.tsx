import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type PersonLike = {
  id: string | number;
  name?: string | null;
};

type OutingGroup = {
  id?: string | null;
  name?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  staffIds?: (string | number)[];
  participantIds?: (string | number)[];
  notes?: string | null;
  linkedOutingName?: string | null;
};

type OutingPhase = "none" | "upcoming" | "startingSoon" | "active" | "complete";

type Props = {
  outingGroup: OutingGroup;
  outingIndex: number;
  phase: OutingPhase;
  staffCount: number;
  participantCount: number;
  timeRange: string;
  staff: PersonLike[];
  participants: PersonLike[];
};

function namesFromIds(ids: (string | number)[] | undefined, people: PersonLike[]) {
  const peopleById = new Map(
    (people || []).map((person) => [String(person.id), person.name || String(person.id)]),
  );

  return (ids || [])
    .map((id) => peopleById.get(String(id)) || String(id))
    .filter(Boolean);
}

function formatNames(names: string[]) {
  return names.length ? names.join(", ") : "None selected";
}

export default function OutingSummaryBanner({
  outingGroup,
  outingIndex,
  phase,
  staffCount,
  participantCount,
  timeRange,
  staff,
  participants,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const isUpcoming = phase === "upcoming";
  const isStartingSoon = phase === "startingSoon";
  const isComplete = phase === "complete";
  const isSecond = outingIndex === 1;
  const isSafety = outingIndex === 2;
  const displayLabel = isSafety ? "Additional Safety Transport" : `Outing ${outingIndex + 1}`;

  const outingTitle = isStartingSoon
    ? `${displayLabel} starting soon`
    : isUpcoming
      ? `Upcoming ${displayLabel.toLowerCase()}`
      : isComplete
        ? `${displayLabel} complete`
        : `${displayLabel} in progress`;

  const outingSubtitle = isStartingSoon
    ? "Starting soon"
    : isUpcoming
      ? "Planned"
      : isComplete
        ? "Completed"
        : "Live now";

  const staffNames = useMemo(
    () => namesFromIds(outingGroup.staffIds, staff),
    [outingGroup.staffIds, staff],
  );

  const participantNames = useMemo(
    () => namesFromIds(outingGroup.participantIds, participants),
    [outingGroup.participantIds, participants],
  );

  const notes = (outingGroup.notes || "").trim();

  return (
    <Pressable
      onPress={() => setExpanded((value) => !value)}
      accessibilityRole="button"
      accessibilityLabel={`Expand details for outing ${outingIndex + 1}`}
      style={({ pressed }) => [
        styles.outingSummary,
        isSecond && styles.outingSummarySecond,
        isSafety && styles.outingSummarySafety,
        isUpcoming && styles.outingSummaryUpcoming,
        isStartingSoon && styles.outingSummaryStartingSoon,
        isComplete && styles.outingSummaryComplete,
        pressed && styles.outingSummaryPressed,
        Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
      ]}
    >
      <View style={styles.outingSummaryInner}>
        <View
          style={[
            styles.outingSummaryIconBubble,
            isSecond && styles.outingSummaryIconBubbleSecond,
            isSafety && styles.outingSummaryIconBubbleSafety,
            isStartingSoon && styles.outingSummaryIconBubbleStartingSoon,
            isComplete && styles.outingSummaryIconBubbleComplete,
          ]}
        >
          <Ionicons
            name="car-outline"
            size={22}
            color={
              isComplete
                ? "#166534"
                : isUpcoming || isStartingSoon
                  ? "#1D4ED8"
                  : isSafety
                    ? "#B91C1C"
                    : isSecond
                      ? "#6D28D9"
                      : "#C05621"
            }
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.outingSummaryTitle,
                isSecond && styles.outingSummaryTitleSecond,
                isSafety && styles.outingSummaryTitleSafety,
                (isUpcoming || isStartingSoon) && styles.outingSummaryTitleUpcoming,
                isComplete && styles.outingSummaryTitleComplete,
              ]}
            >
              {outingTitle}
            </Text>

            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={
                isComplete
                  ? "#166534"
                  : isUpcoming || isStartingSoon
                    ? "#1D4ED8"
                    : isSafety
                      ? "#B91C1C"
                      : isSecond
                        ? "#5B21B6"
                        : "#9A3412"
              }
            />
          </View>

          <Text
            style={[
              styles.outingSummaryLine,
              isSecond && styles.outingSummaryLineSecond,
              isSafety && styles.outingSummaryLineSafety,
              (isUpcoming || isStartingSoon) && styles.outingSummaryLineUpcoming,
              isComplete && styles.outingSummaryLineComplete,
            ]}
            numberOfLines={expanded ? undefined : 1}
          >
            {isSafety
              ? `Linked to ${outingGroup.linkedOutingName || "main outing"}`
              : outingGroup.name || "Unnamed outing"}
            {timeRange ? ` · ${timeRange}` : ""}
            {` · ${outingSubtitle}`}
          </Text>

          <Text
            style={[
              styles.outingSummaryLine,
              isSecond && styles.outingSummaryLineSecond,
              isSafety && styles.outingSummaryLineSafety,
              (isUpcoming || isStartingSoon) && styles.outingSummaryLineUpcoming,
              isComplete && styles.outingSummaryLineComplete,
            ]}
          >
            {staffCount} staff · {participantCount} participants
          </Text>

          {expanded && (
            <View style={styles.details}>
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Staff:</Text>
                <Text style={styles.detailText}>{formatNames(staffNames)}</Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Participants:</Text>
                <Text style={styles.detailText}>
                  {formatNames(participantNames)}
                </Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Notes:</Text>
                <Text style={styles.detailText}>
                  {notes || "No notes added."}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outingSummary: {
    width: "40%",
    minWidth: 300,
    flexGrow: 1,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outingSummaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.997 }],
  },
  outingSummarySecond: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE",
  },
  outingSummarySafety: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
    borderWidth: 2,
  },
  outingSummaryUpcoming: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  outingSummaryStartingSoon: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  outingSummaryComplete: {
    backgroundColor: "#ECFDF3",
    borderColor: "#BBF7D0",
  },
  outingSummaryInner: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  outingSummaryIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  outingSummaryIconBubbleSecond: {
    backgroundColor: "#DDD6FE",
  },
  outingSummaryIconBubbleSafety: {
    backgroundColor: "#FEE2E2",
  },
  outingSummaryIconBubbleStartingSoon: {
    backgroundColor: "#BFDBFE",
  },
  outingSummaryIconBubbleComplete: {
    backgroundColor: "#BBF7D0",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  outingSummaryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9A3412",
  },
  outingSummaryTitleSecond: {
    color: "#5B21B6",
  },
  outingSummaryTitleSafety: {
    color: "#B91C1C",
  },
  outingSummaryTitleUpcoming: {
    color: "#1D4ED8",
  },
  outingSummaryTitleComplete: {
    color: "#166534",
  },
  outingSummaryLine: {
    fontSize: 12,
    color: "#7C2D12",
  },
  outingSummaryLineSecond: {
    color: "#4C1D95",
  },
  outingSummaryLineSafety: {
    color: "#991B1B",
  },
  outingSummaryLineUpcoming: {
    color: "#1E40AF",
  },
  outingSummaryLineComplete: {
    color: "#166534",
  },
  details: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(124,45,18,0.15)",
    gap: 8,
  },
  detailBlock: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#332244",
  },
  detailText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#111827",
  },
});
