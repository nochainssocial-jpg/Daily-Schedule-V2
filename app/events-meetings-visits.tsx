// app/edit/events-meetings-visits.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Footer from "@/components/Footer";
import ScheduleBanner from "@/components/ScheduleBanner";
import { supabase } from "@/lib/supabase";

const MAX_WIDTH = 960;
const HOUSE = "B2";

type MainCategory = "Event" | "Meeting" | "Visit";
type EventStatus =
  "Scheduled" | "Active" | "Completed" | "Cancelled" | "Archived";
type RecurrenceFrequency = "weekly" | "fortnightly" | "monthly";
type WeekdayKey = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";

type EventsMeetingsVisitsRecord = {
  id: string;
  house: string;
  title: string;
  main_category: MainCategory;
  event_type: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  display_from: string | null;
  display_until: string | null;
  visitor_name: string | null;
  organisation: string | null;
  related_participant: string | null;
  responsible_staff: string | null;
  location: string | null;
  dashboard_visible: boolean;
  auto_archive: boolean;
  status: EventStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  title: string;
  mainCategory: MainCategory;
  eventType: string;
  eventDateAU: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  displayFromAU: string;
  displayUntilAU: string;
  visitorName: string;
  organisation: string;
  relatedParticipant: string;
  responsibleStaff: string;
  location: string;
  dashboardVisible: boolean;
  autoArchive: boolean;
  status: EventStatus;
  notes: string;
  recurring: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceDays: WeekdayKey[];
  recurrenceEndAU: string;
  recurrenceCount: string;
};

const blankForm: FormState = {
  title: "",
  mainCategory: "Visit",
  eventType: "Behaviour Support",
  eventDateAU: "",
  startTime: "",
  endTime: "",
  allDay: false,
  displayFromAU: "",
  displayUntilAU: "",
  visitorName: "",
  organisation: "",
  relatedParticipant: "",
  responsibleStaff: "",
  location: "",
  dashboardVisible: true,
  autoArchive: true,
  status: "Scheduled",
  notes: "",
  recurring: false,
  recurrenceFrequency: "weekly",
  recurrenceDays: [],
  recurrenceEndAU: "",
  recurrenceCount: "",
};

const categoryOptions: MainCategory[] = ["Event", "Meeting", "Visit"];
const statusOptions: EventStatus[] = [
  "Scheduled",
  "Active",
  "Completed",
  "Cancelled",
  "Archived",
];

const eventTypeOptions = [
  "Behaviour Support",
  "Speech Pathologist",
  "Physiotherapy",
  "Podiatrist",
  "Doctor's Appointment",
  "Training",
  "New Client Site Visit",
  "Special Event",
  "Staff Meeting",
  "Maintenance",
  "Other",
];

const recurrenceFrequencyOptions: {
  label: string;
  value: RecurrenceFrequency;
}[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Fortnightly", value: "fortnightly" },
  { label: "Monthly", value: "monthly" },
];

const weekdayOptions: {
  label: string;
  shortLabel: string;
  value: WeekdayKey;
  dateIndex: number;
}[] = [
  { label: "Sunday", shortLabel: "Sun", value: "SU", dateIndex: 0 },
  { label: "Monday", shortLabel: "Mon", value: "MO", dateIndex: 1 },
  { label: "Tuesday", shortLabel: "Tue", value: "TU", dateIndex: 2 },
  { label: "Wednesday", shortLabel: "Wed", value: "WE", dateIndex: 3 },
  { label: "Thursday", shortLabel: "Thu", value: "TH", dateIndex: 4 },
  { label: "Friday", shortLabel: "Fri", value: "FR", dateIndex: 5 },
  { label: "Saturday", shortLabel: "Sat", value: "SA", dateIndex: 6 },
];

function formatDateAU(dateString?: string | null) {
  if (!dateString) return "";
  const cleanDate = dateString.slice(0, 10);
  const [year, month, day] = cleanDate.split("-");
  if (!year || !month || !day) return dateString;
  return `${day}-${month}-${year}`;
}

function formatTimestampDateAU(value?: string | null) {
  if (!value) return "";
  return formatDateAU(value);
}

function auDateToISO(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function isoDateToLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function localDateToISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoDateToAU(value: string) {
  return formatDateAU(value);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonthsClamped(date: Date, months: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const day = date.getDate();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDayOfTargetMonth));
}

function diffDays(fromISO: string, toISO: string) {
  const from = isoDateToLocalDate(fromISO);
  const to = isoDateToLocalDate(toISO);
  return Math.round((from.getTime() - to.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function weekdayKeyFromDate(date: Date): WeekdayKey {
  return (
    weekdayOptions.find((day) => day.dateIndex === date.getDay())?.value || "MO"
  );
}

function parsePositiveInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function generateRecurringDates(
  startISO: string,
  form: FormState,
  recurrenceEndISO: string | null,
  occurrenceLimit: number | null,
) {
  if (!form.recurring) return [startISO];

  const startDate = isoDateToLocalDate(startISO);
  const endDate = recurrenceEndISO
    ? isoDateToLocalDate(recurrenceEndISO)
    : null;
  const maxItems = Math.min(occurrenceLimit || (endDate ? 160 : 12), 160);
  const dates: string[] = [];

  if (form.recurrenceFrequency === "monthly") {
    let monthOffset = 0;
    while (dates.length < maxItems && monthOffset < 160) {
      const candidate = addMonthsClamped(startDate, monthOffset);
      if (!endDate || candidate <= endDate) {
        dates.push(localDateToISODate(candidate));
      } else {
        break;
      }
      monthOffset += 1;
    }
    return dates;
  }

  const selectedDayKeys = form.recurrenceDays.length
    ? form.recurrenceDays
    : [weekdayKeyFromDate(startDate)];
  const selectedDayIndexes = new Set(
    selectedDayKeys
      .map((key) => weekdayOptions.find((day) => day.value === key)?.dateIndex)
      .filter((value): value is number => typeof value === "number"),
  );
  const intervalWeeks = form.recurrenceFrequency === "fortnightly" ? 2 : 1;
  const firstWeekStart = startOfWeek(startDate);
  let cursor = new Date(startDate);
  let safetyDays = 0;

  while (dates.length < maxItems && safetyDays < 1200) {
    if (endDate && cursor > endDate) break;

    const cursorWeekStart = startOfWeek(cursor);
    const weeksSinceStart = Math.floor(
      (cursorWeekStart.getTime() - firstWeekStart.getTime()) /
        (1000 * 60 * 60 * 24 * 7),
    );

    if (
      weeksSinceStart >= 0 &&
      weeksSinceStart % intervalWeeks === 0 &&
      selectedDayIndexes.has(cursor.getDay())
    ) {
      dates.push(localDateToISODate(cursor));
    }

    cursor = addDays(cursor, 1);
    safetyDays += 1;
  }

  return dates;
}

function normaliseTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const compact = trimmed.replace(".", ":");
  const match = compact.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function auDateToDeviceLocalISOString(value: string, time = "00:00") {
  const isoDate = auDateToISO(value);
  const cleanTime = normaliseTime(time) || "00:00";
  if (!isoDate) return null;

  const [year, month, day] = isoDate.split("-").map(Number);
  const [hours, minutes] = cleanTime.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

function formatTime(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function getRelativeLabel(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const eventDate = new Date(year, month - 1, day);
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const diffDays = Math.round(
    (eventDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return "Yesterday";
  return `${Math.abs(diffDays)} days ago`;
}

export default function EventsMeetingsVisitsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<EventsMeetingsVisitsRecord[]>([]);
  const [form, setForm] = useState<FormState>(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  const activeItems = useMemo(
    () => items.filter((item) => item.status !== "Archived"),
    [items],
  );

  const archivedItems = useMemo(
    () => items.filter((item) => item.status === "Archived"),
    [items],
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("events_meetings_visits")
      .select("*")
      .eq("house", HOUSE)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error loading events, meetings and visits:", error);
      setErrorMessage("Could not load events, meetings and visits.");
      setLoading(false);
      return;
    }

    setItems((data || []) as EventsMeetingsVisitsRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleEdit(item: EventsMeetingsVisitsRecord) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      mainCategory: item.main_category || "Visit",
      eventType: item.event_type || "",
      eventDateAU: formatDateAU(item.event_date),
      startTime: formatTime(item.start_time),
      endTime: formatTime(item.end_time),
      allDay: item.all_day,
      displayFromAU: formatTimestampDateAU(item.display_from),
      displayUntilAU: formatTimestampDateAU(item.display_until),
      visitorName: item.visitor_name || "",
      organisation: item.organisation || "",
      relatedParticipant: item.related_participant || "",
      responsibleStaff: item.responsible_staff || "",
      location: item.location || "",
      dashboardVisible: item.dashboard_visible,
      autoArchive: item.auto_archive,
      status: item.status || "Scheduled",
      notes: item.notes || "",
      recurring: false,
      recurrenceFrequency: "weekly",
      recurrenceDays: [],
      recurrenceEndAU: "",
      recurrenceCount: "",
    });
    setTypeMenuOpen(false);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(blankForm);
    setTypeMenuOpen(false);
  }

  function toggleRecurrenceDay(day: WeekdayKey) {
    setForm((current) => {
      const alreadySelected = current.recurrenceDays.includes(day);
      return {
        ...current,
        recurrenceDays: alreadySelected
          ? current.recurrenceDays.filter((value) => value !== day)
          : [...current.recurrenceDays, day],
      };
    });
  }

  async function handleSave() {
    const title = form.title.trim();
    const eventDate = auDateToISO(form.eventDateAU);
    const startTime = form.allDay ? null : normaliseTime(form.startTime);
    const endTime = form.allDay ? null : normaliseTime(form.endTime);

    if (!title) {
      Alert.alert("Missing title", "Please add a title first.");
      return;
    }

    if (!eventDate) {
      Alert.alert("Check date", "Please enter the event date as DD-MM-YYYY.");
      return;
    }

    if (!form.allDay && form.startTime.trim() && !startTime) {
      Alert.alert(
        "Check start time",
        "Please use 24-hour time, for example 10:30.",
      );
      return;
    }

    if (!form.allDay && form.endTime.trim() && !endTime) {
      Alert.alert(
        "Check end time",
        "Please use 24-hour time, for example 11:30.",
      );
      return;
    }

    const recurrenceEnd =
      form.recurring && form.recurrenceEndAU.trim()
        ? auDateToISO(form.recurrenceEndAU)
        : null;

    if (form.recurring && form.recurrenceEndAU.trim() && !recurrenceEnd) {
      Alert.alert(
        "Check recurring end date",
        "Recurring end date must use DD-MM-YYYY.",
      );
      return;
    }

    const occurrenceLimit = form.recurring
      ? parsePositiveInteger(form.recurrenceCount) || null
      : null;

    if (form.recurring && form.recurrenceCount.trim() && !occurrenceLimit) {
      Alert.alert(
        "Check number of visits",
        "Please enter a whole number, for example 12.",
      );
      return;
    }

    const recurringEventDates = generateRecurringDates(
      eventDate,
      form,
      recurrenceEnd,
      occurrenceLimit,
    );

    if (form.recurring && recurringEventDates.length === 0) {
      Alert.alert(
        "No recurring dates",
        "Please check the start date, selected days and recurring end date.",
      );
      return;
    }

    if (form.recurring && recurringEventDates.length >= 160) {
      Alert.alert(
        "Too many visits",
        "Please reduce the date range or number of visits. The current safety limit is 160 generated items.",
      );
      return;
    }

    const baseDisplayFrom = form.displayFromAU.trim()
      ? auDateToISO(form.displayFromAU)
      : null;
    const baseDisplayUntil = form.displayUntilAU.trim()
      ? auDateToISO(form.displayUntilAU)
      : null;

    if (form.displayFromAU.trim() && !baseDisplayFrom) {
      Alert.alert("Check display from", "Display from must use DD-MM-YYYY.");
      return;
    }

    if (form.displayUntilAU.trim() && !baseDisplayUntil) {
      Alert.alert("Check display until", "Display until must use DD-MM-YYYY.");
      return;
    }

    const displayFromOffset = baseDisplayFrom
      ? diffDays(baseDisplayFrom, eventDate)
      : null;
    const displayUntilOffset = baseDisplayUntil
      ? diffDays(baseDisplayUntil, eventDate)
      : null;

    function displayFromForEvent(eventDateISO: string) {
      if (displayFromOffset !== null) {
        return auDateToDeviceLocalISOString(
          isoDateToAU(
            localDateToISODate(
              addDays(isoDateToLocalDate(eventDateISO), displayFromOffset),
            ),
          ),
          "00:00",
        );
      }

      if (form.recurring) {
        return auDateToDeviceLocalISOString(
          isoDateToAU(
            localDateToISODate(addDays(isoDateToLocalDate(eventDateISO), -7)),
          ),
          "00:00",
        );
      }

      return new Date().toISOString();
    }

    function displayUntilForEvent(eventDateISO: string) {
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

      return auDateToDeviceLocalISOString(isoDateToAU(eventDateISO), "23:59");
    }

    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();

    const basePayload = {
      house: HOUSE,
      title,
      main_category: form.mainCategory,
      event_type: form.eventType.trim() || null,
      start_time: startTime,
      end_time: endTime,
      all_day: form.allDay,
      visitor_name: form.visitorName.trim() || null,
      organisation: form.organisation.trim() || null,
      related_participant: form.relatedParticipant.trim() || null,
      responsible_staff: form.responsibleStaff.trim() || null,
      location: form.location.trim() || null,
      dashboard_visible: form.dashboardVisible,
      auto_archive: form.autoArchive,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    const { error } = editingId
      ? await supabase
          .from("events_meetings_visits")
          .update({
            ...basePayload,
            event_date: eventDate,
            display_from: displayFromForEvent(eventDate),
            display_until: displayUntilForEvent(eventDate),
          })
          .eq("id", editingId)
      : await supabase.from("events_meetings_visits").insert(
          recurringEventDates.map((dateForItem) => ({
            ...basePayload,
            event_date: dateForItem,
            display_from: displayFromForEvent(dateForItem),
            display_until: displayUntilForEvent(dateForItem),
            created_by: userData.user?.id || null,
          })),
        );

    setSaving(false);

    if (error) {
      console.error("Error saving event, meeting or visit:", error);
      Alert.alert("Save failed", "The item could not be saved.");
      return;
    }

    handleCancelEdit();
    await fetchItems();
  }

  async function updateStatus(id: string, status: EventStatus) {
    const { error } = await supabase
      .from("events_meetings_visits")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating status:", error);
      Alert.alert("Update failed", "The status could not be updated.");
      return;
    }

    await fetchItems();
  }

  async function deleteItem(id: string) {
    const runDelete = async () => {
      const { error } = await supabase
        .from("events_meetings_visits")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting item:", error);
        Alert.alert("Delete failed", "The item could not be deleted.");
        return;
      }

      await fetchItems();
    };

    if (Platform.OS === "web") {
      const confirmed = (globalThis as any).confirm
        ? (globalThis as any).confirm("Delete this item permanently?")
        : true;

      if (confirmed) {
        await runDelete();
      }
      return;
    }

    Alert.alert("Delete item?", "This permanently deletes the record.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: runDelete },
    ]);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "Events | Meetings | Visits",
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <ScheduleBanner />

          <Pressable
            style={styles.backButton}
            onPress={() => router.push("/edit")}
          >
            <Ionicons name="chevron-back" size={16} color="#6B7280" />
            <Text style={styles.backButtonText}>Back to Edit Hub</Text>
          </Pressable>

          <View style={styles.headerCard}>
            <View style={styles.headerIconBubble}>
              <Ionicons name="calendar-outline" size={24} color="#92400E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nowEditing}>Now Editing</Text>
              <Text style={styles.title}>Events | Meetings | Visits</Text>
              <Text style={styles.subtitle}>
                Add centre events, meetings and external visits for dashboard
                visibility.
              </Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.formHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>
                  {editingId ? "Edit Item" : "Add New Item"}
                </Text>
                {editingId ? (
                  <Text style={styles.editingNotice}>
                    Editing existing item. Save changes or cancel to return to a
                    blank form.
                  </Text>
                ) : null}
              </View>
              {editingId ? (
                <Pressable
                  style={styles.cancelEditButton}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                </Pressable>
              ) : null}
            </View>

            <Label text="Title" />
            <TextInput
              value={form.title}
              onChangeText={(value) => updateForm("title", value)}
              placeholder="BSP Specialist Visit"
              style={styles.input}
            />

            <Label text="Category" />
            <View style={styles.chipRow}>
              {categoryOptions.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => updateForm("mainCategory", category)}
                  style={[
                    styles.chip,
                    form.mainCategory === category && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.mainCategory === category && styles.chipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Label text="Type" />
            <View style={styles.dropdownWrap}>
              <Pressable
                style={styles.dropdownButton}
                onPress={() => setTypeMenuOpen((value) => !value)}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !form.eventType && styles.dropdownPlaceholder,
                  ]}
                >
                  {form.eventType || "Select type"}
                </Text>
                <Ionicons
                  name={typeMenuOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#6B7280"
                />
              </Pressable>

              {typeMenuOpen ? (
                <View style={styles.dropdownList}>
                  {eventTypeOptions.map((type) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.dropdownOption,
                        form.eventType === type && styles.dropdownOptionActive,
                      ]}
                      onPress={() => {
                        updateForm("eventType", type);
                        setTypeMenuOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          form.eventType === type &&
                            styles.dropdownOptionTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <Label text="Event date" />
                <TextInput
                  value={form.eventDateAU}
                  onChangeText={(value) => updateForm("eventDateAU", value)}
                  placeholder="30-06-2026"
                  style={styles.input}
                />
              </View>
              <View style={styles.columnSwitch}>
                <Text style={styles.switchLabel}>All day</Text>
                <Switch
                  value={form.allDay}
                  onValueChange={(value) => updateForm("allDay", value)}
                />
              </View>
            </View>

            {!form.allDay && (
              <View style={styles.twoColumnRow}>
                <View style={styles.column}>
                  <Label text="Start time" />
                  <TextInput
                    value={form.startTime}
                    onChangeText={(value) => updateForm("startTime", value)}
                    placeholder="10:30"
                    style={styles.input}
                  />
                </View>
                <View style={styles.column}>
                  <Label text="End time" />
                  <TextInput
                    value={form.endTime}
                    onChangeText={(value) => updateForm("endTime", value)}
                    placeholder="11:30"
                    style={styles.input}
                  />
                </View>
              </View>
            )}

            {!editingId ? (
              <View style={styles.recurrencePanel}>
                <View style={styles.toggleRowNoBorder}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleText}>Recurring event</Text>
                    <Text style={styles.recurrenceHint}>
                      Creates each future visit as a normal dashboard item.
                    </Text>
                  </View>
                  <Switch
                    value={form.recurring}
                    onValueChange={(value) => updateForm("recurring", value)}
                  />
                </View>

                {form.recurring ? (
                  <View>
                    <Text style={styles.miniLabel}>Repeat</Text>
                    <View style={styles.chipRow}>
                      {recurrenceFrequencyOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() =>
                            updateForm("recurrenceFrequency", option.value)
                          }
                          style={[
                            styles.chip,
                            form.recurrenceFrequency === option.value &&
                              styles.chipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              form.recurrenceFrequency === option.value &&
                                styles.chipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {form.recurrenceFrequency !== "monthly" ? (
                      <>
                        <Text style={styles.miniLabel}>Days of week</Text>
                        <View style={styles.chipRow}>
                          {weekdayOptions.map((day) => (
                            <Pressable
                              key={day.value}
                              onPress={() => toggleRecurrenceDay(day.value)}
                              style={[
                                styles.dayChip,
                                form.recurrenceDays.includes(day.value) &&
                                  styles.chipActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  form.recurrenceDays.includes(day.value) &&
                                    styles.chipTextActive,
                                ]}
                              >
                                {day.shortLabel}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    ) : null}

                    <View style={styles.twoColumnRow}>
                      <View style={styles.column}>
                        <Label text="Number of visits to create" />
                        <TextInput
                          value={form.recurrenceCount}
                          onChangeText={(value) =>
                            updateForm("recurrenceCount", value)
                          }
                          placeholder="12"
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.column}>
                        <Label text="Or end recurring on" />
                        <TextInput
                          value={form.recurrenceEndAU}
                          onChangeText={(value) =>
                            updateForm("recurrenceEndAU", value)
                          }
                          placeholder="31-12-2026"
                          style={styles.input}
                        />
                      </View>
                    </View>
                    <Text style={styles.recurrenceHint}>
                      Use either a visit count or an end date. If both are
                      blank, the app creates the next 12 visits.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <Label text="Display from" />
                <TextInput
                  value={form.displayFromAU}
                  onChangeText={(value) => updateForm("displayFromAU", value)}
                  placeholder="Leave blank for today"
                  style={styles.input}
                />
              </View>
              <View style={styles.column}>
                <Label text="Display until" />
                <TextInput
                  value={form.displayUntilAU}
                  onChangeText={(value) => updateForm("displayUntilAU", value)}
                  placeholder="Leave blank for event day"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <Label text="Visitor name" />
                <TextInput
                  value={form.visitorName}
                  onChangeText={(value) => updateForm("visitorName", value)}
                  placeholder="Sarah Jones"
                  style={styles.input}
                />
              </View>
              <View style={styles.column}>
                <Label text="Organisation" />
                <TextInput
                  value={form.organisation}
                  onChangeText={(value) => updateForm("organisation", value)}
                  placeholder="Example Behaviour Support"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <Label text="Responsible staff" />
                <TextInput
                  value={form.responsibleStaff}
                  onChangeText={(value) =>
                    updateForm("responsibleStaff", value)
                  }
                  placeholder="Bruno"
                  style={styles.input}
                />
              </View>
              <View style={styles.column}>
                <Label text="Location" />
                <TextInput
                  value={form.location}
                  onChangeText={(value) => updateForm("location", value)}
                  placeholder="Main Activity Room"
                  style={styles.input}
                />
              </View>
            </View>

            <Label text="Related participant, optional" />
            <TextInput
              value={form.relatedParticipant}
              onChangeText={(value) => updateForm("relatedParticipant", value)}
              placeholder="Only if appropriate for admin view"
              style={styles.input}
            />

            <Label text="Notes" />
            <TextInput
              value={form.notes}
              onChangeText={(value) => updateForm("notes", value)}
              placeholder="Admin notes. Avoid sensitive details on dashboard."
              style={[styles.input, styles.notesInput]}
              multiline
              textAlignVertical="top"
            />

            <Label text="Status" />
            <View style={styles.chipRow}>
              {statusOptions.map((status) => (
                <Pressable
                  key={status}
                  onPress={() => updateForm("status", status)}
                  style={[
                    styles.chip,
                    form.status === status && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.status === status && styles.chipTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Show on dashboard</Text>
              <Switch
                value={form.dashboardVisible}
                onValueChange={(value) => updateForm("dashboardVisible", value)}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Auto archive after event</Text>
              <Switch
                value={form.autoArchive}
                onValueChange={(value) => updateForm("autoArchive", value)}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                saving && styles.saveButtonDisabled,
              ]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingId
                    ? "Save Changes"
                    : form.recurring
                      ? "Save Recurring Items"
                      : "Save Item"}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.panel}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.panelTitle}>Current Items</Text>
              <Pressable
                style={styles.refreshButton}
                onPress={() => void fetchItems()}
              >
                <Ionicons name="refresh" size={16} color="#6B7280" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </Pressable>
            </View>

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading items...</Text>
              </View>
            )}

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            {!loading && activeItems.length === 0 && (
              <Text style={styles.emptyText}>
                No events, meetings or visits added yet.
              </Text>
            )}

            {!loading &&
              activeItems.map((item) => (
                <EventCard
                  key={item.id}
                  item={item}
                  onEdit={() => handleEdit(item)}
                  onArchive={() => updateStatus(item.id, "Archived")}
                  onComplete={() => updateStatus(item.id, "Completed")}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
          </View>

          {archivedItems.length > 0 && (
            <View style={styles.panelMuted}>
              <Text style={styles.panelTitle}>Archived</Text>
              {archivedItems.map((item) => (
                <EventCard
                  key={item.id}
                  item={item}
                  compact
                  onEdit={() => handleEdit(item)}
                  onArchive={() => updateStatus(item.id, "Scheduled")}
                  onComplete={() => updateStatus(item.id, "Completed")}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Footer />
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function EventCard({
  item,
  compact = false,
  onEdit,
  onArchive,
  onComplete,
  onDelete,
}: {
  item: EventsMeetingsVisitsRecord;
  compact?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.eventCard, compact && styles.eventCardMuted]}>
      <View style={styles.eventCardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.relativeLabel}>
            {getRelativeLabel(item.event_date)}
          </Text>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventMeta}>
            {item.main_category}
            {item.event_type ? ` · ${item.event_type}` : ""}
          </Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>
            {formatDateAU(item.event_date)}
          </Text>
        </View>
      </View>

      <View style={styles.eventDetails}>
        <Text style={styles.eventLine}>
          {item.all_day
            ? "All day"
            : `${formatTime(item.start_time) || "?"} – ${formatTime(item.end_time) || "?"}`}
        </Text>
        {item.responsible_staff ? (
          <Text style={styles.eventLine}>Host: {item.responsible_staff}</Text>
        ) : null}
        {item.visitor_name ? (
          <Text style={styles.eventLine}>Visitor: {item.visitor_name}</Text>
        ) : null}
        {item.organisation ? (
          <Text style={styles.eventLine}>
            Organisation: {item.organisation}
          </Text>
        ) : null}
        {item.location ? (
          <Text style={styles.eventLine}>Location: {item.location}</Text>
        ) : null}
        <Text style={styles.eventLine}>Status: {item.status}</Text>
        <Text style={styles.eventLine}>
          Dashboard: {item.dashboard_visible ? "Visible" : "Hidden"}
        </Text>
      </View>

      {!compact && item.notes ? (
        <Text style={styles.notesText}>{item.notes}</Text>
      ) : null}

      <View style={styles.cardActionRow}>
        <Pressable style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
        {item.status !== "Completed" && item.status !== "Archived" ? (
          <Pressable style={styles.secondaryButton} onPress={onComplete}>
            <Text style={styles.secondaryButtonText}>Complete</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.secondaryButton} onPress={onArchive}>
          <Text style={styles.secondaryButtonText}>
            {item.status === "Archived" ? "Restore" : "Archive"}
          </Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fef5fb",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
    alignItems: "center",
    paddingBottom: 200,
  },
  inner: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: 16,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  backButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  headerIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  nowEditing: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    marginTop: 2,
    fontSize: 24,
    color: "#111827",
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  panelMuted: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  panelTitle: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "800",
    marginBottom: 12,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  editingNotice: {
    marginTop: -6,
    marginBottom: 10,
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  cancelEditButton: {
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelEditButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  notesInput: {
    minHeight: 90,
  },
  dropdownWrap: {
    position: "relative",
    zIndex: 20,
  },
  dropdownButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  dropdownPlaceholder: {
    color: "#9CA3AF",
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownOptionActive: {
    backgroundColor: "#F5EAF8",
  },
  dropdownOptionText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "700",
  },
  dropdownOptionTextActive: {
    color: "#562C61",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#562C61",
    borderColor: "#562C61",
  },
  chipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionChipText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
  },
  columnSwitch: {
    width: 130,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 6,
  },
  switchLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 6,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  toggleRowNoBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  recurrencePanel: {
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
    padding: 12,
  },
  recurrenceHint: {
    marginTop: 2,
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
  miniLabel: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dayChip: {
    minWidth: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "700",
  },
  saveButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#562C61",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.998 }],
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  refreshButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    paddingVertical: 10,
  },
  eventCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
    padding: 14,
    marginTop: 10,
  },
  eventCardMuted: {
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  eventCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  relativeLabel: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  eventTitle: {
    marginTop: 2,
    fontSize: 16,
    color: "#111827",
    fontWeight: "800",
  },
  eventMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  dateBadge: {
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateBadgeText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "800",
  },
  eventDetails: {
    marginTop: 10,
    gap: 2,
  },
  eventLine: {
    fontSize: 13,
    color: "#374151",
  },
  notesText: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
    fontSize: 12,
    color: "#6B7280",
  },
  cardActionRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  editButton: {
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 12,
    color: "#1D4ED8",
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "800",
  },
  deleteButton: {
    borderRadius: 999,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "800",
  },
});
