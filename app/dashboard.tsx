import React, { useEffect, useMemo, useState } from "react";
import {
View,
Text,
Image,
StyleSheet,
ScrollView,
Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { initScheduleForToday, useSchedule } from "@/hooks/schedule-store";
import {
chores as STATIC_CHORES,
checklistItems as STATIC_CHECKLIST_ITEMS,
TIME_SLOTS,
} from "@/constants/data";

// Dashboard reminder tabs added: Incident Reports, Behaviour Observations, Participant Communication Forms, Phone Usage.
type ID = string;
type DashboardPage =
| "team"
| "floating"
| "outings"
| "cleaning"
| "checklist"
| "dropoffs"
| "incidentReports"
| "behaviourObservations"
| "communicationForms"
| "phoneUsage";
type RoomKey = "frontRoom" | "scotty" | "twins";
type ReminderPage =
| "incidentReports"
| "behaviourObservations"
| "communicationForms"
| "phoneUsage";

const NoChainsRoundLogo = require("@/assets/images/nochains-round.png");

const HOUSE_ID = "B2";
const ROTATE_MS = 15_000;
const MAX_WIDTH = 1180;
const ROOM_KEYS: RoomKey[] = ["frontRoom", "scotty", "twins"];

const ROOM_LABELS: Record<RoomKey, string> = {
frontRoom: "Front Room",
scotty: "Scotty",
twins: "Twins / FSO",
};

const REMINDER_CONTENT: Record<
ReminderPage,
{
eyebrow: string;
title: string;
icon: string;
lead: string;
points: string[];
footer: string;
}
> = {
incidentReports: {
eyebrow: "Staff reminder",
title: "Incident Reports",
icon: "clipboard-alert-outline",
lead:
"Incident reports must be completed as soon as the incident is over and everyone is safe.",
points: [
"Harm or risk of harm to the participant",
"Harm or risk of harm to another participant",
"Harm or risk of harm to staff",
"Damage to property",
],
footer: "Do not leave incident reports until the end of the day.",
},
behaviourObservations: {
eyebrow: "Staff reminder",
title: "Behaviour Observations",
icon: "account-alert-outline",
lead:
"Behaviour observations should be recorded as soon as possible after the behaviour occurs.",
points: [
"Participants are rude or not cooperative",
"Participants display outbursts",
"Obnoxious or disruptive behaviour is observed",
"Disrespect is shown toward other participants",
"Disrespect is shown toward staff",
],
footer: "Fresh notes are more accurate and more useful.",
},
communicationForms: {
eyebrow: "End of shift reminder",
title: "Participant Communication Forms",
icon: "file-document-edit-outline",
lead:
"Participant Communication Forms must be submitted at the end of each shift.",
points: [
"Forms help keep communication clear between staff, families, support coordinators, and management",
"End of shift submission is the expectation",
"If forms cannot be submitted by the end of shift, they must be submitted no later than 10:00pm on the same day",
],
footer: "End of shift is the expectation. 10:00pm is the final deadline.",
},
phoneUsage: {
eyebrow: "Staff reminder",
title: "Phone Usage While on Shift",
icon: "cellphone-off",
lead:
"Personal phone use is not allowed while on shift unless it is directly related to participant support or required work duties.",
points: [
"Phones may be used to log required forms",
"Phones may be used to take appropriate photos of participants during activities",
"Phones may be used while supporting participants on outings",
"Phones may be used to post required updates to the WhatsApp group",
"The main responsibility is to interact with participants and spend meaningful time with them",
],
footer: "Phones should support the shift — not distract from participant engagement.",
},
};

function isReminderPage(page: DashboardPage): page is ReminderPage {
return page === "incidentReports" ||
page === "behaviourObservations" ||
page === "communicationForms" ||
page === "phoneUsage";
}

function pageLabel(page: DashboardPage): string {
switch (page) {
case "team":
return "Daily Assignments";
case "floating":
return "Floating";
case "outings":
return "Outings";
case "cleaning":
return "Cleaning";
case "checklist":
return "Checklist";
case "dropoffs":
return "Drop Offs";
case "incidentReports":
return "Incident Reports";
case "behaviourObservations":
return "Behaviour Observations";
case "communicationForms":
return "Participant Communication Forms";
case "phoneUsage":
return "Phone Usage";
default:
return "Dashboard";
}
}

function pad2(n: number): string {
return String(n).padStart(2, "0");
}

function formatDateKey(date?: string | null): string {
if (!date) return "";
const parts = String(date).slice(0, 10).split("-");
if (parts.length !== 3) return String(date);
const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
if (Number.isNaN(d.getTime())) return String(date);
return d.toLocaleDateString("en-AU", {
weekday: "long",
day: "numeric",
month: "long",
year: "numeric",
});
}

function parseTimeToMinutes(value?: string | null): number | null {
if (!value) return null;
let raw = String(value).trim().toLowerCase();
if (!raw) return null;

if (raw.includes("-")) raw = raw.split("-")[0].trim();
raw = raw.replace(/\s+/g, "").replace(/\./g, ":");

const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
if (!match) return null;

let hour = Number(match[1]);
const minute = match[2] ? Number(match[2]) : 0;
const suffix = match[3];

if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
if (minute < 0 || minute > 59) return null;

if (suffix === "am") {
if (hour === 12) hour = 0;
} else if (suffix === "pm") {
if (hour !== 12) hour += 12;
} else if (hour <= 6) {
// Match existing app behaviour for bare afternoon times such as 2:00.
hour += 12;
}

if (hour < 0 || hour > 23) return null;
return hour * 60 + minute;
}

function slotWindow(slot: any): { start: number | null; end: number | null } {
if (!slot) return { start: null, end: null };

const display = String(slot.displayTime || slot.display_time || "").trim();
const displayParts = display.includes("-") ? display.split("-") : [];

const start =
parseTimeToMinutes(slot.startTime) ??
parseTimeToMinutes(slot.start_time) ??
parseTimeToMinutes(displayParts[0]);

const end =
parseTimeToMinutes(slot.endTime) ??
parseTimeToMinutes(slot.end_time) ??
parseTimeToMinutes(displayParts[1]);

return { start, end };
}

function nowMinutes(): number {
const d = new Date();
return d.getHours() * 60 + d.getMinutes();
}

function isCurrentSlot(slot: any, tick: number): boolean {
void tick;
const { start, end } = slotWindow(slot);
if (start == null || end == null || end <= start) return false;
const now = nowMinutes();
return now >= start && now < end;
}

function slotLabel(slot: any): string {
const display = slot?.displayTime || slot?.display_time;
if (display) return String(display);
const start = slot?.startTime || slot?.start_time || "";
const end = slot?.endTime || slot?.end_time || "";
return `${start} - ${end}`.trim();
}

function isFsoSlot(slot: any): boolean {
const { start, end } = slotWindow(slot);

// Twins FSO / nappy-change slots: 11:00–11:30 and 1:00–1:30.
if (start === 11 * 60 && end === 11 * 60 + 30) return true;
if (start === 13 * 60 && end === 13 * 60 + 30) return true;

const label = slotLabel(slot).replace(/\s+/g, "").toLowerCase();
return (
label.includes("11:00am-11:30am") ||
label.includes("11:00-11:30") ||
label.includes("1:00pm-1:30pm") ||
label.includes("13:00-13:30")
);
}

function hasOutingContent(outing: any): boolean {
return Boolean(
String(outing?.name || "").trim() ||
String(outing?.startTime || "").trim() ||
String(outing?.endTime || "").trim() ||
String(outing?.notes || "").trim() ||
(outing?.staffIds?.length ?? 0) > 0 ||
(outing?.participantIds?.length ?? 0) > 0,
);
}

function namesFromIds(
ids: any[] | undefined,
peopleById: Map<string, any>,
): string[] {
return (ids || [])
.map((id) => peopleById.get(String(id))?.name || String(id))
.filter(Boolean);
}

function shortNames(names: string[]): string {
return names.length ? names.join(", ") : "—";
}

function timeNowLabel(tick: number): string {
void tick;
return new Date().toLocaleTimeString("en-AU", {
hour: "numeric",
minute: "2-digit",
});
}

export default function DashboardScreen() {
const [pageIndex, setPageIndex] = useState(0);
const [tick, setTick] = useState(0);

const {
date,
staff = [],
participants = [],
workingStaff = [],
timeSlots = [],
chores = [],
checklistItems = [],
assignments = {},
floatingAssignments = {},
cleaningAssignments = {},
finalChecklist = {},
finalChecklistStaff = null,
dropoffAssignments = {},
dropoffLocations = {},
outingGroups = [],
outingGroup = null,
} = useSchedule() as any;

useEffect(() => {
let cancelled = false;

async function initialiseDashboard() {
try {
await initScheduleForToday(HOUSE_ID);

// initScheduleForToday can merge the saved snapshot over the store.
// Re-load master data afterwards so dashboard-only pages still have
// chores, checklist items, and Supabase time slots available.
if (!cancelled) {
await useSchedule.getState().loadMasterData();
}
} catch (error) {
console.error("[dashboard] failed to initialise schedule", error);
}
}

void initialiseDashboard();

return () => {
cancelled = true;
};
}, []);

useEffect(() => {
const timer = setInterval(() => setTick((value) => value + 1), 30_000);
return () => clearInterval(timer);
}, []);

const staffById = useMemo(
() =>
new Map((staff || []).map((person: any) => [String(person.id), person])),
[staff],
);

const participantsById = useMemo(
() =>
new Map(
(participants || []).map((person: any) => [String(person.id), person]),
),
[participants],
);

const activeOutings = useMemo(() => {
const groups = Array.isArray(outingGroups)
? outingGroups
: outingGroup
? [outingGroup]
: [];
return groups.slice(0, 2).filter(hasOutingContent);
}, [outingGroups, outingGroup]);

const outing1StaffIds = useMemo(
() =>
new Set<string>(
((activeOutings[0]?.staffIds ?? []) as any[]).map(String),
),
[activeOutings],
);

const outing2StaffIds = useMemo(
() =>
new Set<string>(
((activeOutings[1]?.staffIds ?? []) as any[]).map(String),
),
[activeOutings],
);

const outing1ParticipantIds = useMemo(
() =>
new Set<string>(
((activeOutings[0]?.participantIds ?? []) as any[]).map(String),
),
[activeOutings],
);

const outing2ParticipantIds = useMemo(
() =>
new Set<string>(
((activeOutings[1]?.participantIds ?? []) as any[]).map(String),
),
[activeOutings],
);

const getParticipantTheme = (participantId: string) => {
if (outing1ParticipantIds.has(participantId)) return "outing1" as const;
if (outing2ParticipantIds.has(participantId)) return "outing2" as const;
return "onsite" as const;
};

const getAssignmentTheme = (staffId: string, participantIds: string[]) => {
// Direct staff outing membership wins first. This keeps the dashboard aligned
// with the Edit Hub outing banners when staff have been explicitly placed on
// Outing 1 or Outing 2.
if (outing1StaffIds.has(staffId)) return "outing1" as const;
if (outing2StaffIds.has(staffId)) return "outing2" as const;

// If staff were not directly placed on an outing, infer the tile colour from
// their assigned participants. This covers the common operational case where
// the assigned staff member follows their participant onto the outing.
if (participantIds.some((id) => outing1ParticipantIds.has(id))) {
return "outing1" as const;
}
if (participantIds.some((id) => outing2ParticipantIds.has(id))) {
return "outing2" as const;
}
return "onsite" as const;
};

const teamAssignmentRows = useMemo(() => {
const byStaff = new Map<string, string[]>();

Object.entries(assignments || {}).forEach(
([rawParticipantId, rawStaffId]) => {
if (Array.isArray(rawStaffId)) {
// Compatibility with older/reverse shapes: staffId -> participantIds[].
const staffId = String(rawParticipantId);
if (!staffById.has(staffId)) return;
rawStaffId.forEach((pid) => {
const participantId = String(pid);
if (!participantsById.has(participantId)) return;
const list = byStaff.get(staffId) || [];
if (!list.includes(participantId)) list.push(participantId);
byStaff.set(staffId, list);
});
return;
}

if (!rawStaffId) return;
const participantId = String(rawParticipantId);
const staffId = String(rawStaffId);
if (!staffById.has(staffId) || !participantsById.has(participantId))
return;

const list = byStaff.get(staffId) || [];
if (!list.includes(participantId)) list.push(participantId);
byStaff.set(staffId, list);
},
);

const workingSet = new Set((workingStaff || []).map(String));

return Array.from(byStaff.entries())
.map(([staffId, participantIds]) => {
const staffPerson = staffById.get(staffId);
const staffName = String(staffPerson?.name || staffId);
const filteredParticipantIds = participantIds.filter((id) => {
const name = String(participantsById.get(id)?.name || id)
.trim()
.toLowerCase();
return name !== "zara" && name !== "zoya";
});
const participantItems = filteredParticipantIds
.map((id) => ({
id,
name: String(participantsById.get(id)?.name || id),
theme: getParticipantTheme(id),
}))
.sort((a, b) => a.name.localeCompare(b.name, "en-AU"));

return {
staffId,
staffName,
participantIds: filteredParticipantIds,
participantNames: participantItems.map((item) => item.name),
participantItems,
theme: getAssignmentTheme(staffId, filteredParticipantIds),
isWorking: workingSet.size === 0 || workingSet.has(staffId),
};
})
.filter((row) => row.isWorking)
.filter((row) => row.staffName.trim().toLowerCase() !== "everyone")
.filter((row) => row.participantNames.length > 0)
.sort((a, b) => a.staffName.localeCompare(b.staffName, "en-AU"));
}, [
assignments,
staffById,
participantsById,
workingStaff,
outing1StaffIds,
outing2StaffIds,
outing1ParticipantIds,
outing2ParticipantIds,
]);

const dropoffRows = useMemo(() => {
const byStaff = new Map<
string,
{ participantName: string; locationLabel: string }[]
>();

Object.entries(dropoffAssignments || {}).forEach(
([participantIdRaw, assignmentRaw]) => {
if (!assignmentRaw) return;
const participantId = String(participantIdRaw);
const assignment: any = assignmentRaw;
const staffId =
typeof assignment === "string" ? assignment : assignment.staffId;
const locationId =
typeof assignment === "object"
? assignment.locationId
: dropoffLocations?.[participantId];
if (!staffId || !staffById.has(String(staffId))) return;

const participantName = String(
participantsById.get(participantId)?.name || participantId,
);
const locationLabel =
locationId === null || locationId === undefined || locationId === ""
? ""
: `Location ${locationId}`;

const list = byStaff.get(String(staffId)) || [];
list.push({ participantName, locationLabel });
byStaff.set(String(staffId), list);
},
);

return Array.from(byStaff.entries())
.map(([staffId, items]) => {
const staffName = String(staffById.get(staffId)?.name || staffId);
const participantIds = items.map((item) => {
const found = Array.from(participantsById.entries()).find(
([, p]) => String(p?.name || "") === item.participantName,
);
return found?.[0] || "";
});
return {
staffId,
staffName,
items: items.sort((a, b) =>
a.participantName.localeCompare(b.participantName, "en-AU"),
),
theme: getAssignmentTheme(staffId, participantIds.filter(Boolean)),
};
})
.filter((row) => row.staffName.trim().toLowerCase() !== "everyone")
.sort((a, b) => a.staffName.localeCompare(b.staffName, "en-AU"));
}, [
dropoffAssignments,
dropoffLocations,
staffById,
participantsById,
getAssignmentTheme,
]);

const displayTimeSlots =
(timeSlots && timeSlots.length ? timeSlots : TIME_SLOTS) || [];
const displayChores =
(chores && chores.length ? chores : STATIC_CHORES) || [];
const displayChecklistItems =
(checklistItems && checklistItems.length
? checklistItems
: STATIC_CHECKLIST_ITEMS) || [];

const cleaningRows = useMemo(() => {
return (displayChores || [])
.slice()
.sort((a: any, b: any) =>
String(a.name).localeCompare(String(b.name), "en-AU"),
)
.map((chore: any) => {
const staffId = cleaningAssignments?.[String(chore.id)];
const assigned = staffId
? staffById.get(String(staffId))?.name || "Assigned"
: "Not assigned";
return {
id: String(chore.id),
chore: chore.name || chore.label || String(chore.id),
assigned,
complete: Boolean(staffId),
};
});
}, [displayChores, cleaningAssignments, staffById]);

const checklistRows = useMemo(() => {
return (displayChecklistItems || []).map((item: any) => {
const id = String(item.id);
return {
id,
label: item.name || item.label || id,
checked: Boolean(finalChecklist?.[id]),
};
});
}, [displayChecklistItems, finalChecklist]);

const completedChecklist = checklistRows.filter(
(item) => item.checked,
).length;
const selectedFinalStaff = finalChecklistStaff
? staffById.get(String(finalChecklistStaff))?.name || "Selected"
: "Not selected";

const hasCleaningAssignments = cleaningRows.some((row) => row.complete);
const hasChecklistData =
Boolean(finalChecklistStaff) || checklistRows.some((row) => row.checked);
const hasDropoffAssignments = dropoffRows.length > 0;

const pages = useMemo<DashboardPage[]>(() => {
const list: DashboardPage[] = ["team", "floating"];
if (activeOutings.length > 0) list.push("outings");
if (hasCleaningAssignments) list.push("cleaning");
if (hasChecklistData) list.push("checklist");
if (hasDropoffAssignments) list.push("dropoffs");
list.push("incidentReports", "behaviourObservations", "communicationForms", "phoneUsage");
return list;
}, [
activeOutings.length,
hasCleaningAssignments,
hasChecklistData,
hasDropoffAssignments,
]);

useEffect(() => {
const timer = setInterval(() => {
setPageIndex((value) => (value + 1) % Math.max(1, pages.length));
}, ROTATE_MS);
return () => clearInterval(timer);
}, [pages.length]);

useEffect(() => {
if (pageIndex >= pages.length) setPageIndex(0);
}, [pageIndex, pages.length]);

const currentPage = pages[pageIndex] || "floating";

const renderPage = () => {
if (currentPage === "team") {
return (
<View style={styles.panel}>
<View style={styles.panelHeaderRow}>
<View>
<Text style={styles.panelEyebrow}>
Today's participant support
</Text>
<Text style={styles.panelTitle}>Team Daily Assignments</Text>
</View>
<View style={styles.legendRow}>
<View style={[styles.legendPill, styles.legendBlue]}>
<Text style={styles.legendText}>Onsite</Text>
</View>
<View style={[styles.legendPill, styles.legendOrange]}>
<Text style={styles.legendTextOrange}>Outing 1</Text>
</View>
<View style={[styles.legendPill, styles.legendPurple]}>
<Text style={styles.legendTextPurple}>Outing 2</Text>
</View>
</View>
</View>

{teamAssignmentRows.length === 0 ? (
<View style={styles.emptyState}>
<MaterialCommunityIcons
name="account-group-outline"
size={44}
color="#9CA3AF"
/>
<Text style={styles.emptyText}>
No team daily assignments saved yet.
</Text>
</View>
) : (
<ScrollView
style={styles.innerScroll}
contentContainerStyle={styles.assignmentGrid}
>
{teamAssignmentRows.map((row) => (
<View
key={row.staffId}
style={[
styles.assignmentCard,
row.theme === "outing1"
? styles.assignmentCardOuting1
: row.theme === "outing2"
? styles.assignmentCardOuting2
: styles.assignmentCardOnsite,
]}
>
<View
style={[
styles.assignmentStaffPill,
row.theme === "outing1"
? styles.assignmentStaffPillOuting1
: row.theme === "outing2"
? styles.assignmentStaffPillOuting2
: styles.assignmentStaffPillOnsite,
]}
>
<Text
style={[
styles.assignmentStaffName,
row.theme === "outing1"
? styles.assignmentStaffNameOuting1
: row.theme === "outing2"
? styles.assignmentStaffNameOuting2
: styles.assignmentStaffNameOnsite,
]}
numberOfLines={1}
>
{row.staffName}
</Text>
</View>

<View style={styles.assignmentParticipantList}>
{row.participantItems.map((participant: any) => (
<View
key={participant.id}
style={[
styles.assignmentParticipantChip,
participant.theme === "outing1"
? styles.assignmentParticipantChipOuting1
: participant.theme === "outing2"
? styles.assignmentParticipantChipOuting2
: styles.assignmentParticipantChipOnsite,
]}
>
<Text
style={[
styles.assignmentParticipantName,
participant.theme === "outing1"
? styles.assignmentParticipantNameOuting1
: participant.theme === "outing2"
? styles.assignmentParticipantNameOuting2
: styles.assignmentParticipantNameOnsite,
]}
numberOfLines={1}
>
{participant.name}
</Text>
</View>
))}
</View>
</View>
))}
</ScrollView>
)}
</View>
);
}

if (currentPage === "floating") {
return (
<View style={styles.panel}>
<View style={styles.panelHeaderRow}>
<View>
<Text style={styles.panelEyebrow}>Current operational view</Text>
<Text style={styles.panelTitle}>Floating Assignments</Text>
</View>
<View style={styles.badge}>
<MaterialCommunityIcons
name="account-clock"
size={18}
color="#059669"
/>
<Text style={styles.badgeText}>Current Slot Highlighted</Text>
</View>
</View>

<View style={styles.floatingTable}>
<View style={[styles.floatRow, styles.floatHeaderRow]}>
<Text
style={[
styles.floatCell,
styles.floatTimeCell,
styles.floatHeaderText,
]}
>
Time
</Text>
{ROOM_KEYS.map((room) => (
<Text
key={room}
style={[styles.floatCell, styles.floatHeaderText]}
>
{ROOM_LABELS[room]}
</Text>
))}
</View>

{(displayTimeSlots || []).map((slot: any, index: number) => {
const slotId = String(slot.id ?? index);
const row = floatingAssignments?.[slotId] || {};
const current = isCurrentSlot(slot, tick);

return (
<View
key={slotId}
style={[
styles.floatRow,
index % 2 === 0 ? styles.rowEven : styles.rowOdd,
current && styles.currentFloatRow,
]}
>
<View style={[styles.floatCellBox, styles.floatTimeCellBox]}>
<Text
style={[
styles.floatTimeText,
current && styles.currentText,
]}
>
{slotLabel(slot)}
</Text>
{current && <Text style={styles.nowLabel}>NOW</Text>}
</View>

{ROOM_KEYS.map((room) => {
const staffId = row?.[room];
const name = staffId
? staffById.get(String(staffId))?.name || "—"
: "—";
const showFso =
room === "twins" && isFsoSlot(slot) && name !== "—";
return (
<View key={room} style={styles.floatCellBox}>
<Text
style={[
styles.floatNameText,
current && styles.currentText,
]}
numberOfLines={1}
>
{name}
{showFso && (
<Text style={styles.fsoText}> (FSO)</Text>
)}
</Text>
</View>
);
})}
</View>
);
})}
</View>
</View>
);
}

if (currentPage === "outings") {
return (
<View style={styles.panel}>
<Text style={styles.panelEyebrow}>Scheduled off-site activity</Text>
<Text style={styles.panelTitle}>Drive / Outings</Text>

{activeOutings.length === 0 ? (
<View style={styles.emptyState}>
<Ionicons name="car-outline" size={42} color="#9CA3AF" />
<Text style={styles.emptyText}>No outings scheduled today.</Text>
</View>
) : (
<View style={styles.outingGrid}>
{activeOutings.map((outing: any, index: number) => {
const isSecond = index === 1;
const staffNames = namesFromIds(outing.staffIds, staffById);
const participantNames = namesFromIds(
outing.participantIds,
participantsById,
);
return (
<View
key={outing.id || `outing-${index}`}
style={[
styles.outingCard,
isSecond
? styles.outingCardPurple
: styles.outingCardOrange,
]}
>
<View style={styles.outingTitleRow}>
<View
style={[
styles.outingIcon,
isSecond
? styles.outingIconPurple
: styles.outingIconOrange,
]}
>
<Ionicons
name="car-outline"
size={26}
color="#FFFFFF"
/>
</View>
<View style={{ flex: 1 }}>
<Text
style={[
styles.outingLabel,
isSecond ? styles.purpleText : styles.orangeText,
]}
>
{isSecond ? "Outing 2" : "Outing 1"}
</Text>
<Text style={styles.outingName}>
{outing.name || "Unnamed outing"}
</Text>
<Text style={styles.outingTime}>
{(outing.startTime || "?") +
" – " +
(outing.endTime || "?")}
</Text>
</View>
</View>

<View style={styles.outingSection}>
<Text style={styles.outingSectionTitle}>Staff</Text>
<Text style={styles.outingSectionText}>
{shortNames(staffNames)}
</Text>
</View>
<View style={styles.outingSection}>
<Text style={styles.outingSectionTitle}>
Participants
</Text>
<Text style={styles.outingSectionText}>
{shortNames(participantNames)}
</Text>
</View>
<View style={styles.outingSection}>
<Text style={styles.outingSectionTitle}>Notes</Text>
<Text style={styles.outingSectionText}>
{String(outing.notes || "").trim() ||
"No notes entered."}
</Text>
</View>
</View>
);
})}
</View>
)}
</View>
);
}

if (currentPage === "cleaning") {
const assignedCount = cleaningRows.filter((row) => row.complete).length;
return (
<View style={styles.panel}>
<View style={styles.panelHeaderRow}>
<View>
<Text style={styles.panelEyebrow}>End of shift</Text>
<Text style={styles.panelTitle}>Cleaning Assignments</Text>
</View>
<Text style={styles.progressText}>
{assignedCount} / {cleaningRows.length} assigned
</Text>
</View>

<ScrollView
style={styles.innerScroll}
contentContainerStyle={styles.cleaningGrid}
>
{cleaningRows.map((row) => (
<View key={row.id} style={styles.cleaningCard}>
<Text style={styles.cleaningTask}>{row.chore}</Text>
<Text
style={
row.complete
? styles.cleaningAssigned
: styles.cleaningUnassigned
}
>
{row.assigned}
</Text>
</View>
))}
</ScrollView>
</View>
);
}

if (currentPage === "dropoffs") {
return (
<View style={styles.panel}>
<View style={styles.panelHeaderRow}>
<View>
<Text style={styles.panelEyebrow}>Transport home</Text>
<Text style={styles.panelTitle}>Drop Offs</Text>
</View>
<Text style={styles.progressText}>
{dropoffRows.length} staff assigned
</Text>
</View>

{dropoffRows.length === 0 ? (
<View style={styles.emptyState}>
<MaterialCommunityIcons
name="bus-clock"
size={44}
color="#9CA3AF"
/>
<Text style={styles.emptyText}>No drop offs assigned yet.</Text>
</View>
) : (
<ScrollView
style={styles.innerScroll}
contentContainerStyle={styles.assignmentGrid}
>
{dropoffRows.map((row) => (
<View
key={row.staffId}
style={[
styles.assignmentCard,
row.theme === "outing1"
? styles.assignmentCardOuting1
: row.theme === "outing2"
? styles.assignmentCardOuting2
: styles.assignmentCardOnsite,
]}
>
<View
style={[
styles.assignmentStaffPill,
row.theme === "outing1"
? styles.assignmentStaffPillOuting1
: row.theme === "outing2"
? styles.assignmentStaffPillOuting2
: styles.assignmentStaffPillOnsite,
]}
>
<Text
style={[
styles.assignmentStaffName,
row.theme === "outing1"
? styles.assignmentStaffNameOuting1
: row.theme === "outing2"
? styles.assignmentStaffNameOuting2
: styles.assignmentStaffNameOnsite,
]}
numberOfLines={1}
>
{row.staffName}
</Text>
</View>
<View style={styles.assignmentParticipantList}>
{row.items.map((item) => {
const label = item.locationLabel
? `${item.participantName} · ${item.locationLabel}`
: item.participantName;
return (
<View
key={`${row.staffId}-${item.participantName}`}
style={[
styles.assignmentParticipantChip,
row.theme === "outing1"
? styles.assignmentParticipantChipOuting1
: row.theme === "outing2"
? styles.assignmentParticipantChipOuting2
: styles.assignmentParticipantChipOnsite,
]}
>
<Text
style={[
styles.assignmentParticipantName,
row.theme === "outing1"
? styles.assignmentParticipantNameOuting1
: row.theme === "outing2"
? styles.assignmentParticipantNameOuting2
: styles.assignmentParticipantNameOnsite,
]}
numberOfLines={1}
>
{label}
</Text>
</View>
);
})}
</View>
</View>
))}
</ScrollView>
)}
</View>
);
}

if (isReminderPage(currentPage)) {
const reminder = REMINDER_CONTENT[currentPage];
return (
<View style={[styles.panel, styles.reminderPanel]}>
<View style={styles.reminderHeaderRow}>
<Image
source={NoChainsRoundLogo}
style={styles.reminderLogo}
resizeMode="contain"
/>
<View style={styles.reminderHeaderText}>
<Text style={styles.panelEyebrow}>{reminder.eyebrow}</Text>
<Text style={styles.panelTitle}>{reminder.title}</Text>
</View>
<View style={styles.reminderIconCircle}>
<MaterialCommunityIcons
name={reminder.icon as any}
size={34}
color="#F54FA5"
/>
</View>
</View>

<ScrollView
style={styles.innerScroll}
contentContainerStyle={styles.reminderBody}
>
<View style={styles.reminderLeadBox}>
<Text style={styles.reminderLeadText}>{reminder.lead}</Text>
</View>

<View style={styles.reminderPointList}>
{reminder.points.map((point) => (
<View key={point} style={styles.reminderPointRow}>
<View style={styles.reminderBullet}>
<Ionicons name="checkmark" size={18} color="#FFFFFF" />
</View>
<Text style={styles.reminderPointText}>{point}</Text>
</View>
))}
</View>

<View style={styles.reminderFooterBanner}>
<MaterialCommunityIcons
name="alert-circle-outline"
size={24}
color="#BE185D"
/>
<Text style={styles.reminderFooterText}>{reminder.footer}</Text>
</View>
</ScrollView>
</View>
);
}

return (
<View style={styles.panel}>
<View style={styles.panelHeaderRow}>
<View style={{ flex: 1 }}>
<Text style={styles.panelEyebrow}>Close of day</Text>
<Text style={styles.panelTitle}>End of Shift Checklist</Text>

<View style={styles.finalStaffLeftBlock}>
<Text style={styles.finalStaffLabel}>Last to leave</Text>
<View style={styles.finalStaffPill}>
<Text style={styles.finalStaffPillText}>
{selectedFinalStaff}
</Text>
</View>
</View>
</View>
<View style={styles.progressBlock}>
<Text style={styles.progressText}>
{completedChecklist} / {checklistRows.length} complete
</Text>
</View>
</View>

<View style={styles.checklistProgressOuter}>
<View
style={[
styles.checklistProgressInner,
{
width: checklistRows.length
? `${Math.round((completedChecklist / checklistRows.length) * 100)}%`
: "0%",
},
]}
/>
</View>

<ScrollView
style={styles.innerScroll}
contentContainerStyle={styles.checklistList}
>
{checklistRows.map((item) => (
<View
key={item.id}
style={[
styles.checklistRow,
item.checked && styles.checklistRowDone,
]}
>
<Ionicons
name={item.checked ? "checkmark-circle" : "ellipse-outline"}
size={28}
color={item.checked ? "#10B981" : "#9CA3AF"}
/>
<Text
style={[
styles.checklistText,
item.checked && styles.checklistTextDone,
]}
>
{item.label}
</Text>
</View>
))}
</ScrollView>
</View>
);
};

return (
<View style={styles.screen}>
<View style={styles.appFrame}>
<View style={styles.topBar}>
<View style={styles.topLeftBlock}>
<Text style={styles.locationText}>No Chains Daily Dashboard</Text>
<Text style={styles.programText}>
Location: {HOUSE_ID} Day Program
</Text>
<Text style={styles.dateText}>{formatDateKey(date)}</Text>
</View>
<View style={styles.clockBlock}>
<Text style={styles.clockText}>{timeNowLabel(tick)}</Text>
<Text style={styles.cycleText}>
(Cycles through tabs every {Math.round(ROTATE_MS / 1000)} seconds)
</Text>
</View>
</View>

<View style={styles.currentPanelBar}>
<View style={styles.currentPanelPill}>
<Text style={styles.currentPanelLabel}>
Now Displaying: <Text style={styles.currentPanelValue}>{pageLabel(currentPage)}</Text>
</Text>
</View>
<Text style={styles.currentPanelCount}>
Panel {pageIndex + 1} of {pages.length}
</Text>
</View>

<View style={styles.contentArea}>{renderPage()}</View>
</View>
</View>
);
}

const styles = StyleSheet.create({
screen: {
flex: 1,
backgroundColor: "#111827",
alignItems: "center",
justifyContent: "center",
},
appFrame: {
width: "100%",
maxWidth: MAX_WIDTH,
height: Platform.OS === "web" ? 780 : "100%",
backgroundColor: "#F8FAFC",
borderRadius: Platform.OS === "web" ? 22 : 0,
overflow: "hidden",
},
topBar: {
height: 126,
paddingHorizontal: 28,
paddingVertical: 18,
backgroundColor: "#F54FA5",
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
},
topLeftBlock: {
flex: 1,
paddingRight: 18,
},
locationText: {
color: "#FFFFFF",
fontSize: 25,
fontWeight: "900",
},
programText: {
marginTop: 4,
color: "#FFE4F4",
fontSize: 15,
fontWeight: "800",
},
dateText: {
    marginTop: 2,
    marginTop: 4,
color: "#FFE4F4",
    fontSize: 14,
    fontWeight: "700",
    fontSize: 16,
    fontWeight: "800",
},
cycleText: {
marginTop: 3,
color: "#FFE4F4",
fontSize: 12,
fontWeight: "700",
},
clockBlock: {
alignItems: "flex-end",
},
clockText: {
color: "#FFFFFF",
fontSize: 30,
fontWeight: "900",
},
currentPanelBar: {
height: 52,
backgroundColor: "#FFFFFF",
borderBottomWidth: 1,
borderBottomColor: "#E5E7EB",
paddingHorizontal: 24,
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
},
currentPanelPill: {
paddingHorizontal: 18,
paddingVertical: 8,
borderRadius: 999,
backgroundColor: "#111827",
},
currentPanelLabel: {
fontSize: 13,
fontWeight: "800",
color: "#FFFFFF",
},
currentPanelValue: {
fontWeight: "900",
color: "#FFFFFF",
},
currentPanelCount: {
fontSize: 12,
fontWeight: "800",
color: "#6B7280",
},
contentArea: {
flex: 1,
padding: 20,
},
panel: {
flex: 1,
backgroundColor: "#FFFFFF",
borderRadius: 22,
padding: 20,
shadowColor: "#000",
shadowOpacity: 0.06,
shadowRadius: 10,
shadowOffset: { width: 0, height: 4 },
},
panelHeaderRow: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "flex-start",
gap: 16,
marginBottom: 14,
},
panelEyebrow: {
color: "#6B7280",
fontSize: 13,
fontWeight: "800",
textTransform: "uppercase",
letterSpacing: 0.7,
},
panelTitle: {
marginTop: 2,
fontSize: 30,
fontWeight: "900",
color: "#111827",
},
badge: {
flexDirection: "row",
alignItems: "center",
gap: 8,
backgroundColor: "#DCFCE7",
borderColor: "#DDD6FE",
borderWidth: 1,
borderRadius: 999,
paddingHorizontal: 14,
paddingVertical: 8,
},
badgeText: {
color: "#059669",
fontWeight: "800",
fontSize: 12,
},
legendRow: {
flexDirection: "row",
alignItems: "center",
gap: 8,
flexWrap: "wrap",
justifyContent: "flex-end",
},
legendPill: {
borderRadius: 999,
borderWidth: 1,
paddingHorizontal: 12,
paddingVertical: 7,
},
legendBlue: {
backgroundColor: "#FFFFFF",
borderColor: "#D1D5DB",
},
legendOrange: {
backgroundColor: "#FFF7ED",
borderColor: "#FB923C",
},
legendPurple: {
backgroundColor: "#F5F3FF",
borderColor: "#8B5CF6",
},
legendText: {
color: "#4B5563",
fontSize: 12,
fontWeight: "900",
},
legendTextOrange: {
color: "#C2410C",
fontSize: 12,
fontWeight: "900",
},
legendTextPurple: {
color: "#6D28D9",
fontSize: 12,
fontWeight: "900",
},
assignmentGrid: {
flexDirection: "row",
flexWrap: "wrap",
gap: 10,
paddingBottom: 8,
},
assignmentCard: {
width: "31.9%",
minHeight: 78,
borderRadius: 18,
borderWidth: 2,
paddingHorizontal: 10,
paddingVertical: 8,
justifyContent: "flex-start",
},
assignmentCardOnsite: {
backgroundColor: "#FFFFFF",
borderColor: "#E5E7EB",
},
assignmentCardOuting1: {
backgroundColor: "#FFF7ED",
borderColor: "#FB923C",
},
assignmentCardOuting2: {
backgroundColor: "#F5F3FF",
borderColor: "#8B5CF6",
},
assignmentStaffPill: {
alignSelf: "flex-start",
borderRadius: 999,
borderWidth: 1.5,
paddingHorizontal: 10,
paddingVertical: 5,
maxWidth: "100%",
},
assignmentStaffPillOnsite: {
backgroundColor: "#F54FA5",
borderColor: "#F54FA5",
},
assignmentStaffPillOuting1: {
backgroundColor: "#FFEDD5",
borderColor: "#FB923C",
},
assignmentStaffPillOuting2: {
backgroundColor: "#EDE9FE",
borderColor: "#8B5CF6",
},
assignmentStaffName: {
fontSize: 18,
lineHeight: 22,
fontWeight: "900",
},
assignmentStaffNameOnsite: {
color: "#FFFFFF",
},
assignmentStaffNameOuting1: {
color: "#C2410C",
},
assignmentStaffNameOuting2: {
color: "#6D28D9",
},
assignmentParticipantList: {
marginTop: 7,
flexDirection: "row",
flexWrap: "wrap",
gap: 6,
},
assignmentParticipantChip: {
borderRadius: 999,
borderWidth: 1.5,
paddingHorizontal: 9,
paddingVertical: 4,
maxWidth: "100%",
},
assignmentParticipantChipOnsite: {
backgroundColor: "#6F82F6",
borderColor: "#5868E8",
},
assignmentParticipantChipOuting1: {
backgroundColor: "#FFEDD5",
borderColor: "#FB923C",
},
assignmentParticipantChipOuting2: {
backgroundColor: "#EDE9FE",
borderColor: "#8B5CF6",
},
assignmentParticipantName: {
fontSize: 13,
lineHeight: 16,
fontWeight: "900",
},
assignmentParticipantNameOnsite: {
color: "#FFFFFF",
},
assignmentParticipantNameOuting1: {
color: "#C2410C",
},
assignmentParticipantNameOuting2: {
color: "#6D28D9",
},
floatingTable: {
flex: 1,
borderWidth: 1,
borderColor: "#E5E7EB",
borderRadius: 16,
overflow: "hidden",
},
floatRow: {
flexDirection: "row",
minHeight: 42,
borderBottomWidth: 1,
borderBottomColor: "#E5E7EB",
},
floatHeaderRow: {
minHeight: 38,
backgroundColor: "#EEF2FF",
},
rowEven: {
backgroundColor: "#FFFFFF",
},
rowOdd: {
backgroundColor: "#F9FAFB",
},
currentFloatRow: {
backgroundColor: "#DCFCE7",
borderLeftWidth: 8,
borderLeftColor: "#10B981",
},
floatCell: {
flex: 1,
paddingHorizontal: 10,
paddingVertical: 10,
},
floatHeaderText: {
fontSize: 13,
color: "#111827",
fontWeight: "900",
},
floatTimeCell: {
flex: 1.05,
},
floatCellBox: {
flex: 1,
justifyContent: "center",
paddingHorizontal: 10,
borderRightWidth: 1,
borderRightColor: "#E5E7EB",
},
floatTimeCellBox: {
flex: 1.05,
},
floatTimeText: {
fontSize: 14,
fontWeight: "800",
color: "#111827",
},
floatNameText: {
fontSize: 16,
fontWeight: "800",
color: "#1F2937",
},
fsoText: {
color: "#F54FA5",
fontWeight: "900",
},
currentText: {
color: "#065F46",
},
nowLabel: {
marginTop: 2,
fontSize: 10,
color: "#059669",
fontWeight: "900",
},
outingGrid: {
flex: 1,
flexDirection: "row",
gap: 16,
marginTop: 12,
},
outingCard: {
flex: 1,
borderRadius: 22,
borderWidth: 2,
padding: 20,
},
outingCardOrange: {
backgroundColor: "#FFF7ED",
borderColor: "#FB923C",
},
outingCardPurple: {
backgroundColor: "#F5F3FF",
borderColor: "#8B5CF6",
},
outingTitleRow: {
flexDirection: "row",
alignItems: "center",
gap: 14,
marginBottom: 16,
},
outingIcon: {
width: 52,
height: 52,
borderRadius: 999,
alignItems: "center",
justifyContent: "center",
},
outingIconOrange: {
backgroundColor: "#F97316",
},
outingIconPurple: {
backgroundColor: "#7C3AED",
},
outingLabel: {
fontSize: 13,
fontWeight: "900",
textTransform: "uppercase",
letterSpacing: 0.7,
},
orangeText: {
color: "#C2410C",
},
purpleText: {
color: "#6D28D9",
},
outingName: {
fontSize: 28,
fontWeight: "900",
color: "#111827",
},
outingTime: {
fontSize: 16,
color: "#4B5563",
fontWeight: "800",
},
outingSection: {
marginTop: 14,
},
outingSectionTitle: {
fontSize: 13,
fontWeight: "900",
color: "#374151",
textTransform: "uppercase",
letterSpacing: 0.5,
marginBottom: 4,
},
outingSectionText: {
fontSize: 18,
lineHeight: 25,
fontWeight: "700",
color: "#111827",
},
emptyState: {
flex: 1,
alignItems: "center",
justifyContent: "center",
},
emptyText: {
marginTop: 10,
color: "#6B7280",
fontSize: 18,
fontWeight: "700",
},
innerScroll: {
flex: 1,
},
cleaningGrid: {
flexDirection: "row",
flexWrap: "wrap",
gap: 10,
paddingBottom: 8,
},
cleaningCard: {
width: "31.8%",
minHeight: 86,
borderRadius: 16,
borderWidth: 1,
borderColor: "#E5E7EB",
backgroundColor: "#F9FAFB",
padding: 12,
},
cleaningTask: {
fontSize: 15,
fontWeight: "900",
color: "#111827",
},
cleaningAssigned: {
marginTop: 8,
fontSize: 18,
fontWeight: "900",
color: "#F54FA5",
},
cleaningUnassigned: {
marginTop: 8,
fontSize: 15,
fontWeight: "700",
color: "#9CA3AF",
},
progressBlock: {
alignItems: "flex-end",
},
progressText: {
fontSize: 16,
fontWeight: "900",
color: "#111827",
},
finalStaffLeftBlock: {
marginTop: 12,
alignItems: "flex-start",
},
finalStaffLabel: {
fontSize: 13,
fontWeight: "900",
color: "#374151",
textTransform: "uppercase",
letterSpacing: 0.5,
marginBottom: 6,
},
finalStaffPill: {
borderWidth: 1,
borderColor: "#F54FA5",
backgroundColor: "#FDF2FB",
borderRadius: 999,
paddingHorizontal: 14,
paddingVertical: 7,
},
finalStaffPillText: {
color: "#F54FA5",
fontSize: 18,
fontWeight: "900",
},
checklistProgressOuter: {
height: 16,
borderRadius: 999,
backgroundColor: "#E5E7EB",
overflow: "hidden",
marginBottom: 16,
},
checklistProgressInner: {
height: "100%",
backgroundColor: "#10B981",
},
checklistList: {
gap: 9,
paddingBottom: 8,
},
checklistRow: {
minHeight: 50,
borderRadius: 14,
borderWidth: 1,
borderColor: "#E5E7EB",
backgroundColor: "#F9FAFB",
paddingHorizontal: 14,
flexDirection: "row",
alignItems: "center",
gap: 12,
},
checklistRowDone: {
backgroundColor: "#ECFDF3",
borderColor: "#A7F3D0",
},
checklistText: {
fontSize: 17,
fontWeight: "800",
color: "#111827",
},
checklistTextDone: {
color: "#065F46",
},
reminderPanel: {
padding: 24,
},
reminderHeaderRow: {
flexDirection: "row",
alignItems: "center",
gap: 16,
marginBottom: 16,
},
reminderLogo: {
width: 76,
height: 76,
borderRadius: 999,
},
reminderHeaderText: {
flex: 1,
},
reminderIconCircle: {
width: 64,
height: 64,
borderRadius: 999,
backgroundColor: "#FDF2FB",
borderWidth: 1,
borderColor: "#F9A8D4",
alignItems: "center",
justifyContent: "center",
},
reminderBody: {
gap: 14,
paddingBottom: 8,
},
reminderLeadBox: {
borderRadius: 18,
backgroundColor: "#FDF2FB",
borderWidth: 1,
borderColor: "#F9A8D4",
paddingHorizontal: 18,
paddingVertical: 16,
},
reminderLeadText: {
fontSize: 21,
lineHeight: 29,
fontWeight: "900",
color: "#111827",
},
reminderPointList: {
gap: 10,
},
reminderPointRow: {
minHeight: 56,
borderRadius: 16,
borderWidth: 1,
borderColor: "#E5E7EB",
backgroundColor: "#FFFFFF",
paddingHorizontal: 14,
flexDirection: "row",
alignItems: "center",
gap: 12,
},
reminderBullet: {
width: 30,
height: 30,
borderRadius: 999,
backgroundColor: "#F54FA5",
alignItems: "center",
justifyContent: "center",
},
reminderPointText: {
flex: 1,
fontSize: 18,
lineHeight: 24,
fontWeight: "800",
color: "#111827",
},
reminderFooterBanner: {
marginTop: 4,
borderRadius: 18,
backgroundColor: "#FCE7F3",
borderWidth: 1,
borderColor: "#F9A8D4",
paddingHorizontal: 16,
paddingVertical: 14,
flexDirection: "row",
alignItems: "center",
gap: 10,
},
reminderFooterText: {
flex: 1,
fontSize: 18,
lineHeight: 24,
fontWeight: "900",
color: "#BE185D",
},
});