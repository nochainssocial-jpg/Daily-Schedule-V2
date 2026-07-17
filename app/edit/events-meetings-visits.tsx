// FINAL AUTO-GROUP INBOX SERIES MANAGER - series save fix: update/insert/archive
// app/edit/events-meetings-visits.tsx
import { DEFAULT_LOCATION_ID } from '@/constants/location';
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
const HOUSE = DEFAULT_LOCATION_ID;

type MainCategory = "Event" | "Meeting" | "Visit";
type EventStatus =
  "Scheduled" | "Active" | "Completed" | "Cancelled" | "Archived";
type RecurrenceFrequency = "weekly" | "fortnightly" | "monthly";
type WeekdayKey = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";
type FilterStatus = "Inbox" | "All" | EventStatus;
type FilterCategory = "All" | MainCategory;
type GuideStepKey = "title" | "type" | "date" | "time" | "recurrence" | "hostLocation" | "save";

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
  is_recurring?: boolean;
  recurrence_group_id?: string | null;
  recurrence_frequency?: RecurrenceFrequency | null;
  recurrence_days?: WeekdayKey[] | null;
  recurrence_count?: number | null;
  recurrence_index?: number | null;
};

type EventsMeetingsVisitsListItem = {
  key: string;
  kind: "single" | "series";
  representative: EventsMeetingsVisitsRecord;
  items: EventsMeetingsVisitsRecord[];
  recurrenceGroupId?: string | null;
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
  eventType: "",
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

const statusFilterOptions: { label: string; value: FilterStatus }[] = [
  { label: "Inbox", value: "Inbox" },
  { label: "All", value: "All" },
  { label: "Scheduled", value: "Scheduled" },
  { label: "Active", value: "Active" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
  { label: "Archived", value: "Archived" },
];

const categoryFilterOptions: { label: string; value: FilterCategory }[] = [
  { label: "All", value: "All" },
  { label: "Event", value: "Event" },
  { label: "Meeting", value: "Meeting" },
  { label: "Visit", value: "Visit" },
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
  return `${day}/${month}/${year}`;
}

function formatTimestampDateAU(value?: string | null) {
  if (!value) return "";
  return formatDateAU(value);
}

function auDateToISO(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;

  const [, rawDay, rawMonth, year] = match;
  const day = rawDay.padStart(2, "0");
  const month = rawMonth.padStart(2, "0");
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

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
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

  // Accepts 24-hour time like 09:00 / 14:00 and AM/PM time like 9:00am / 2pm.
  const compact = trimmed
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(".", ":");

  const match = compact.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];

  if (minutes < 0 || minutes > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "am" && hours === 12) hours = 0;
    if (meridiem === "pm" && hours !== 12) hours += 12;
  } else if (hours < 0 || hours > 23) {
    return null;
  }

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


function generateUuid() {
  const cryptoObject = (globalThis as any).crypto;
  if (cryptoObject?.randomUUID) {
    return cryptoObject.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function compareEventsByDateTime(
  first: EventsMeetingsVisitsRecord,
  second: EventsMeetingsVisitsRecord,
) {
  const firstKey = `${first.event_date} ${first.start_time || "00:00"}`;
  const secondKey = `${second.event_date} ${second.start_time || "00:00"}`;
  return firstKey.localeCompare(secondKey);
}

function getRepresentativeRecord(records: EventsMeetingsVisitsRecord[]) {
  const sorted = [...records].sort(compareEventsByDateTime);
  const todayISO = localDateToISODate(new Date());
  return (
    sorted.find((item) => item.event_date >= todayISO && item.status !== "Archived") ||
    sorted[0]
  );
}

function normaliseSeriesValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function seriesSignature(record: EventsMeetingsVisitsRecord) {
  return [
    record.title,
    record.main_category,
    record.event_type,
    record.all_day ? "all-day" : record.start_time,
    record.all_day ? "all-day" : record.end_time,
    record.visitor_name,
    record.organisation,
    record.responsible_staff,
    record.location,
  ]
    .map(normaliseSeriesValue)
    .join("|");
}

function buildGroupedListItems(records: EventsMeetingsVisitsRecord[]) {
  const recurringGroups = new Map<string, EventsMeetingsVisitsRecord[]>();
  const ungroupedBySignature = new Map<string, EventsMeetingsVisitsRecord[]>();

  records.forEach((record) => {
    // Real recurring records collapse by their saved Supabase group id.
    if (record.recurrence_group_id) {
      const current = recurringGroups.get(record.recurrence_group_id) || [];
      current.push(record);
      recurringGroups.set(record.recurrence_group_id, current);
      return;
    }

    // Older/generated rows may not have recurrence_group_id yet. Infer a series
    // when multiple rows have the same visit details but different dates.
    const signature = seriesSignature(record);
    const current = ungroupedBySignature.get(signature) || [];
    current.push(record);
    ungroupedBySignature.set(signature, current);
  });

  const listItems: EventsMeetingsVisitsListItem[] = [];

  Array.from(recurringGroups.entries()).forEach(([groupId, groupRecords]) => {
    const sorted = [...groupRecords].sort(compareEventsByDateTime);
    listItems.push({
      key: groupId,
      kind: "series",
      representative: getRepresentativeRecord(sorted),
      items: sorted,
      recurrenceGroupId: groupId,
    });
  });

  Array.from(ungroupedBySignature.entries()).forEach(([signature, signatureRecords]) => {
    const sorted = [...signatureRecords].sort(compareEventsByDateTime);

    if (sorted.length >= 2) {
      listItems.push({
        key: `inferred-series-${signature}`,
        kind: "series",
        representative: getRepresentativeRecord(sorted),
        items: sorted,
        recurrenceGroupId: null,
      });
      return;
    }

    const single = sorted[0];
    listItems.push({
      key: single.id,
      kind: "single",
      representative: single,
      items: [single],
      recurrenceGroupId: null,
    });
  });

  return listItems.sort((first, second) =>
    compareEventsByDateTime(first.representative, second.representative),
  );
}

function recurrenceFrequencyLabel(value?: string | null) {
  if (value === "fortnightly") return "Fortnightly";
  if (value === "monthly") return "Monthly";
  return "Weekly";
}

function recurrenceDaysLabel(item: EventsMeetingsVisitsRecord) {
  if (!item.recurrence_days || item.recurrence_days.length === 0) {
    return (
      weekdayOptions.find(
        (day) => day.value === weekdayKeyFromDate(isoDateToLocalDate(item.event_date)),
      )?.shortLabel || ""
    );
  }

  return item.recurrence_days
    .map((key) => weekdayOptions.find((day) => day.value === key)?.shortLabel)
    .filter(Boolean)
    .join(" / ");
}


function stripRecurrenceMetadata<T extends Record<string, any>>(payload: T) {
  const {
    is_recurring,
    recurrence_group_id,
    recurrence_frequency,
    recurrence_days,
    recurrence_count,
    recurrence_index,
    ...rest
  } = payload;
  return rest;
}

function looksLikeMissingRecurrenceColumns(error: any) {
  const message = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("is_recurring") ||
    message.includes("recurrence_group_id") ||
    message.includes("recurrence_frequency") ||
    message.includes("recurrence_days") ||
    message.includes("recurrence_count") ||
    message.includes("recurrence_index")
  );
}

const guideCopy: Record<GuideStepKey, { title: string; text: string }> = {
  title: {
    title: "Step 1: Add a clear title",
    text: "Use plain wording such as BSP Visit, Speech Therapy, Jersey Day or Staff Meeting.",
  },
  type: {
    title: "Step 2: Choose the type",
    text: "Pick the closest type from the list. If nothing fits, choose Other.",
  },
  date: {
    title: "Step 3: Enter the date",
    text: "Use Australian format: DD/MM/YYYY. Example: 30/06/2026.",
  },
  time: {
    title: "Step 4: Add the time",
    text: "Enter start and end time, or turn on All day if it runs for the whole day.",
  },
  recurrence: {
    title: "Recurring visit setup",
    text: "Select the repeat days, then enter the number of visits to create. Example: 12.",
  },
  hostLocation: {
    title: "Add who is responsible",
    text: "Add the host/responsible staff member and location so the dashboard is clear for everyone.",
  },
  save: {
    title: "Ready to save",
    text: "All required details are complete. Click Save to complete the entry.",
  },
};

function getCurrentGuideStep(form: FormState): GuideStepKey {
  if (!form.title.trim()) return "title";
  if (!form.eventType.trim()) return "type";
  if (!auDateToISO(form.eventDateAU)) return "date";

  if (!form.allDay && (!normaliseTime(form.startTime) || !normaliseTime(form.endTime))) {
    return "time";
  }

  if (form.recurring) {
    if (form.recurrenceFrequency !== "monthly" && form.recurrenceDays.length === 0) {
      return "recurrence";
    }

    if (!parsePositiveInteger(form.recurrenceCount) && !auDateToISO(form.recurrenceEndAU)) {
      return "recurrence";
    }
  }

  if (!form.responsibleStaff.trim() || !form.location.trim()) {
    return "hostLocation";
  }

  return "save";
}

export default function EventsMeetingsVisitsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<EventsMeetingsVisitsRecord[]>([]);
  const [form, setForm] = useState<FormState>(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingSeriesIds, setEditingSeriesIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [guideEnabled, setGuideEnabled] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("Inbox");
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const listItems = useMemo(() => buildGroupedListItems(items), [items]);
  const currentGuideStep = useMemo(() => getCurrentGuideStep(form), [form]);

  function isGuided(step: GuideStepKey) {
    return guideEnabled && currentGuideStep === step;
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return listItems.filter((listItem) => {
      const item = listItem.representative;

      if (statusFilter === "Inbox" && item.status === "Archived") return false;
      if (statusFilter !== "Inbox" && statusFilter !== "All" && item.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "All" && item.main_category !== categoryFilter) {
        return false;
      }

      if (!query) return true;

      const searchable = listItem.items
        .map((record) =>
          [
            record.title,
            record.main_category,
            record.event_type,
            record.event_date,
            record.visitor_name,
            record.organisation,
            record.responsible_staff,
            record.location,
            record.status,
          ]
            .filter(Boolean)
            .join(" "),
        )
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [listItems, searchQuery, statusFilter, categoryFilter]);

  const selectedCount = selectedIds.size;

  const visibleIds = useMemo(
    () => filteredItems.map((listItem) => listItem.key),
    [filteredItems],
  );

  const allVisibleSelected = useMemo(
    () =>
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.has(id)),
    [selectedIds, visibleIds],
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

  useEffect(() => {
    setSelectedIds((current) => {
      const validIds = new Set(buildGroupedListItems(items).map((listItem) => listItem.key));
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleEdit(listItem: EventsMeetingsVisitsListItem) {
    const sortedGroupItems = [...listItem.items].sort(compareEventsByDateTime);
    const sourceItem = sortedGroupItems[0] || listItem.representative;
    const finalItem = sortedGroupItems[sortedGroupItems.length - 1] || sourceItem;
    const isSeries = listItem.kind === "series";
    const recurrenceDays =
      sourceItem.recurrence_days && sourceItem.recurrence_days.length > 0
        ? sourceItem.recurrence_days
        : Array.from(
            new Set(
              sortedGroupItems.map((item) =>
                weekdayKeyFromDate(isoDateToLocalDate(item.event_date)),
              ),
            ),
          );

    setSelectedIds(new Set());
    setEditingId(isSeries ? null : sourceItem.id);
    setEditingGroupId(isSeries && listItem.recurrenceGroupId ? listItem.recurrenceGroupId : null);
    setEditingSeriesIds(isSeries && !listItem.recurrenceGroupId ? sortedGroupItems.map((item) => item.id) : []);
    setForm({
      title: sourceItem.title || "",
      mainCategory: sourceItem.main_category || "Visit",
      eventType: sourceItem.event_type || "",
      eventDateAU: formatDateAU(sourceItem.event_date),
      startTime: formatTime(sourceItem.start_time),
      endTime: formatTime(sourceItem.end_time),
      allDay: sourceItem.all_day,
      displayFromAU: formatTimestampDateAU(sourceItem.display_from),
      displayUntilAU: formatTimestampDateAU(sourceItem.display_until),
      visitorName: sourceItem.visitor_name || "",
      organisation: sourceItem.organisation || "",
      relatedParticipant: sourceItem.related_participant || "",
      responsibleStaff: sourceItem.responsible_staff || "",
      location: sourceItem.location || "",
      dashboardVisible: sourceItem.dashboard_visible,
      autoArchive: sourceItem.auto_archive,
      status: sourceItem.status || "Scheduled",
      notes: sourceItem.notes || "",
      recurring: isSeries,
      recurrenceFrequency:
        sourceItem.recurrence_frequency === "fortnightly" ||
        sourceItem.recurrence_frequency === "monthly"
          ? sourceItem.recurrence_frequency
          : "weekly",
      recurrenceDays,
      recurrenceEndAU: isSeries ? formatDateAU(finalItem.event_date) : "",
      recurrenceCount: isSeries
        ? String(sourceItem.recurrence_count || sortedGroupItems.length)
        : "",
    });
    setTypeMenuOpen(false);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditingGroupId(null);
    setEditingSeriesIds([]);
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
      Alert.alert("Check date", "Please enter the event date as DD/MM/YYYY.");
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

    const isEditingSeries = Boolean(editingGroupId) || editingSeriesIds.length > 0;
    const shouldGenerateRecurringItems = form.recurring || isEditingSeries;

    const recurrenceEnd =
      shouldGenerateRecurringItems && form.recurrenceEndAU.trim()
        ? auDateToISO(form.recurrenceEndAU)
        : null;

    if (shouldGenerateRecurringItems && form.recurrenceEndAU.trim() && !recurrenceEnd) {
      Alert.alert(
        "Check recurring end date",
        "Recurring end date must use DD/MM/YYYY.",
      );
      return;
    }

    const occurrenceLimit = shouldGenerateRecurringItems
      ? parsePositiveInteger(form.recurrenceCount) || null
      : null;

    if (shouldGenerateRecurringItems && form.recurrenceCount.trim() && !occurrenceLimit) {
      Alert.alert(
        "Check number of visits",
        "Please enter a whole number, for example 12.",
      );
      return;
    }

    const recurringEventDates = shouldGenerateRecurringItems
      ? generateRecurringDates(
          eventDate,
          { ...form, recurring: true },
          recurrenceEnd,
          occurrenceLimit,
        )
      : [eventDate];

    if (shouldGenerateRecurringItems && recurringEventDates.length === 0) {
      Alert.alert(
        "No recurring dates",
        "Please check the start date, selected days and recurring end date.",
      );
      return;
    }

    if (shouldGenerateRecurringItems && recurringEventDates.length >= 160) {
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
      Alert.alert("Check display from", "Display from must use DD/MM/YYYY.");
      return;
    }

    if (form.displayUntilAU.trim() && !baseDisplayUntil) {
      Alert.alert("Check display until", "Display until must use DD/MM/YYYY.");
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

      if (shouldGenerateRecurringItems) {
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

      // Timed items leave the dashboard at their own end time. All-day items
      // remain visible until the end of the event day.
      const defaultDisplayUntilTime = !form.allDay && endTime ? endTime : "23:59";
      return auDateToDeviceLocalISOString(
        isoDateToAU(eventDateISO),
        defaultDisplayUntilTime,
      );
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

    let usedRecurrenceColumnFallback = false;

    async function updateEventRecord(id: string, payload: Record<string, any>) {
      const { error } = await supabase
        .from("events_meetings_visits")
        .update(payload)
        .eq("id", id)
        .select("id");

      if (error && looksLikeMissingRecurrenceColumns(error)) {
        usedRecurrenceColumnFallback = true;
        const { error: fallbackError } = await supabase
          .from("events_meetings_visits")
          .update(stripRecurrenceMetadata(payload))
          .eq("id", id)
          .select("id");
        return fallbackError;
      }

      return error;
    }

    async function insertEventRecords(payloads: Record<string, any>[]) {
      const { data, error } = await supabase
        .from("events_meetings_visits")
        .insert(payloads)
        .select("id");

      if (error && looksLikeMissingRecurrenceColumns(error)) {
        usedRecurrenceColumnFallback = true;
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("events_meetings_visits")
          .insert(payloads.map(stripRecurrenceMetadata))
          .select("id");
        return { data: fallbackData, error: fallbackError };
      }

      return { data, error };
    }

    let saveError: any = null;
    const recurrenceGroupId = editingGroupId || (editingSeriesIds.length > 0 ? generateUuid() : shouldGenerateRecurringItems ? generateUuid() : null);
    const recurrencePayload = shouldGenerateRecurringItems
      ? {
          is_recurring: true,
          recurrence_group_id: recurrenceGroupId,
          recurrence_frequency: form.recurrenceFrequency,
          recurrence_days:
            form.recurrenceFrequency === "monthly" ? [] : form.recurrenceDays,
          recurrence_count: recurringEventDates.length,
        }
      : {
          is_recurring: false,
          recurrence_group_id: null,
          recurrence_frequency: null,
          recurrence_days: null,
          recurrence_count: null,
        };

    if (editingGroupId || editingSeriesIds.length > 0) {
      // SAFE SERIES SAVE:
      // Never delete or archive existing visits automatically.
      // Update existing rows in-place, and only insert extra rows when the visit count is increased.
      const existingSeriesRecords = editingGroupId
        ? items
            .filter((record) => record.recurrence_group_id === editingGroupId)
            .sort(compareEventsByDateTime)
        : items
            .filter((record) => editingSeriesIds.includes(record.id))
            .sort(compareEventsByDateTime);

      const existingSeriesIds = existingSeriesRecords.map((record) => record.id);
      const seriesGroupId = editingGroupId || recurrenceGroupId || generateUuid();

      if (existingSeriesIds.length === 0) {
        saveError = new Error("No existing series records were found to update.");
      } else if (recurringEventDates.length < existingSeriesIds.length) {
        setSaving(false);
        Alert.alert(
          "Visit count is lower",
          `This series currently has ${existingSeriesIds.length} visit records, but the form is set to ${recurringEventDates.length}. To avoid accidentally removing visits, no records were changed. For now, archive/delete surplus visits separately, then edit the series again.`,
        );
        return;
      } else {
        const seriesPayloads = recurringEventDates.map((dateForItem, index) => ({
          ...basePayload,
          is_recurring: true,
          recurrence_group_id: seriesGroupId,
          recurrence_frequency: form.recurrenceFrequency,
          recurrence_days:
            form.recurrenceFrequency === "monthly" ? [] : form.recurrenceDays,
          recurrence_count: recurringEventDates.length,
          event_date: dateForItem,
          display_from: displayFromForEvent(dateForItem),
          display_until: displayUntilForEvent(dateForItem),
          recurrence_index: index + 1,
        }));

        const updateCount = Math.min(existingSeriesIds.length, seriesPayloads.length);

        for (let index = 0; index < updateCount; index += 1) {
          const updateSeriesError = await updateEventRecord(
            existingSeriesIds[index],
            seriesPayloads[index],
          );

          if (updateSeriesError) {
            saveError = updateSeriesError;
            break;
          }
        }

        if (!saveError && seriesPayloads.length > existingSeriesIds.length) {
          const extraPayloads = seriesPayloads
            .slice(existingSeriesIds.length)
            .map((payload) => ({
              ...payload,
              created_by: userData.user?.id || null,
            }));

          const { error: insertSeriesError } = await insertEventRecords(extraPayloads);

          saveError = insertSeriesError;
        }
      }
    } else if (editingId) {
      const updateError = await updateEventRecord(editingId, {
        ...basePayload,
        ...recurrencePayload,
        event_date: eventDate,
        display_from: displayFromForEvent(eventDate),
        display_until: displayUntilForEvent(eventDate),
        recurrence_index: null,
      });
      saveError = updateError;
    } else {
      const { error: insertError } = await insertEventRecords(
        recurringEventDates.map((dateForItem, index) => ({
          ...basePayload,
          ...recurrencePayload,
          event_date: dateForItem,
          display_from: displayFromForEvent(dateForItem),
          display_until: displayUntilForEvent(dateForItem),
          recurrence_index: shouldGenerateRecurringItems ? index + 1 : null,
          created_by: userData.user?.id || null,
        })),
      );
      saveError = insertError;
    }

    setSaving(false);

    if (saveError) {
      console.error("Error saving event, meeting or visit:", saveError);
      const message =
        saveError?.message ||
        saveError?.details ||
        saveError?.hint ||
        "The item could not be saved.";
      Alert.alert("Save failed", String(message));
      return;
    }

    setSearchQuery("");
    setStatusFilter("Inbox");
    setCategoryFilter("All");
    handleCancelEdit();
    await fetchItems();

    if (usedRecurrenceColumnFallback) {
      Alert.alert(
        "Saved",
        "Saved successfully, but the Supabase recurring columns appear to be missing. Run the recurring SQL update when convenient so series metadata can be stored properly.",
      );
    }
  }

  function recordIdsForListKeys(keys: string[]) {
    const keySet = new Set(keys);
    return filteredItems
      .filter((listItem) => keySet.has(listItem.key))
      .flatMap((listItem) => listItem.items.map((item) => item.id));
  }

  async function updateListItemStatus(
    listItem: EventsMeetingsVisitsListItem,
    status: EventStatus,
  ) {
    const ids = listItem.items.map((item) => item.id);
    const { error } = await supabase
      .from("events_meetings_visits")
      .update({ status })
      .in("id", ids);

    if (error) {
      console.error("Error updating item status:", error);
      Alert.alert("Update failed", "The selected item could not be updated.");
      return;
    }

    await fetchItems();
  }

  async function deleteListItem(listItem: EventsMeetingsVisitsListItem) {
    if (listItem.kind === "single") {
      await deleteItem(listItem.representative.id);
      return;
    }

    const runDelete = async () => {
      const ids = listItem.items.map((item) => item.id);
      const { error } = await supabase
        .from("events_meetings_visits")
        .delete()
        .in("id", ids);

      if (error) {
        console.error("Error deleting recurring series:", error);
        Alert.alert("Delete failed", "The recurring series could not be deleted.");
        return;
      }

      await fetchItems();
    };

    const message = `Delete this recurring series permanently? This will delete ${listItem.items.length} visits.`;

    if (Platform.OS === "web") {
      const confirmed = (globalThis as any).confirm
        ? (globalThis as any).confirm(message)
        : true;

      if (confirmed) {
        await runDelete();
      }
      return;
    }

    Alert.alert("Delete recurring series?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: runDelete },
    ]);
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


  function toggleItemSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }

  async function bulkUpdateStatus(status: EventStatus) {
    const selectedKeys = Array.from(selectedIds) as string[];
    const ids = recordIdsForListKeys(selectedKeys);

    if (ids.length === 0) {
      Alert.alert("No items selected", "Select one or more items first.");
      return;
    }

    const { error } = await supabase
      .from("events_meetings_visits")
      .update({ status })
      .in("id", ids);

    if (error) {
      console.error("Error updating selected items:", error);
      Alert.alert("Update failed", "The selected items could not be updated.");
      return;
    }

    setSelectedIds(new Set());
    await fetchItems();
  }

  async function groupSelectedAsRecurringSeries() {
    const selectedKeySet = new Set(Array.from(selectedIds) as string[]);
    const selectedRecords = filteredItems
      .filter((listItem) => selectedKeySet.has(listItem.key))
      .flatMap((listItem) => listItem.items)
      .sort(compareEventsByDateTime);

    if (selectedRecords.length < 2) {
      Alert.alert(
        "Select more visits",
        "Select two or more related visits first, then group them as one recurring series.",
      );
      return;
    }

    const recordsBySeries = new Map<string, EventsMeetingsVisitsRecord[]>();
    selectedRecords.forEach((record) => {
      const key = seriesSignature(record);
      const current = recordsBySeries.get(key) || [];
      current.push(record);
      recordsBySeries.set(key, current);
    });

    const groupsToCreate = Array.from(recordsBySeries.values())
      .map((records) => [...records].sort(compareEventsByDateTime))
      .filter((records) => records.length >= 2);

    if (groupsToCreate.length === 0) {
      Alert.alert(
        "No matching series found",
        "The selected items do not appear to be matching recurring visits. Use search first, then select matching visits with the same title, time, visitor and location.",
      );
      return;
    }

    const runGroup = async () => {
      const createdGroupIds: string[] = [];
      let updatedRows = 0;
      let expectedRows = 0;

      for (const groupRecords of groupsToCreate) {
        const first = groupRecords[0];
        const groupId = generateUuid();
        createdGroupIds.push(groupId);
        expectedRows += groupRecords.length;

        const recurrenceDays = Array.from(
          new Set(
            groupRecords.map((record) =>
              weekdayKeyFromDate(isoDateToLocalDate(record.event_date)),
            ),
          ),
        ).sort(
          (a, b) =>
            weekdayOptions.findIndex((day) => day.value === a) -
            weekdayOptions.findIndex((day) => day.value === b),
        );

        const { data, error } = await supabase
          .from("events_meetings_visits")
          .update({
            is_recurring: true,
            recurrence_group_id: groupId,
            recurrence_frequency: first.recurrence_frequency || "weekly",
            recurrence_days: recurrenceDays,
            recurrence_count: groupRecords.length,
            recurrence_index: null,
          })
          .in(
            "id",
            groupRecords.map((record) => record.id),
          )
          .select("id");

        if (error) {
          console.error("Error grouping recurring series:", error);
          Alert.alert(
            "Group failed",
            `Supabase rejected the update: ${error.message || "Unknown error"}`,
          );
          return;
        }

        updatedRows += data?.length || 0;
      }

      if (updatedRows !== expectedRows) {
        Alert.alert(
          "Group incomplete",
          `Expected to update ${expectedRows} visits, but Supabase reported ${updatedRows}. Check Row Level Security update/select policies and the recurrence columns.`,
        );
        await fetchItems();
        return;
      }

      setSelectedIds(new Set(createdGroupIds));
      await fetchItems();
      Alert.alert(
        "Series grouped",
        groupsToCreate.length === 1
          ? `Grouped ${updatedRows} visits into one recurring series.`
          : `Grouped ${updatedRows} visits into ${groupsToCreate.length} recurring series.`,
      );
    };

    const message =
      groupsToCreate.length === 1
        ? `Group ${groupsToCreate[0].length} selected visits into one recurring series? After this, they will show as one row with an Edit Series button.`
        : `Group ${selectedRecords.length} selected visits into ${groupsToCreate.length} recurring series? Matching items will be grouped separately by title, time, visitor and location.`;

    if (Platform.OS === "web") {
      const confirmed = (globalThis as any).confirm
        ? (globalThis as any).confirm(message)
        : true;

      if (confirmed) {
        await runGroup();
      }
      return;
    }

    Alert.alert("Group as recurring series?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Group Series", onPress: runGroup },
    ]);
  }

  async function deleteSelectedItems() {
    const selectedKeys = Array.from(selectedIds) as string[];
    const ids = recordIdsForListKeys(selectedKeys);

    if (ids.length === 0) {
      Alert.alert("No items selected", "Select one or more items first.");
      return;
    }

    const runDelete = async () => {
      const { error } = await supabase
        .from("events_meetings_visits")
        .delete()
        .in("id", ids);

      if (error) {
        console.error("Error deleting selected items:", error);
        Alert.alert("Delete failed", "The selected items could not be deleted.");
        return;
      }

      setSelectedIds(new Set());
      await fetchItems();
    };

    if (Platform.OS === "web") {
      const confirmed = (globalThis as any).confirm
        ? (globalThis as any).confirm(`Delete ${ids.length} selected item${ids.length === 1 ? "" : "s"} permanently?`)
        : true;

      if (confirmed) {
        await runDelete();
      }
      return;
    }

    Alert.alert(
      "Delete selected items?",
      `This permanently deletes ${ids.length} selected item${ids.length === 1 ? "" : "s"}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: runDelete },
      ],
    );
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
                  {editingGroupId || editingSeriesIds.length > 0 ? "Edit Recurring Series" : editingId ? "Edit Item" : "Add New Item"}
                </Text>
                {editingId || editingGroupId || editingSeriesIds.length > 0 ? (
                  <Text style={styles.editingNotice}>
                    {editingGroupId || editingSeriesIds.length > 0
                      ? "Editing the whole recurring series. Save changes to regenerate all visits in this series."
                      : "Editing existing item. Save changes or cancel to return to a blank form."}
                  </Text>
                ) : null}
              </View>
              {editingId || editingGroupId || editingSeriesIds.length > 0 ? (
                <Pressable
                  style={styles.cancelEditButton}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                </Pressable>
              ) : null}
            </View>

            {guideEnabled ? (
              <View style={styles.guideCard}>
                <View style={styles.guideIconBubble}>
                  <Ionicons name="sparkles-outline" size={17} color="#7C2D12" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideTitle}>{guideCopy[currentGuideStep].title}</Text>
                  <Text style={styles.guideText}>{guideCopy[currentGuideStep].text}</Text>
                </View>
                <Pressable
                  style={styles.guideDismissButton}
                  onPress={() => setGuideEnabled(false)}
                >
                  <Text style={styles.guideDismissText}>Hide</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.showGuideButton}
                onPress={() => setGuideEnabled(true)}
              >
                <Ionicons name="help-circle-outline" size={16} color="#562C61" />
                <Text style={styles.showGuideButtonText}>Show entry guide</Text>
              </Pressable>
            )}

            <Label text="Title" />
            <GuideBubble
              visible={isGuided("title")}
              title={guideCopy.title.title}
              text={guideCopy.title.text}
            />
            <TextInput
              value={form.title}
              onChangeText={(value) => updateForm("title", value)}
              placeholder="BSP Specialist Visit"
              style={[styles.input, isGuided("title") && styles.guidedInput]}
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
            <GuideBubble
              visible={isGuided("type")}
              title={guideCopy.type.title}
              text={guideCopy.type.text}
            />
            <View style={styles.dropdownWrap}>
              <Pressable
                style={[styles.dropdownButton, isGuided("type") && styles.guidedInput]}
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
                <GuideBubble
                  visible={isGuided("date")}
                  title={guideCopy.date.title}
                  text={guideCopy.date.text}
                />
                <TextInput
                  value={form.eventDateAU}
                  onChangeText={(value) =>
                    updateForm("eventDateAU", formatDateInput(value))
                  }
                  placeholder="30/06/2026"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={[styles.input, isGuided("date") && styles.guidedInput]}
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
              <View>
                <GuideBubble
                  visible={isGuided("time")}
                  title={guideCopy.time.title}
                  text={guideCopy.time.text}
                />
                <View style={styles.twoColumnRow}>
                  <View style={styles.column}>
                    <Label text="Start time" />
                    <TextInput
                      value={form.startTime}
                      onChangeText={(value) => updateForm("startTime", value)}
                      placeholder="10:30"
                      style={[styles.input, isGuided("time") && styles.guidedInput]}
                    />
                  </View>
                  <View style={styles.column}>
                    <Label text="End time" />
                    <TextInput
                      value={form.endTime}
                      onChangeText={(value) => updateForm("endTime", value)}
                      placeholder="11:30"
                      style={[styles.input, isGuided("time") && styles.guidedInput]}
                    />
                  </View>
                </View>
              </View>
            )}

            {(!editingId || editingGroupId || editingSeriesIds.length > 0) ? (
              <View style={[styles.recurrencePanel, isGuided("recurrence") && styles.guidedPanel]}>
                <GuideBubble
                  visible={isGuided("recurrence")}
                  title={guideCopy.recurrence.title}
                  text={guideCopy.recurrence.text}
                />
                <View style={styles.toggleRowNoBorder}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleText}>Recurring event</Text>
                    <Text style={styles.recurrenceHint}>
                      {editingGroupId || editingSeriesIds.length > 0
                        ? "Editing this whole recurring series as one item."
                        : "Creates each future visit as a normal dashboard item."}
                    </Text>
                  </View>
                  <Switch
                    value={form.recurring}
                    onValueChange={(value) => updateForm("recurring", value)}
                    disabled={Boolean(editingGroupId) || editingSeriesIds.length > 0}
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
                            updateForm("recurrenceEndAU", formatDateInput(value))
                          }
                          placeholder="31/12/2026"
                          keyboardType="number-pad"
                          maxLength={10}
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
                  onChangeText={(value) =>
                    updateForm("displayFromAU", formatDateInput(value))
                  }
                  placeholder="Leave blank for today"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={styles.input}
                />
              </View>
              <View style={styles.column}>
                <Label text="Display until" />
                <TextInput
                  value={form.displayUntilAU}
                  onChangeText={(value) =>
                    updateForm("displayUntilAU", formatDateInput(value))
                  }
                  placeholder="Blank = event end time"
                  keyboardType="number-pad"
                  maxLength={10}
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

            <GuideBubble
              visible={isGuided("hostLocation")}
              title={guideCopy.hostLocation.title}
              text={guideCopy.hostLocation.text}
            />
            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <Label text="Responsible staff" />
                <TextInput
                  value={form.responsibleStaff}
                  onChangeText={(value) =>
                    updateForm("responsibleStaff", value)
                  }
                  placeholder="Bruno"
                  style={[styles.input, isGuided("hostLocation") && styles.guidedInput]}
                />
              </View>
              <View style={styles.column}>
                <Label text="Location" />
                <TextInput
                  value={form.location}
                  onChangeText={(value) => updateForm("location", value)}
                  placeholder="Main Activity Room"
                  style={[styles.input, isGuided("hostLocation") && styles.guidedInput]}
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

            <GuideBubble
              visible={isGuided("save")}
              title={guideCopy.save.title}
              text={guideCopy.save.text}
            />

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                isGuided("save") && styles.saveButtonGuided,
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
                  {editingGroupId || editingSeriesIds.length > 0
                    ? "Save Series Changes"
                    : editingId
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
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Events Inbox</Text>
                <Text style={styles.inboxSubtitle}>
                  Search, filter, select and manage events like a calendar/mailbox.
                </Text>
              </View>
              <Pressable
                style={styles.refreshButton}
                onPress={() => void fetchItems()}
              >
                <Ionicons name="refresh" size={16} color="#6B7280" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </Pressable>
            </View>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search title, visitor, organisation, host or location"
              style={styles.searchInput}
            />

            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.chipRow}>
              {statusFilterOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setStatusFilter(option.value)}
                  style={[
                    styles.filterChip,
                    statusFilter === option.value && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.filterLabel}>Category</Text>
            <View style={styles.chipRow}>
              {categoryFilterOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setCategoryFilter(option.value)}
                  style={[
                    styles.filterChip,
                    categoryFilter === option.value && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      categoryFilter === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.mailToolbar}>
              <Pressable
                style={styles.selectVisibleButton}
                onPress={toggleSelectAllVisible}
                disabled={filteredItems.length === 0}
              >
                <Ionicons
                  name={allVisibleSelected ? "checkbox" : "square-outline"}
                  size={18}
                  color={filteredItems.length === 0 ? "#9CA3AF" : "#562C61"}
                />
                <Text style={styles.selectVisibleText}>
                  {allVisibleSelected ? "Clear visible" : "Select visible"}
                </Text>
              </Pressable>

              <Text style={styles.selectionCount}>
                {selectedCount} selected · {filteredItems.length} shown
              </Text>

              <View style={styles.bulkActionRow}>
                <Pressable
                  style={[styles.bulkButton, selectedCount === 0 && styles.bulkButtonDisabled]}
                  onPress={() => void bulkUpdateStatus("Completed")}
                  disabled={selectedCount === 0}
                >
                  <Text
                    style={[
                      styles.bulkButtonText,
                      selectedCount === 0 && styles.bulkButtonTextDisabled,
                    ]}
                  >
                    Complete
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.bulkButton, selectedCount === 0 && styles.bulkButtonDisabled]}
                  onPress={() => void bulkUpdateStatus("Archived")}
                  disabled={selectedCount === 0}
                >
                  <Text
                    style={[
                      styles.bulkButtonText,
                      selectedCount === 0 && styles.bulkButtonTextDisabled,
                    ]}
                  >
                    Archive
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.bulkButton, selectedCount === 0 && styles.bulkButtonDisabled]}
                  onPress={() => void bulkUpdateStatus("Scheduled")}
                  disabled={selectedCount === 0}
                >
                  <Text
                    style={[
                      styles.bulkButtonText,
                      selectedCount === 0 && styles.bulkButtonTextDisabled,
                    ]}
                  >
                    Restore
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.bulkButton, selectedCount < 2 && styles.bulkButtonDisabled]}
                  onPress={() => void groupSelectedAsRecurringSeries()}
                  disabled={selectedCount < 2}
                >
                  <Text
                    style={[
                      styles.bulkButtonText,
                      selectedCount < 2 && styles.bulkButtonTextDisabled,
                    ]}
                  >
                    Group Series
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.bulkDeleteButton, selectedCount === 0 && styles.bulkDeleteButtonDisabled]}
                  onPress={() => void deleteSelectedItems()}
                  disabled={selectedCount === 0}
                >
                  <Text
                    style={[
                      styles.bulkDeleteButtonText,
                      selectedCount === 0 && styles.bulkButtonTextDisabled,
                    ]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>

              {selectedCount < 2 ? (
                <Text style={styles.seriesHintText}>
                  Select two or more matching visits to enable Group Series. Use search first, then Select visible.
                </Text>
              ) : null}
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

            {!loading && filteredItems.length === 0 && (
              <Text style={styles.emptyText}>
                No events, meetings or visits match the current filters.
              </Text>
            )}

            {!loading && filteredItems.length > 0 ? (
              <View style={styles.mailList}>
                {filteredItems.map((listItem) => (
                  <InboxRow
                    key={listItem.key}
                    listItem={listItem}
                    selected={selectedIds.has(listItem.key)}
                    onToggleSelected={() => toggleItemSelected(listItem.key)}
                    onEdit={() => handleEdit(listItem)}
                    onArchive={() =>
                      updateListItemStatus(
                        listItem,
                        listItem.representative.status === "Archived" ? "Scheduled" : "Archived",
                      )
                    }
                    onComplete={() => updateListItemStatus(listItem, "Completed")}
                    onDelete={() => deleteListItem(listItem)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <Footer />
    </View>
  );
}

function GuideBubble({
  visible,
  title,
  text,
}: {
  visible: boolean;
  title: string;
  text: string;
}) {
  if (!visible) return null;

  return (
    <View style={styles.guideBubble}>
      <Ionicons name="information-circle-outline" size={16} color="#92400E" />
      <View style={{ flex: 1 }}>
        <Text style={styles.guideBubbleTitle}>{title}</Text>
        <Text style={styles.guideBubbleText}>{text}</Text>
      </View>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function InboxRow({
  listItem,
  selected,
  onToggleSelected,
  onEdit,
  onArchive,
  onComplete,
  onDelete,
}: {
  listItem: EventsMeetingsVisitsListItem;
  selected: boolean;
  onToggleSelected: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const item = listItem.representative;
  const isSeries = listItem.kind === "series";
  const firstItem = [...listItem.items].sort(compareEventsByDateTime)[0] || item;
  const lastItem = [...listItem.items].sort(compareEventsByDateTime)[listItem.items.length - 1] || item;
  const timeLabel = item.all_day
    ? "All day"
    : `${formatTime(item.start_time) || "?"} – ${formatTime(item.end_time) || "?"}`;

  const seriesLabel = isSeries
    ? `${recurrenceFrequencyLabel(item.recurrence_frequency)}${recurrenceDaysLabel(item) ? ` · ${recurrenceDaysLabel(item)}` : ""} · ${listItem.items.length} visits`
    : null;

  const dateLabel = isSeries
    ? `${formatDateAU(firstItem.event_date)} – ${formatDateAU(lastItem.event_date)}`
    : formatDateAU(item.event_date);

  const detailParts = [
    item.event_type,
    item.responsible_staff ? `Host: ${item.responsible_staff}` : null,
    item.visitor_name ? `Visitor: ${item.visitor_name}` : null,
    item.location,
  ].filter(Boolean);

  return (
    <View style={[styles.inboxRow, selected && styles.inboxRowSelected]}>
      <Pressable style={styles.checkboxCell} onPress={onToggleSelected}>
        <Ionicons
          name={selected ? "checkbox" : "square-outline"}
          size={22}
          color={selected ? "#562C61" : "#9CA3AF"}
        />
      </Pressable>

      <View style={styles.dateCell}>
        <Text style={styles.relativeLabel}>
          {isSeries ? "Recurring series" : getRelativeLabel(item.event_date)}
        </Text>
        <Text style={styles.dateCellText}>{dateLabel}</Text>
        <Text style={styles.timeCellText}>{timeLabel}</Text>
      </View>

      <View style={styles.messageCell}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventMeta}>{item.main_category}</Text>
        {seriesLabel ? <Text style={styles.seriesText}>{seriesLabel}</Text> : null}
        {detailParts.length > 0 ? (
          <Text style={styles.inboxDetailLine}>{detailParts.join(" · ")}</Text>
        ) : null}
        {item.notes ? (
          <Text style={styles.inboxNotesLine} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>

      <View style={styles.statusCell}>
        <View
          style={[
            styles.statusPill,
            item.status === "Archived" && styles.statusPillArchived,
            item.status === "Completed" && styles.statusPillCompleted,
            item.status === "Cancelled" && styles.statusPillCancelled,
          ]}
        >
          <Text style={styles.statusPillText}>{item.status}</Text>
        </View>
        <Text style={styles.dashboardMiniText}>
          {item.dashboard_visible ? "Dashboard visible" : "Dashboard hidden"}
        </Text>
      </View>

      <View style={styles.rowActionCell}>
        <Pressable style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editButtonText}>{isSeries ? "Edit Series" : "Edit"}</Text>
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
  guideCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FBBF24",
    backgroundColor: "#FFFBEB",
    padding: 12,
    marginBottom: 14,
  },
  guideIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  guideTitle: {
    fontSize: 13,
    color: "#7C2D12",
    fontWeight: "900",
  },
  guideText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: "#92400E",
    fontWeight: "600",
  },
  guideDismissButton: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  guideDismissText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "900",
  },
  showGuideButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#F5EAF8",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  showGuideButtonText: {
    fontSize: 12,
    color: "#562C61",
    fontWeight: "900",
  },
  guideBubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  guideBubbleTitle: {
    fontSize: 12,
    color: "#7C2D12",
    fontWeight: "900",
  },
  guideBubbleText: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
    color: "#92400E",
    fontWeight: "600",
  },
  guidedInput: {
    borderColor: "#F59E0B",
    borderWidth: 2,
    backgroundColor: "#FFFBEB",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  guidedPanel: {
    borderColor: "#F59E0B",
    borderWidth: 2,
  },
  saveButtonGuided: {
    backgroundColor: "#7C2D12",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
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
  inboxSubtitle: {
    marginTop: -6,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  searchInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginTop: 12,
    marginBottom: 10,
  },
  filterLabel: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "800",
  },
  mailToolbar: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    gap: 8,
  },
  selectVisibleButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectVisibleText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "800",
  },
  selectionCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
  bulkActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bulkButton: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bulkButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "800",
  },
  bulkButtonDisabled: {
    opacity: 0.45,
  },
  bulkButtonTextDisabled: {
    color: "#9CA3AF",
  },
  bulkDeleteButtonDisabled: {
    opacity: 0.45,
  },
  seriesHintText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  bulkDeleteButton: {
    borderRadius: 999,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bulkDeleteButtonText: {
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "800",
  },
  mailList: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  inboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  inboxRowSelected: {
    backgroundColor: "#F5EAF8",
  },
  checkboxCell: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCell: {
    width: 116,
    gap: 2,
  },
  dateCellText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "800",
  },
  timeCellText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
  messageCell: {
    flex: 1,
    minWidth: 180,
  },
  seriesText: {
    marginTop: 2,
    fontSize: 12,
    color: "#92400E",
    fontWeight: "800",
  },
  inboxDetailLine: {
    marginTop: 2,
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  inboxNotesLine: {
    marginTop: 3,
    fontSize: 11,
    color: "#6B7280",
  },
  statusCell: {
    width: 120,
    gap: 4,
    alignItems: "flex-start",
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillArchived: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
  },
  statusPillCompleted: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  statusPillCancelled: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusPillText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "800",
  },
  dashboardMiniText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "700",
  },
  rowActionCell: {
    width: 220,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
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
