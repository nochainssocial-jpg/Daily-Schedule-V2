import React, { useMemo } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useSchedule } from "@/hooks/schedule-store";
import { useNotifications } from "@/hooks/notifications";
import { useIsAdmin } from "@/hooks/access-control";
import SaveExit from "@/components/SaveExit";
import { masterParticipants, masterStaff } from "@/constants/data";
import { getRiskBand, SCORE_BUBBLE_STYLES } from "@/constants/ratingsTheme";

type ID = string;

type OutingGroup = {
  id: string;
  name: string;
  staffIds: ID[];
  participantIds: ID[];
  startTime?: string;
  endTime?: string;
  notes?: string;
};

type StaffLike = {
  experience_level?: number | null;
  behaviour_capability?: number | null;
  personal_care_skill?: number | null;
  mobility_assistance?: number | null;
  communication_support?: number | null;
  reliability_rating?: number | null;
};

type ParticipantLike = {
  behaviours?: number | null;
  personal_care?: number | null;
  communication?: number | null;
  sensory?: number | null;
  social?: number | null;
  community?: number | null;
  safety?: number | null;
};

const DEFAULT_OUTINGS: OutingGroup[] = [
  {
    id: "outing-1",
    name: "",
    staffIds: [],
    participantIds: [],
    startTime: "",
    endTime: "",
    notes: "",
  },
  {
    id: "outing-2",
    name: "",
    staffIds: [],
    participantIds: [],
    startTime: "",
    endTime: "",
    notes: "",
  },
];

function getStaffTotalScore(member: StaffLike | any): number | null {
  if (!member) return null;

  const values = [
    member.experience_level,
    member.behaviour_capability,
    member.personal_care_skill,
    member.mobility_assistance,
    member.communication_support,
    member.reliability_rating,
  ].filter((v: any): v is number => typeof v === "number" && !Number.isNaN(v));

  if (!values.length) return null;
  return values.reduce((sum: number, v: number) => sum + v, 0);
}

function getStaffScoreLevel(total: number): "low" | "medium" | "high" {
  if (total >= 15) return "high";
  if (total >= 10) return "medium";
  return "low";
}

function getParticipantTotalScore(
  member: ParticipantLike | any,
): number | null {
  if (!member) return null;

  const values = [
    member.behaviours,
    member.personal_care,
    member.communication,
    member.sensory,
    member.social,
    member.community,
    member.safety,
  ].filter((v: any): v is number => typeof v === "number" && !Number.isNaN(v));

  if (!values.length) return null;
  return values.reduce((sum: number, v: number) => sum + v, 0);
}

function getParticipantScoreLevel(total: number): "low" | "medium" | "high" {
  return getRiskBand(total);
}

function mergeDefaultOutings(
  outingGroups: Partial<OutingGroup>[] | null | undefined,
): OutingGroup[] {
  return DEFAULT_OUTINGS.map((fallback, index) => ({
    ...fallback,
    ...(outingGroups?.[index] || {}),
    id: outingGroups?.[index]?.id || fallback.id,
    staffIds: outingGroups?.[index]?.staffIds || [],
    participantIds: outingGroups?.[index]?.participantIds || [],
  }));
}

function hasOutingContent(outing: OutingGroup): boolean {
  return Boolean(
    outing.name.trim() ||
    (outing.startTime || "").trim() ||
    (outing.endTime || "").trim() ||
    (outing.notes || "").trim() ||
    outing.staffIds.length > 0 ||
    outing.participantIds.length > 0,
  );
}

export default function OutingsScreen() {
  const {
    staff,
    participants,
    workingStaff = [],
    attendingParticipants = [],
    outingGroups = [],
    updateSchedule,
  } = useSchedule() as any;

  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;
  const { width } = useWindowDimensions();

  const staffSource = (
    staff && staff.length ? staff : masterStaff
  ) as typeof masterStaff;
  const partsSource = (
    participants && participants.length ? participants : masterParticipants
  ) as typeof masterParticipants;

  const workingSet = useMemo(
    () => new Set<string>(workingStaff || []),
    [workingStaff],
  );
  const attendingSet = useMemo(
    () => new Set<string>(attendingParticipants || []),
    [attendingParticipants],
  );

  const outings = useMemo(
    () => mergeDefaultOutings(outingGroups),
    [outingGroups],
  );

  const workingStaffObjs = staffSource.filter((s: any) => workingSet.has(s.id));
  const attendingPartsObjs = partsSource.filter((p: any) =>
    attendingSet.has(p.id),
  );

  const saveOutings = (nextOutings: OutingGroup[]) => {
    const cleaned = nextOutings.filter(hasOutingContent);
    updateSchedule?.({
      outingGroups: cleaned,
      outingGroup: cleaned[0] ?? null,
    });
    push?.("Drive / Outings updated", "outings");
  };

  const applyChange = (index: number, patch: Partial<OutingGroup>) => {
    if (readOnly) {
      push?.("B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)", "general");
      return;
    }

    const nextOutings = outings.map((outing, i) =>
      i === index ? { ...outing, ...patch } : outing,
    );
    saveOutings(nextOutings);
  };

  const isSelectedElsewhere = (
    type: "staffIds" | "participantIds",
    id: ID,
    currentIndex: number,
  ) =>
    outings.some(
      (outing, index) => index !== currentIndex && outing[type].includes(id),
    );

  const toggleStaff = (index: number, id: ID) => {
    if (isSelectedElsewhere("staffIds", id, index)) return;
    const current = outings[index];
    const next = new Set<ID>(current.staffIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    applyChange(index, { staffIds: Array.from(next) });
  };

  const toggleParticipant = (index: number, id: ID) => {
    if (isSelectedElsewhere("participantIds", id, index)) return;
    const current = outings[index];
    const next = new Set<ID>(current.participantIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    applyChange(index, { participantIds: Array.from(next) });
  };

  const handleDeleteOuting = (index: number) => {
    applyChange(index, {
      name: "",
      staffIds: [],
      participantIds: [],
      startTime: "",
      endTime: "",
      notes: "",
    });
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="Drive / Outings" />

      {Platform.OS === "web" && width >= 900 && (
        <Ionicons
          name="car-outline"
          size={220}
          color="#FF8F2E"
          style={styles.heroIcon}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrap}>
          <Text style={styles.heading}>Drive / Outings</Text>
          <Text style={styles.subheading}>
            Use this screen when some staff and participants are out on an
            excursion or appointment. You can now run two separate outings at
            the same time. Staff and participants selected in one outing are
            disabled in the other outing.
          </Text>

          {outings.map((outing, index) => {
            const staffOnOuting = new Set<string>(outing.staffIds ?? []);
            const partsOnOuting = new Set<string>(outing.participantIds ?? []);
            const isSecond = index === 1;

            return (
              <View
                key={outing.id || `outing-${index + 1}`}
                style={[styles.outingCard, isSecond && styles.outingCardSecond]}
              >
                <View style={styles.outingHeaderRow}>
                  <View>
                    <Text style={styles.outingHeading}>Outing {index + 1}</Text>
                    <Text style={styles.outingHint}>
                      {isSecond
                        ? "Second group / parallel outing"
                        : "Primary outing group"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.outingBadge,
                      isSecond && styles.outingBadgeSecond,
                    ]}
                  >
                    <Text style={styles.outingBadgeText}>
                      {outing.staffIds.length} staff ·{" "}
                      {outing.participantIds.length} participants
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Outing Name</Text>
                  <TextInput
                    value={outing.name}
                    onChangeText={(value) =>
                      applyChange(index, { name: value })
                    }
                    placeholder={
                      isSecond
                        ? "e.g. Bowling with Mary"
                        : "e.g. Shopping with Shatha"
                    }
                    style={styles.input}
                  />
                  <View style={[styles.row, { marginTop: 8 }]}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.sectionTitle}>Start Time</Text>
                      <TextInput
                        value={outing.startTime}
                        onChangeText={(value) =>
                          applyChange(index, { startTime: value })
                        }
                        placeholder="11:00"
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.sectionTitle}>End Time</Text>
                      <TextInput
                        value={outing.endTime}
                        onChangeText={(value) =>
                          applyChange(index, { endTime: value })
                        }
                        placeholder="15:00"
                        style={styles.input}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Staff on Outing {index + 1}
                  </Text>
                  <Text style={styles.sectionSub}>
                    Only staff currently working at B2 can be added. Staff
                    already selected in the other outing are disabled.
                  </Text>

                  {workingStaffObjs.length === 0 ? (
                    <Text style={styles.empty}>
                      No working staff set for this schedule yet.
                    </Text>
                  ) : (
                    <View style={styles.chipGrid}>
                      {workingStaffObjs.map((st: any) => {
                        const selected = staffOnOuting.has(st.id);
                        const disabled =
                          !selected &&
                          isSelectedElsewhere("staffIds", st.id, index);
                        const total = getStaffTotalScore(st);
                        const level =
                          total !== null ? getStaffScoreLevel(total) : null;

                        return (
                          <TouchableOpacity
                            key={st.id}
                            onPress={() => toggleStaff(index, st.id)}
                            activeOpacity={disabled ? 1 : 0.85}
                            style={[
                              styles.chip,
                              selected && styles.chipSelected,
                              disabled && styles.chipDisabled,
                            ]}
                          >
                            <View style={styles.chipContent}>
                              <Text
                                style={[
                                  styles.chipLabel,
                                  selected && styles.chipLabelSelected,
                                  disabled && styles.chipLabelDisabled,
                                ]}
                                numberOfLines={1}
                              >
                                {st.name}
                              </Text>
                              {total !== null && (
                                <View
                                  style={[
                                    styles.scoreBubble,
                                    level === "low" && styles.scoreBubbleLow,
                                    level === "medium" &&
                                      styles.scoreBubbleMedium,
                                    level === "high" && styles.scoreBubbleHigh,
                                  ]}
                                >
                                  <Text style={styles.scoreBubbleText}>
                                    {total}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Participants on Outing {index + 1}
                  </Text>
                  <Text style={styles.sectionSub}>
                    Only attending participants can be added. Participants
                    already selected in the other outing are disabled.
                  </Text>

                  {attendingPartsObjs.length === 0 ? (
                    <Text style={styles.empty}>
                      No attending participants set for this schedule yet.
                    </Text>
                  ) : (
                    <View style={styles.chipGrid}>
                      {attendingPartsObjs.map((p: any) => {
                        const selected = partsOnOuting.has(p.id);
                        const disabled =
                          !selected &&
                          isSelectedElsewhere("participantIds", p.id, index);
                        const total = getParticipantTotalScore(p);
                        const level =
                          total !== null
                            ? getParticipantScoreLevel(total)
                            : null;

                        return (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => toggleParticipant(index, p.id)}
                            activeOpacity={disabled ? 1 : 0.85}
                            style={[
                              styles.chip,
                              selected && styles.chipSelected,
                              disabled && styles.chipDisabled,
                            ]}
                          >
                            <View style={styles.chipContent}>
                              <Text
                                style={[
                                  styles.chipLabel,
                                  selected && styles.chipLabelSelected,
                                  disabled && styles.chipLabelDisabled,
                                ]}
                                numberOfLines={1}
                              >
                                {p.name}
                              </Text>
                              {total !== null && (
                                <View
                                  style={[
                                    styles.scoreBubble,
                                    level === "low" && styles.scoreBubbleLow,
                                    level === "medium" &&
                                      styles.scoreBubbleMedium,
                                    level === "high" && styles.scoreBubbleHigh,
                                  ]}
                                >
                                  <Text style={styles.scoreBubbleText}>
                                    {total}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notes (optional)</Text>
                  <TextInput
                    value={outing.notes}
                    onChangeText={(value) =>
                      applyChange(index, { notes: value })
                    }
                    placeholder="Anything important about this outing..."
                    style={[styles.input, styles.notesInput]}
                    multiline
                  />
                </View>

                <View style={[styles.section, styles.deleteRow]}>
                  <TouchableOpacity
                    onPress={() => handleDeleteOuting(index)}
                    activeOpacity={0.9}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.deleteText}>
                      Clear outing {index + 1}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFE4CC" },
  heroIcon: {
    position: "absolute",
    top: "25%",
    left: "10%",
    opacity: 1,
    zIndex: 0,
  },
  scroll: { flex: 1 },
  wrap: {
    flex: 1,
    width: "100%",
    maxWidth: 880,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#36144F" },
  subheading: { fontSize: 14, color: "#000", marginBottom: 16 },
  outingCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  outingCardSecond: {
    borderColor: "#DDD6FE",
    backgroundColor: "rgba(245,243,255,0.86)",
  },
  outingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  outingHeading: { fontSize: 19, fontWeight: "800", color: "#36144F" },
  outingHint: { fontSize: 12, color: "#6B4F7A", marginTop: 2 },
  outingBadge: {
    borderRadius: 999,
    backgroundColor: "#FDBA74",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  outingBadgeSecond: { backgroundColor: "#C4B5FD" },
  outingBadgeText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  section: { marginTop: 16 },
  row: { flexDirection: "row" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: "#000",
  },
  notesInput: { height: 80, textAlignVertical: "top" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#36144F",
    marginBottom: 4,
  },
  sectionSub: { fontSize: 12, color: "#36144F", marginTop: 4, marginBottom: 8 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF",
  },
  chipSelected: { backgroundColor: "#FDBA74", borderColor: "#FB923C" },
  chipDisabled: {
    opacity: 0.35,
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  chipContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  chipLabel: { fontSize: 13, color: "#000" },
  chipLabelSelected: { fontWeight: "600", color: "#000" },
  chipLabelDisabled: { color: "#6B7280" },
  scoreBubble: {
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBubbleLow: {
    backgroundColor: SCORE_BUBBLE_STYLES.low.bg,
    borderColor: SCORE_BUBBLE_STYLES.low.border,
  },
  scoreBubbleMedium: {
    backgroundColor: SCORE_BUBBLE_STYLES.medium.bg,
    borderColor: SCORE_BUBBLE_STYLES.medium.border,
  },
  scoreBubbleHigh: {
    backgroundColor: SCORE_BUBBLE_STYLES.high.bg,
    borderColor: SCORE_BUBBLE_STYLES.high.border,
  },
  scoreBubbleText: { fontSize: 11, fontWeight: "600", color: "#111827" },
  empty: { fontSize: 13, color: "#111827" },
  deleteRow: { alignItems: "flex-end", marginTop: 12 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#36144F",
    gap: 6,
  },
  deleteText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
});
