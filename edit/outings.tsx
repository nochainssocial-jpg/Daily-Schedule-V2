import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
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
  driverId?: ID;
  linkedOutingId?: ID;
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

const OUTING_TIME_OPTIONS = [
  { value: "10:00AM", label: "10:00 am" },
  { value: "10:30AM", label: "10:30 am" },
  { value: "11:00AM", label: "11:00 am" },
  { value: "11:30AM", label: "11:30 am" },
  { value: "12:00PM", label: "12:00 pm" },
  { value: "12:30PM", label: "12:30 pm" },
  { value: "1:00PM", label: "1:00 pm" },
  { value: "1:30PM", label: "1:30 pm" },
  { value: "2:00PM", label: "2:00 pm" },
  { value: "2:30PM", label: "2:30 pm" },
] as const;

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectionDropdownProps = {
  value?: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isSecond?: boolean;
  isSafety?: boolean;
  columns?: 1 | 2;
  clearable?: boolean;
  hasError?: boolean;
};

function normaliseOutingTime(value?: string | null): string {
  const raw = (value || "").trim();
  if (!raw) return "";

  const match = raw.toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match) return raw;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3];

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return raw;

  if (meridiem) {
    if (hour < 1 || hour > 12) return raw;
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  } else if (hour >= 1 && hour <= 2) {
    // Outings operate during the day. Legacy values such as "2:00"
    // therefore mean 2:00 pm, not 2:00 am.
    hour += 12;
  }

  const totalMinutes = hour * 60 + minute;
  const option = OUTING_TIME_OPTIONS.find(({ value: candidate }) => {
    const optionMatch = candidate.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
    if (!optionMatch) return false;

    let optionHour = Number(optionMatch[1]);
    const optionMinute = Number(optionMatch[2]);
    const optionMeridiem = optionMatch[3];

    if (optionMeridiem === "PM" && optionHour !== 12) optionHour += 12;
    if (optionMeridiem === "AM" && optionHour === 12) optionHour = 0;

    return optionHour * 60 + optionMinute === totalMinutes;
  });

  return option?.value || raw;
}

function SelectionDropdown({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  isSecond = false,
  isSafety = false,
  columns = 1,
  clearable = false,
  hasError = false,
}: SelectionDropdownProps) {
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 220, height: 42 });
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const selectedOption = options.find((option) => option.value === value);

  const openMenu = () => {
    if (disabled) return;

    const node = triggerRef.current as any;
    if (node?.measureInWindow) {
      node.measureInWindow((x: number, y: number, width: number, height: number) => {
        setAnchor({ x, y, width, height });
        setOpen(true);
      });
      return;
    }

    setOpen(true);
  };

  const estimatedRows = Math.ceil(options.length / columns);
  const estimatedMenuHeight = Math.min(
    340,
    estimatedRows * 42 + (clearable && value ? 48 : 18),
  );
  const menuWidth = Math.max(anchor.width, 180);
  const menuLeft = Math.max(8, Math.min(anchor.x, windowWidth - menuWidth - 8));
  const menuTop =
    anchor.y + anchor.height + 6 + estimatedMenuHeight > windowHeight
      ? Math.max(8, anchor.y - estimatedMenuHeight - 6)
      : anchor.y + anchor.height + 6;

  return (
    <>
      <TouchableOpacity
        ref={triggerRef as any}
        activeOpacity={0.85}
        disabled={disabled}
        onPress={openMenu}
        style={[
          styles.dropdownButton,
          isSecond && styles.dropdownButtonSecond,
          isSafety && styles.dropdownButtonSafety,
          hasError && styles.dropdownButtonError,
          disabled && styles.dropdownDisabled,
        ]}
      >
        <Text
          style={[
            styles.dropdownText,
            !selectedOption && styles.dropdownPlaceholder,
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={hasError || isSafety ? "#DC2626" : isSecond ? "#6D28D9" : "#C2410C"}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.dropdownModalRoot}>
          <Pressable
            style={styles.dropdownBackdrop}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.dropdownMenuPortal,
              isSecond && styles.dropdownMenuPortalSecond,
              isSafety && styles.dropdownMenuPortalSafety,
              {
                left: menuLeft,
                top: menuTop,
                width: menuWidth,
                maxHeight: Math.min(340, windowHeight - 16),
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={styles.dropdownOptionsGrid}
            >
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={option.disabled ? 1 : 0.85}
                    disabled={option.disabled}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.dropdownOption,
                      { width: columns === 2 ? "50%" : "100%" },
                      selected &&
                        (isSafety
                          ? styles.dropdownOptionSelectedSafety
                          : isSecond
                            ? styles.dropdownOptionSelectedSecond
                            : styles.dropdownOptionSelected),
                      option.disabled && styles.dropdownOptionDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        selected &&
                          (isSafety
                            ? styles.dropdownOptionTextSelectedSafety
                            : isSecond
                              ? styles.dropdownOptionTextSelectedSecond
                              : styles.dropdownOptionTextSelected),
                        option.disabled && styles.dropdownOptionTextDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {clearable && value ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={styles.clearDropdownButton}
              >
                <Ionicons name="close-circle-outline" size={16} color="#6B7280" />
                <Text style={styles.clearDropdownText}>Clear selection</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

function TimeDropdown({
  value,
  onChange,
  disabled = false,
  isSecond = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isSecond?: boolean;
}) {
  const normalisedValue = normaliseOutingTime(value);

  return (
    <SelectionDropdown
      value={normalisedValue}
      options={OUTING_TIME_OPTIONS.map((option) => ({ ...option }))}
      placeholder="Select time"
      onChange={onChange}
      disabled={disabled}
      isSecond={isSecond}
      columns={2}
      clearable
    />
  );
}

const DEFAULT_OUTINGS: OutingGroup[] = [
  {
    id: "outing-1",
    name: "",
    staffIds: [],
    participantIds: [],
    driverId: "",
    startTime: "",
    endTime: "",
    notes: "",
  },
  {
    id: "outing-2",
    name: "",
    staffIds: [],
    participantIds: [],
    driverId: "",
    startTime: "",
    endTime: "",
    notes: "",
  },
  {
    id: "outing-3",
    name: "",
    staffIds: [],
    participantIds: [],
    driverId: "",
    linkedOutingId: "",
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
  const groups = outingGroups || [];
  const groupsById = new Map(
    groups
      .filter((outing) => outing?.id)
      .map((outing) => [String(outing.id), outing]),
  );

  return DEFAULT_OUTINGS.map((fallback, index) => {
    const source = (groupsById.get(fallback.id) ||
      groups[index] ||
      {}) as Partial<OutingGroup>;

    return {
      ...fallback,
      ...source,
      id: source.id || fallback.id,
      name: source.name || "",
      startTime: normaliseOutingTime(source.startTime),
      endTime: normaliseOutingTime(source.endTime),
      notes: source.notes || "",
      driverId: source.driverId || "",
      linkedOutingId: source.linkedOutingId || "",
      staffIds: source.staffIds || [],
      participantIds: source.participantIds || [],
    };
  });
}

function hasOutingContent(outing: OutingGroup): boolean {
  return Boolean(
    outing.name.trim() ||
    (outing.startTime || "").trim() ||
    (outing.endTime || "").trim() ||
    (outing.notes || "").trim() ||
    (outing.driverId || "").trim() ||
    (outing.linkedOutingId || "").trim() ||
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
    outingAutoResetEnabled = true,
    updateSchedule,
    resetOutings,
    maybeAutoResetOutings,
    setOutingAutoResetEnabled,
  } = useSchedule() as any;

  const { push } = useNotifications();
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;
  const { width } = useWindowDimensions();
  const [validationErrors, setValidationErrors] = useState<
    Record<string, { name?: boolean; driver?: boolean; linkedOuting?: boolean; staff?: boolean; participant?: boolean; notes?: boolean }>
  >({});

  useEffect(() => {
    void maybeAutoResetOutings?.();

    const timer = setInterval(() => {
      void maybeAutoResetOutings?.();
    }, 30_000);

    return () => clearInterval(timer);
  }, [maybeAutoResetOutings]);

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

    if ("name" in patch || "driverId" in patch || "linkedOutingId" in patch || "notes" in patch || "staffIds" in patch || "participantIds" in patch) {
      const outingId = outings[index]?.id;
      if (outingId) {
        setValidationErrors((current) => ({
          ...current,
          [outingId]: {
            ...current[outingId],
            ...(patch.name?.trim() ? { name: false } : {}),
            ...(patch.driverId ? { driver: false } : {}),
            ...(patch.linkedOutingId ? { linkedOuting: false } : {}),
            ...(patch.notes?.trim() ? { notes: false } : {}),
            ...(Array.isArray(patch.staffIds) && patch.staffIds.length === 2 ? { staff: false } : {}),
            ...(Array.isArray(patch.participantIds) && patch.participantIds.length === 1 ? { participant: false } : {}),
          },
        }));
      }
    }

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
    const removing = next.has(id);

    if (removing) next.delete(id);
    else {
      if (index === 2 && next.size >= 2) {
        push?.("Additional Safety Transport allows exactly two staff", "outings");
        return;
      }
      next.add(id);
    }

    applyChange(index, {
      staffIds: Array.from(next),
      ...(removing && current.driverId === id ? { driverId: "" } : {}),
    });
  };

  const handleDriverChange = (index: number, driverId: ID) => {
    if (isSelectedElsewhere("staffIds", driverId, index)) return;

    const current = outings[index];
    const staffIds = current.staffIds.includes(driverId)
      ? current.staffIds
      : [...current.staffIds, driverId];

    applyChange(index, { driverId, staffIds });
  };

  const toggleParticipant = (index: number, id: ID) => {
    if (isSelectedElsewhere("participantIds", id, index)) return;
    const current = outings[index];
    const next = new Set<ID>(current.participantIds);
    if (next.has(id)) next.delete(id);
    else {
      if (index === 2 && next.size >= 1) {
        push?.("Additional Safety Transport allows one participant", "outings");
        return;
      }
      next.add(id);
    }
    applyChange(index, { participantIds: Array.from(next) });
  };

  const handleDeleteOuting = (index: number) => {
    const cleared: Partial<OutingGroup> = {
      name: "",
      staffIds: [],
      participantIds: [],
      driverId: "",
      linkedOutingId: "",
      startTime: "",
      endTime: "",
      notes: "",
    };

    if (index < 2 && outings[2]?.linkedOutingId === outings[index]?.id) {
      const nextOutings = outings.map((outing, outingIndex) =>
        outingIndex === index || outingIndex === 2
          ? { ...outing, ...cleared }
          : outing,
      );
      saveOutings(nextOutings);
      push?.(
        `Outing ${index + 1} and its linked safety transport were cleared`,
        "outings",
      );
      return;
    }

    applyChange(index, cleared);
  };

  const handleClearAllOutings = () => {
    if (readOnly) {
      push?.("B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)", "general");
      return;
    }

    void resetOutings?.({ persist: false, reason: "manual" });
    push?.("All outings cleared", "outings");
  };

  const handleToggleAutoReset = (enabled: boolean) => {
    if (readOnly) {
      push?.("B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)", "general");
      return;
    }

    setOutingAutoResetEnabled?.(enabled);
    push?.(
      enabled
        ? "Outings will auto-reset at 5:00pm"
        : "Outings auto-reset disabled",
      "outings",
    );
  };

  const validateOutings = () => {
    const errors: Record<
      string,
      {
        name?: boolean;
        driver?: boolean;
        linkedOuting?: boolean;
        staff?: boolean;
        participant?: boolean;
        notes?: boolean;
      }
    > = {};
    let firstInvalidIndex = -1;

    outings.forEach((outing, index) => {
      if (!hasOutingContent(outing)) return;

      if (index < 2) {
        const nameMissing = !outing.name.trim();
        const driverMissing =
          !outing.driverId || !workingSet.has(String(outing.driverId));

        if (nameMissing || driverMissing) {
          errors[outing.id] = {
            name: nameMissing,
            driver: driverMissing,
          };
          if (firstInvalidIndex === -1) firstInvalidIndex = index;
        }
        return;
      }

      const linkedOuting = outings
        .slice(0, 2)
        .find((candidate) => candidate.id === outing.linkedOutingId);
      const linkedOutingMissing = !linkedOuting || !hasOutingContent(linkedOuting);
      const staffInvalid = outing.staffIds.length !== 2;
      const participantInvalid = outing.participantIds.length !== 1;
      const notesMissing = !String(outing.notes || "").trim();

      if (
        linkedOutingMissing ||
        staffInvalid ||
        participantInvalid ||
        notesMissing
      ) {
        errors[outing.id] = {
          linkedOuting: linkedOutingMissing,
          staff: staffInvalid,
          participant: participantInvalid,
          notes: notesMissing,
        };
        if (firstInvalidIndex === -1) firstInvalidIndex = index;
      }
    });

    setValidationErrors(errors);

    if (firstInvalidIndex !== -1) {
      if (firstInvalidIndex === 2) {
        push?.(
          "Additional Safety Transport requires a linked outing, exactly two staff, one participant and notes",
          "outings",
        );
      } else {
        const invalid = errors[outings[firstInvalidIndex].id];
        const missing = [
          invalid?.name ? "Outing Name" : null,
          invalid?.driver ? "Driver" : null,
        ].filter(Boolean);
        push?.(
          `Outing ${firstInvalidIndex + 1}: ${missing.join(" and ")} required`,
          "outings",
        );
      }
      return false;
    }

    return true;
  };

  return (
    <View style={styles.screen}>
      <SaveExit touchKey="Drive / Outings" onSave={validateOutings} />

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
            excursion or appointment. You can run two main outings and, when
            required, one Additional Safety Transport group linked to either
            outing. People selected in one group are unavailable in the others.
          </Text>

          <View style={styles.autoResetCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoResetTitle}>Auto reset outings</Text>
              <Text style={styles.autoResetText}>
                Clears outings only at 5:00pm. The daily schedule, staff,
                participants and assignments are left untouched.
              </Text>
            </View>

            <Switch
              value={outingAutoResetEnabled !== false}
              onValueChange={handleToggleAutoReset}
              disabled={readOnly}
            />

            <TouchableOpacity
              onPress={handleClearAllOutings}
              activeOpacity={0.9}
              disabled={readOnly}
              style={[styles.clearAllBtn, readOnly && styles.clearAllBtnDisabled]}
            >
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
              <Text style={styles.clearAllText}>Clear all now</Text>
            </TouchableOpacity>
          </View>

          {outings.map((outing, index) => {
            const staffOnOuting = new Set<string>(outing.staffIds ?? []);
            const partsOnOuting = new Set<string>(outing.participantIds ?? []);
            const isSecond = index === 1;
            const isSafety = index === 2;
            const outingErrors = validationErrors[outing.id] || {};
            const driverOptions = workingStaffObjs.map((member: any) => ({
              value: String(member.id),
              label: String(member.name),
              disabled:
                String(member.id) !== String(outing.driverId || "") &&
                isSelectedElsewhere("staffIds", String(member.id), index),
            }));
            const linkedOutingOptions = outings.slice(0, 2).map((candidate, candidateIndex) => ({
              value: candidate.id,
              label: candidate.name.trim() || `Outing ${candidateIndex + 1}`,
              disabled: !hasOutingContent(candidate),
            }));

            return (
              <View
                key={outing.id || `outing-${index + 1}`}
                style={[
                  styles.outingCard,
                  isSecond && styles.outingCardSecond,
                  isSafety && styles.outingCardSafety,
                ]}
              >
                <View style={styles.outingHeaderRow}>
                  <View>
                    <Text style={[styles.outingHeading, isSafety && styles.safetyText]}>
                      {isSafety ? "Additional Safety Transport" : `Outing ${index + 1}`}
                    </Text>
                    <Text style={styles.outingHint}>
                      {isSafety
                        ? "Optional extension of Outing 1 or Outing 2"
                        : isSecond
                          ? "Second group / parallel outing"
                          : "Primary outing group"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.outingBadge,
                      isSecond && styles.outingBadgeSecond,
                      isSafety && styles.outingBadgeSafety,
                    ]}
                  >
                    <Text style={styles.outingBadgeText}>
                      {outing.staffIds.length} staff ·{" "}
                      {outing.participantIds.length} participants
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  {isSafety ? (
                    <View>
                      <Text style={styles.sectionTitle}>
                        Linked Outing <Text style={styles.requiredMark}>*</Text>
                      </Text>
                      <SelectionDropdown
                        value={outing.linkedOutingId || ""}
                        options={linkedOutingOptions}
                        placeholder="Select Outing 1 or Outing 2"
                        onChange={(value) =>
                          applyChange(index, { linkedOutingId: value })
                        }
                        disabled={readOnly}
                        isSafety
                        hasError={Boolean(outingErrors.linkedOuting)}
                      />
                      <Text style={styles.sectionSub}>
                        Start and end times are inherited from the linked outing.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.nameDriverRow}>
                        <View style={styles.nameFieldWrap}>
                          <Text style={styles.sectionTitle}>
                            Outing Name <Text style={styles.requiredMark}>*</Text>
                          </Text>
                          <TextInput
                            value={outing.name}
                            onChangeText={(value) =>
                              applyChange(index, { name: value })
                            }
                            editable={!readOnly}
                            placeholder={isSecond ? "e.g. Bowling" : "e.g. Drive 1"}
                            style={[
                              styles.input,
                              outingErrors.name && styles.inputError,
                            ]}
                          />
                        </View>

                        <View style={styles.driverFieldWrap}>
                          <Text style={styles.sectionTitle}>
                            Driver <Text style={styles.requiredMark}>*</Text>
                          </Text>
                          <SelectionDropdown
                            value={outing.driverId || ""}
                            options={driverOptions}
                            placeholder="Select driver"
                            onChange={(value) => handleDriverChange(index, value)}
                            disabled={readOnly}
                            isSecond={isSecond}
                            hasError={Boolean(outingErrors.driver)}
                          />
                        </View>
                      </View>

                      <View style={[styles.row, { marginTop: 8 }]}>
                        <View style={styles.timeFieldLeft}>
                          <Text style={styles.sectionTitle}>Start Time</Text>
                          <TimeDropdown
                            value={outing.startTime}
                            onChange={(value) =>
                              applyChange(index, { startTime: value })
                            }
                            disabled={readOnly}
                            isSecond={isSecond}
                          />
                        </View>
                        <View style={styles.timeFieldRight}>
                          <Text style={styles.sectionTitle}>End Time</Text>
                          <TimeDropdown
                            value={outing.endTime}
                            onChange={(value) =>
                              applyChange(index, { endTime: value })
                            }
                            disabled={readOnly}
                            isSecond={isSecond}
                          />
                        </View>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {isSafety ? "Safety Transport Staff" : `Staff on Outing ${index + 1}`}{" "}
                    {isSafety ? <Text style={styles.requiredMark}>*</Text> : null}
                  </Text>
                  <Text style={[styles.sectionSub, outingErrors.staff && styles.validationText]}>
                    {isSafety
                      ? "Select exactly two available staff. Staff assigned to either main outing are unavailable."
                      : "Only staff currently working at B2 can be added. Staff already selected in another group are disabled."}
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
                          (isSelectedElsewhere("staffIds", st.id, index) ||
                            (isSafety && staffOnOuting.size >= 2));
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
                              selected &&
                                (isSafety
                                  ? styles.chipSelectedSafety
                                  : isSecond
                                    ? styles.chipSelectedSecond
                                    : styles.chipSelected),
                              disabled && styles.chipDisabled,
                            ]}
                          >
                            <View style={styles.chipContent}>
                              <Text
                                style={[
                                  styles.chipLabel,
                                  selected &&
                                    (isSafety
                                      ? styles.chipLabelSelectedSafety
                                      : isSecond
                                        ? styles.chipLabelSelectedSecond
                                        : styles.chipLabelSelected),
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
                    {isSafety ? "Safety Transport Participant" : `Participants on Outing ${index + 1}`}{" "}
                    {isSafety ? <Text style={styles.requiredMark}>*</Text> : null}
                  </Text>
                  <Text style={[styles.sectionSub, outingErrors.participant && styles.validationText]}>
                    {isSafety
                      ? "Select exactly one available participant. Participants assigned to either main outing are unavailable."
                      : "Only attending participants can be added. Participants already selected in another group are disabled."}
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
                          (isSelectedElsewhere("participantIds", p.id, index) ||
                            (isSafety && partsOnOuting.size >= 1));
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
                              selected &&
                                (isSafety
                                  ? styles.chipSelectedSafety
                                  : isSecond
                                    ? styles.chipSelectedSecond
                                    : styles.chipSelected),
                              disabled && styles.chipDisabled,
                            ]}
                          >
                            <View style={styles.chipContent}>
                              <Text
                                style={[
                                  styles.chipLabel,
                                  selected &&
                                    (isSafety
                                      ? styles.chipLabelSelectedSafety
                                      : isSecond
                                        ? styles.chipLabelSelectedSecond
                                        : styles.chipLabelSelected),
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
                  <Text style={styles.sectionTitle}>
                    Notes {isSafety ? <Text style={styles.requiredMark}>*</Text> : "(optional)"}
                  </Text>
                  <TextInput
                    value={outing.notes}
                    onChangeText={(value) =>
                      applyChange(index, { notes: value })
                    }
                    placeholder="Anything important about this outing..."
                    style={[
                      styles.input,
                      styles.notesInput,
                      isSafety && outingErrors.notes && styles.inputError,
                    ]}
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
                      {isSafety ? "Clear safety transport" : `Clear outing ${index + 1}`}
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
  autoResetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  autoResetTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#36144F",
  },
  autoResetText: {
    marginTop: 2,
    fontSize: 12,
    color: "#4B5563",
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#B45309",
    gap: 6,
  },
  clearAllBtnDisabled: { opacity: 0.45 },
  clearAllText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
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
  outingCardSafety: {
    borderColor: "#DC2626",
    borderWidth: 2,
    backgroundColor: "rgba(254,242,242,0.94)",
  },
  safetyText: { color: "#B91C1C" },
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
  outingBadgeSafety: { backgroundColor: "#FCA5A5" },
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
  nameDriverRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  nameFieldWrap: { flex: 1.3 },
  driverFieldWrap: { flex: 0.9 },
  timeFieldLeft: { flex: 1, marginRight: 6 },
  timeFieldRight: { flex: 1, marginLeft: 6 },
  requiredMark: { color: "#DC2626", fontWeight: "900" },
  inputError: { borderColor: "#DC2626", borderWidth: 2 },
  dropdownButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FB923C",
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  dropdownButtonSecond: { borderColor: "#8B5CF6" },
  dropdownButtonSafety: { borderColor: "#DC2626", borderWidth: 2 },
  dropdownButtonError: { borderColor: "#DC2626", borderWidth: 2 },
  dropdownDisabled: { opacity: 0.55 },
  dropdownText: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  dropdownPlaceholder: { fontWeight: "500", color: "#6B7280" },
  dropdownModalRoot: {
    flex: 1,
    position: "relative",
    zIndex: 999999,
    elevation: 999999,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  dropdownMenuPortal: {
    position: "absolute",
    zIndex: 1000000,
    elevation: 1000000,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FB923C",
    backgroundColor: "#FFFFFF",
    padding: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  dropdownMenuPortalSecond: { borderColor: "#8B5CF6" },
  dropdownMenuPortalSafety: { borderColor: "#DC2626", borderWidth: 2 },
  dropdownOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  dropdownOptionSelected: { backgroundColor: "#FFF7ED" },
  dropdownOptionSelectedSecond: { backgroundColor: "#F5F3FF" },
  dropdownOptionSelectedSafety: { backgroundColor: "#FEF2F2" },
  dropdownOptionDisabled: { opacity: 0.35, backgroundColor: "#F3F4F6" },
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  dropdownOptionTextSelected: { color: "#C2410C", fontWeight: "800" },
  dropdownOptionTextSelectedSecond: { color: "#6D28D9", fontWeight: "800" },
  dropdownOptionTextSelectedSafety: { color: "#B91C1C", fontWeight: "800" },
  dropdownOptionTextDisabled: { color: "#9CA3AF" },
  clearDropdownButton: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  clearDropdownText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#36144F",
    marginBottom: 4,
  },
  sectionSub: { fontSize: 12, color: "#36144F", marginTop: 4, marginBottom: 8 },
  validationText: { color: "#B91C1C", fontWeight: "700" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF",
  },
  chipSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FB923C",
  },
  chipSelectedSecond: {
    backgroundColor: "#F5F3FF",
    borderColor: "#8B5CF6",
  },
  chipSelectedSafety: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
    borderWidth: 2,
  },
  chipDisabled: {
    opacity: 0.35,
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  chipContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  chipLabel: { fontSize: 13, color: "#000" },
  chipLabelSelected: { fontWeight: "600", color: "#C2410C" },
  chipLabelSelectedSecond: { fontWeight: "600", color: "#6D28D9" },
  chipLabelSelectedSafety: { fontWeight: "700", color: "#B91C1C" },
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
