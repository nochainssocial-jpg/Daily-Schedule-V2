import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { initScheduleForToday, refreshScheduleFromSupabase, useSchedule } from "@/hooks/schedule-store";
import {
  chores as STATIC_CHORES,
  checklistItems as STATIC_CHECKLIST_ITEMS,
  TIME_SLOTS,
} from "@/constants/data";

import { ChecklistPanel } from "@/components/dashboard/ChecklistPanel";
import { CleaningPanel } from "@/components/dashboard/CleaningPanel";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { DropoffsPanel } from "@/components/dashboard/DropoffsPanel";
import { EventsMeetingsVisitsPanel } from "@/components/dashboard/EventsMeetingsVisitsPanel";
import { FloatingAssignmentsPanel } from "@/components/dashboard/FloatingAssignmentsPanel";
import { OutingsPanel } from "@/components/dashboard/OutingsPanel";
import { ReminderPanel } from "@/components/dashboard/ReminderPanel";
import { TeamAssignmentsPanel } from "@/components/dashboard/TeamAssignmentsPanel";
import type { DashboardPage, EventMeetingVisitRecord } from "@/components/dashboard/dashboardTypes";
import {
  DASHBOARD_PAGE_THEMES,
  DASHBOARD_REFRESH_MS,
  HOUSE_ID,
  ROTATE_MS,
  STAFF_OTHER_COLOR,
  isReminderPage,
} from "@/components/dashboard/dashboardTheme";
import {
  colorForStaff,
  hasOutingContent,
  isEventDashboardVisible,
  sortEventsMeetingsVisits,
  todayISODate,
} from "@/components/dashboard/dashboardUtils";

// Dashboard reminder tabs added: Incident Reports, Behaviour Observations, Participant Communication Forms.

export default function DashboardScreen() {
const [pageIndex, setPageIndex] = useState(0);
const [tick, setTick] = useState(0);
const [lastDashboardRefresh, setLastDashboardRefresh] = useState<Date | null>(null);
const [eventsMeetingsVisits, setEventsMeetingsVisits] = useState<EventMeetingVisitRecord[]>([]);

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

const fetchEventsMeetingsVisits = async () => {
try {
const { data, error } = await supabase
.from("events_meetings_visits")
.select("*")
.eq("house", HOUSE_ID)
.eq("dashboard_visible", true)
.order("event_date", { ascending: true })
.order("start_time", { ascending: true });

if (error) {
console.error("[dashboard] failed to load events, meetings and visits", error);
return;
}

setEventsMeetingsVisits((data || []) as EventMeetingVisitRecord[]);
} catch (error) {
console.error("[dashboard] failed to load events, meetings and visits", error);
}
};

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
await fetchEventsMeetingsVisits();
setLastDashboardRefresh(new Date());
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

useEffect(() => {
let cancelled = false;

const refreshDashboard = async () => {
try {
await refreshScheduleFromSupabase(HOUSE_ID);
await fetchEventsMeetingsVisits();
if (!cancelled) setLastDashboardRefresh(new Date());
} catch (error) {
console.error("[dashboard] failed to refresh schedule", error);
}
};

const timer = setInterval(() => {
void refreshDashboard();
}, DASHBOARD_REFRESH_MS);

return () => {
cancelled = true;
clearInterval(timer);
};
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
const staffColor = colorForStaff(staffPerson);
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
staffColor,
staffTextColor: "#FFFFFF",
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
const staffPerson = staffById.get(staffId);
const staffName = String(staffPerson?.name || staffId);
const staffColor = colorForStaff(staffPerson);
const participantIds = items.map((item) => {
const found = Array.from(participantsById.entries()).find(
([, p]) => String(p?.name || "") === item.participantName,
);
return found?.[0] || "";
});
return {
staffId,
staffName,
staffColor,
staffTextColor: "#FFFFFF",
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
const staffPerson = staffId ? staffById.get(String(staffId)) : null;
const staffColor = staffPerson ? colorForStaff(staffPerson) : STAFF_OTHER_COLOR;
const assigned = staffId
? staffPerson?.name || "Assigned"
: "Not assigned";
return {
id: String(chore.id),
chore: chore.name || chore.label || String(chore.id),
assigned,
staffColor,
staffTextColor: "#FFFFFF",
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
const selectedFinalStaffPerson = finalChecklistStaff
? staffById.get(String(finalChecklistStaff))
: null;
const selectedFinalStaff = finalChecklistStaff
? selectedFinalStaffPerson?.name || "Selected"
: "Not selected";
const selectedFinalStaffColor = selectedFinalStaffPerson
? colorForStaff(selectedFinalStaffPerson)
: "#E5E7EB";
const selectedFinalStaffTextColor = selectedFinalStaffPerson
? "#FFFFFF"
: "#6B7280";

const hasCleaningAssignments = cleaningRows.some((row) => row.complete);
const hasChecklistData =
Boolean(finalChecklistStaff) || checklistRows.some((row) => row.checked);
const hasDropoffAssignments = dropoffRows.length > 0;

const visibleEventsMeetingsVisits = useMemo(() => {
return (eventsMeetingsVisits || [])
.filter((item) => isEventDashboardVisible(item, tick))
.sort(sortEventsMeetingsVisits);
}, [eventsMeetingsVisits, tick]);

const todayEventsMeetingsVisits = useMemo(() => {
const today = todayISODate();
return visibleEventsMeetingsVisits.filter(
(item) => String(item.event_date).slice(0, 10) === today,
);
}, [visibleEventsMeetingsVisits]);

const upcomingEventsMeetingsVisits = useMemo(() => {
const today = todayISODate();
return visibleEventsMeetingsVisits
.filter((item) => String(item.event_date).slice(0, 10) > today)
.slice(0, 6);
}, [visibleEventsMeetingsVisits]);

const hasEventsMeetingsVisits = visibleEventsMeetingsVisits.length > 0;

const pages = useMemo<DashboardPage[]>(() => {
const list: DashboardPage[] = ["team", "floating"];
if (activeOutings.length > 0) list.push("outings");
if (hasEventsMeetingsVisits) list.push("eventsMeetingsVisits");
if (hasCleaningAssignments) list.push("cleaning");
if (hasChecklistData) list.push("checklist");
if (hasDropoffAssignments) list.push("dropoffs");
list.push("incidentReports", "behaviourObservations", "communicationForms");
return list;
}, [
activeOutings.length,
hasCleaningAssignments,
hasChecklistData,
hasDropoffAssignments,
hasEventsMeetingsVisits,
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
const pageTheme = DASHBOARD_PAGE_THEMES[currentPage] || DASHBOARD_PAGE_THEMES.team;

const renderCurrentPanel = () => {
if (currentPage === "team") {
return <TeamAssignmentsPanel teamAssignmentRows={teamAssignmentRows} />;
}

if (currentPage === "floating") {
return (
<FloatingAssignmentsPanel
  displayTimeSlots={displayTimeSlots}
  floatingAssignments={floatingAssignments}
  staffById={staffById}
  tick={tick}
/>
);
}

if (currentPage === "outings") {
return (
<OutingsPanel
  activeOutings={activeOutings}
  staffById={staffById}
  participantsById={participantsById}
/>
);
}

if (currentPage === "eventsMeetingsVisits") {
return (
<EventsMeetingsVisitsPanel
  visibleEventsMeetingsVisits={visibleEventsMeetingsVisits}
  todayEventsMeetingsVisits={todayEventsMeetingsVisits}
  upcomingEventsMeetingsVisits={upcomingEventsMeetingsVisits}
/>
);
}

if (currentPage === "cleaning") {
return <CleaningPanel cleaningRows={cleaningRows} />;
}

if (currentPage === "dropoffs") {
return <DropoffsPanel dropoffRows={dropoffRows} />;
}

if (isReminderPage(currentPage)) {
return <ReminderPanel currentPage={currentPage} />;
}

return (
<ChecklistPanel
  checklistRows={checklistRows}
  completedChecklist={completedChecklist}
  selectedFinalStaff={selectedFinalStaff}
  selectedFinalStaffColor={selectedFinalStaffColor}
  selectedFinalStaffTextColor={selectedFinalStaffTextColor}
/>
);
};

return (
<DashboardFrame
  date={date}
  tick={tick}
  lastDashboardRefresh={lastDashboardRefresh}
  currentPage={currentPage}
  pageIndex={pageIndex}
  pageCount={pages.length}
  pageTheme={pageTheme}
>
  {renderCurrentPanel()}
</DashboardFrame>
);
}
