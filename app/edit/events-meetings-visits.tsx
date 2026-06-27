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
type EventStatus = "Scheduled" | "Active" | "Completed" | "Cancelled" | "Archived";

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
};

const blankForm: FormState = {
  title: "",
  mainCategory: "Visit",
  eventType: "BSP",
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
};

const categoryOptions: MainCategory[] = ["Event", "Meeting", "Visit"];
const statusOptions: EventStatus[] = [
  "Scheduled",
  "Active",
  "Completed",
  "Cancelled",
  "Archived",
];

const eventTypeSuggestions = [
  "BSP",
  "Therapy",
  "Family Meeting",
  "Provider Meeting",
  "Site Tour",
  "Special Event",
  "Party / Celebration",
  "Maintenance",
  "Other",
];

function formatDateAU(dateString?: string | null) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${day}-${month}-${year}`;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      Alert.alert("Check start time", "Please use 24-hour time, for example 10:30.");
      return;
    }

    if (!form.allDay && form.endTime.trim() && !endTime) {
      Alert.alert("Check end time", "Please use 24-hour time, for example 11:30.");
      return;
    }

    const displayFrom = form.displayFromAU.trim()
      ? auDateToDeviceLocalISOString(form.displayFromAU, "00:00")
      : new Date().toISOString();

    const displayUntil = form.displayUntilAU.trim()
      ? auDateToDeviceLocalISOString(form.displayUntilAU, "23:59")
      : auDateToDeviceLocalISOString(form.eventDateAU, "23:59");

    if (!displayFrom || !displayUntil) {
      Alert.alert(
        "Check display dates",
        "Display from/until dates must use DD-MM-YYYY.",
      );
      return;
    }

    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("events_meetings_visits").insert({
      house: HOUSE,
      title,
      main_category: form.mainCategory,
      event_type: form.eventType.trim() || null,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      all_day: form.allDay,
      display_from: displayFrom,
      display_until: displayUntil,
      visitor_name: form.visitorName.trim() || null,
      organisation: form.organisation.trim() || null,
      related_participant: form.relatedParticipant.trim() || null,
      responsible_staff: form.responsibleStaff.trim() || null,
      location: form.location.trim() || null,
      dashboard_visible: form.dashboardVisible,
      auto_archive: form.autoArchive,
      status: form.status,
      notes: form.notes.trim() || null,
      created_by: userData.user?.id || null,
    });

    setSaving(false);

    if (error) {
      console.error("Error saving event, meeting or visit:", error);
      Alert.alert("Save failed", "The item could not be saved.");
      return;
    }

    setForm(blankForm);
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

          <Pressable style={styles.backButton} onPress={() => router.push("/edit")}>
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
                Add centre events, meetings and external visits for dashboard visibility.
              </Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Add New Item</Text>

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
            <TextInput
              value={form.eventType}
              onChangeText={(value) => updateForm("eventType", value)}
              placeholder="BSP, Therapy, Family Meeting, Jersey Day..."
              style={styles.input}
            />
            <View style={styles.suggestionRow}>
              {eventTypeSuggestions.map((type) => (
                <Pressable
                  key={type}
                  style={styles.suggestionChip}
                  onPress={() => updateForm("eventType", type)}
                >
                  <Text style={styles.suggestionChipText}>{type}</Text>
                </Pressable>
              ))}
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
                  onChangeText={(value) => updateForm("responsibleStaff", value)}
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
                <Text style={styles.saveButtonText}>Save Item</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.panel}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.panelTitle}>Current Items</Text>
              <Pressable style={styles.refreshButton} onPress={() => void fetchItems()}>
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

            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

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
  onArchive,
  onComplete,
  onDelete,
}: {
  item: EventsMeetingsVisitsRecord;
  compact?: boolean;
  onArchive: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.eventCard, compact && styles.eventCardMuted]}>
      <View style={styles.eventCardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.relativeLabel}>{getRelativeLabel(item.event_date)}</Text>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventMeta}>
            {item.main_category}
            {item.event_type ? ` · ${item.event_type}` : ""}
          </Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{formatDateAU(item.event_date)}</Text>
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
          <Text style={styles.eventLine}>Organisation: {item.organisation}</Text>
        ) : null}
        {item.location ? (
          <Text style={styles.eventLine}>Location: {item.location}</Text>
        ) : null}
        <Text style={styles.eventLine}>Status: {item.status}</Text>
        <Text style={styles.eventLine}>
          Dashboard: {item.dashboard_visible ? "Visible" : "Hidden"}
        </Text>
      </View>

      {!compact && item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}

      <View style={styles.cardActionRow}>
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
