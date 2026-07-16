import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOutingBySlot, resolveOutingTiming } from "@/lib/outingSlots";
import { initScheduleForToday, refreshScheduleFromSupabase, useSchedule } from "@/hooks/schedule-store";
import {
  chores as STATIC_CHORES,
  checklistItems as STATIC_CHECKLIST_ITEMS,
  TIME_SLOTS,
} from "@/constants/data";

import { ChecklistPanel } from "@/components/dashboard/ChecklistPanel";
import { CleaningPanel } from "@/components/dashboard/CleaningPanel";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { DailyPhasePills } from "@/components/dashboard/DailyPhasePills";
import { DropoffsPanel } from "@/components/dashboard/DropoffsPanel";
import { EventsMeetingsVisitsPanel } from "@/components/dashboard/EventsMeetingsVisitsPanel";
import { FloatingAssignmentsPanel } from "@/components/dashboard/FloatingAssignmentsPanel";
import { FloatingRotationBanner } from "@/components/dashboard/FloatingRotationBanner";
import { OutingsPanel } from "@/components/dashboard/OutingsPanel";
import { NoSchedulePanel } from "@/components/dashboard/NoSchedulePanel";
import { ReminderPanel } from "@/components/dashboard/ReminderPanel";
import { StaffCelebrationsPanel } from "@/components/dashboard/StaffCelebrationsPanel";
import { TeamAssignmentsPanel } from "@/components/dashboard/TeamAssignmentsPanel";
import type { DashboardPage, EventMeetingVisitRecord } from "@/components/dashboard/dashboardTypes";
import {
  DASHBOARD_OPERATIONAL_TIMES,
  DASHBOARD_PAGE_THEMES,
  DASHBOARD_REFRESH_MS,
  HOUSE_ID,
  REMINDER_PAGE_ORDER,
  ROTATE_MS,
  STAFF_OTHER_COLOR,
  isReminderPage,
} from "@/components/dashboard/dashboardTheme";
import {
  buildDashboardDateAtMinutes,
  colorForStaff,
  getDashboardOperationalPhase,
  getOutingPhase,
  hasOutingContent,
  isEventDashboardExpired,
  isEventDashboardVisible,
  minutesToTimeLabel,
  nowMinutes,
  parsePreviewTimeToMinutes,
  sortEventsMeetingsVisits,
  todayISODate,
} from "@/components/dashboard/dashboardUtils";
import {
  buildStaffCelebrationItems,
  splitStaffCelebrations,
} from "@/components/dashboard/staffCelebrationData";
import {
  buildUpcomingFloatingRotationAnnouncement,
  isDashboardSpeechSupported,
  speakDashboardAnnouncement,
} from "@/components/dashboard/dashboardVoice";

// Dashboard reminder tabs added: Incident Reports, Behaviour Observations, Participant Communication Forms, Phone Usage.

const MANUAL_ROTATION_RESUME_MS = 90_000;
const REMINDER_BURST_MINUTE = 15;
const REMINDER_BURST_DURATION_MINUTES = 1;


function getPreviewTimeParam(): string | null {
if (typeof window === "undefined") return null;

try {
return new URLSearchParams(window.location.search).get("previewTime");
} catch {
return null;
}
}

export default function DashboardScreen() {
const [pageIndex, setPageIndex] = useState(0);
const [tick, setTick] = useState(0);
const [lastDashboardRefresh, setLastDashboardRefresh] = useState<Date | null>(null);
const [eventsMeetingsVisits, setEventsMeetingsVisits] = useState<EventMeetingVisitRecord[]>([]);
const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] = useState(false);
const [autoRotationEnabled, setAutoRotationEnabled] = useState(true);
const spokenFloatingRotationKeysRef = useRef<Set<string>>(new Set());
const autoResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const {
date,
todayScheduleStatus,
scheduleLoadError,
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
attendingParticipants = [],
outingGroups = [],
outingGroup = null,
} = useSchedule() as any;

const previewTimeParam = useMemo(() => getPreviewTimeParam(), []);
const previewMinutes = useMemo(
() => parsePreviewTimeToMinutes(previewTimeParam),
[previewTimeParam],
);
const isPreviewMode = previewMinutes !== null;
const currentMinutes = previewMinutes ?? nowMinutes();
const dashboardNow = useMemo(
() =>
  isPreviewMode
  ? buildDashboardDateAtMinutes(date, currentMinutes)
  : new Date(),
[date, currentMinutes, isPreviewMode, tick],
);
const operationalPhase = useMemo(
() => getDashboardOperationalPhase(currentMinutes),
[currentMinutes],
);
const previewTimeLabel = isPreviewMode ? minutesToTimeLabel(currentMinutes) : null;
const cleaningIsOperational = currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.cleaningStarts;
const dropoffsAreOperational =
currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.dropoffsStart &&
currentMinutes < DASHBOARD_OPERATIONAL_TIMES.programEnds;
const checklistIsOperational = currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.checklistStarts;
const dailyAssignmentsAreOperational =
currentMinutes < DASHBOARD_OPERATIONAL_TIMES.dailyAssignmentsHide;
const morningSetupIsOperational =
currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.arrivalsStart &&
currentMinutes < DASHBOARD_OPERATIONAL_TIMES.officialStart;
const floatingIsOperational = currentMinutes < DASHBOARD_OPERATIONAL_TIMES.floatingEnds;
const reminderBurstMinute = currentMinutes % 60;
const reminderBurstActive =
reminderBurstMinute >= REMINDER_BURST_MINUTE &&
reminderBurstMinute < REMINDER_BURST_MINUTE + REMINDER_BURST_DURATION_MINUTES;

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

const records = (data || []) as EventMeetingVisitRecord[];
let nextRecords = records;

// Auto-archive is never run while using previewTime, so testing the dashboard
// cannot modify live records.
if (!isPreviewMode) {
const expiredAutoArchiveIds = records
.filter(
(item) =>
item.auto_archive &&
item.status !== "Archived" &&
item.status !== "Cancelled" &&
isEventDashboardExpired(item, Date.now()),
)
.map((item) => item.id);

if (expiredAutoArchiveIds.length > 0) {
const { error: archiveError } = await supabase
.from("events_meetings_visits")
.update({ status: "Archived" })
.eq("house", HOUSE_ID)
.in("id", expiredAutoArchiveIds);

if (archiveError) {
console.error("[dashboard] failed to auto-archive expired events", archiveError);
} else {
const archivedIds = new Set(expiredAutoArchiveIds);
nextRecords = records.map((item) =>
archivedIds.has(item.id) ? { ...item, status: "Archived" as const } : item,
);
}
}
}

setEventsMeetingsVisits(nextRecords);
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
return groups
.map((group: any) => resolveOutingTiming(group, groups as any))
.slice(0, 3)
.filter(hasOutingContent);
}, [outingGroups, outingGroup]);

const visibleOutings = useMemo(
() => activeOutings.filter((outing) => getOutingPhase(outing, currentMinutes) !== "none"),
[activeOutings, currentMinutes],
);

const outing1StaffIds = useMemo(
() =>
new Set<string>(
((getOutingBySlot(visibleOutings, 0)?.staffIds ?? []) as any[]).map(String),
),
[visibleOutings],
);

const outing2StaffIds = useMemo(
() =>
new Set<string>(
((getOutingBySlot(visibleOutings, 1)?.staffIds ?? []) as any[]).map(String),
),
[visibleOutings],
);

const outing1ParticipantIds = useMemo(
() =>
new Set<string>(
((getOutingBySlot(visibleOutings, 0)?.participantIds ?? []) as any[]).map(String),
),
[visibleOutings],
);

const outing2ParticipantIds = useMemo(
() =>
new Set<string>(
((getOutingBySlot(visibleOutings, 1)?.participantIds ?? []) as any[]).map(String),
),
[visibleOutings],
);
const safetyTransportStaffIds = useMemo(
() =>
new Set<string>(
((getOutingBySlot(visibleOutings, 2)?.staffIds ?? []) as any[]).map(String),
),
[visibleOutings],
);

const safetyTransportParticipantIds = useMemo(
() =>
new Set<string>(
((getOutingBySlot(visibleOutings, 2)?.participantIds ?? []) as any[]).map(String),
),
[visibleOutings],
);


const getParticipantTheme = (participantId: string) => {
if (outing1ParticipantIds.has(participantId)) return "outing1" as const;
if (outing2ParticipantIds.has(participantId)) return "outing2" as const;
if (safetyTransportParticipantIds.has(participantId)) return "outing3" as const;
return "onsite" as const;
};

const getAssignmentTheme = (staffId: string, participantIds: string[]) => {
// Direct staff outing membership wins first. This keeps the dashboard aligned
// with the Edit Hub outing banners when staff have been explicitly placed on
// Outing 1, Outing 2, or Additional Transport.
if (outing1StaffIds.has(staffId)) return "outing1" as const;
if (outing2StaffIds.has(staffId)) return "outing2" as const;
if (safetyTransportStaffIds.has(staffId)) return "outing3" as const;

// If staff were not directly placed on an outing, infer the tile colour from
// their assigned participants. This covers the common operational case where
// the assigned staff member follows their participant onto the outing.
if (participantIds.some((id) => outing1ParticipantIds.has(id))) {
return "outing1" as const;
}
if (participantIds.some((id) => outing2ParticipantIds.has(id))) {
return "outing2" as const;
}
if (participantIds.some((id) => safetyTransportParticipantIds.has(id))) {
return "outing3" as const;
}
return "onsite" as const;
};

const teamAssignmentRows = useMemo(() => {
const byStaff = new Map<string, string[]>();
const workingSet = new Set((workingStaff || []).map(String));

// Always include every member of today's Dream Team, even when a participant
// has not yet been allocated to them. This keeps the dashboard headcount aligned
// with the Dream Team editor.
if (workingSet.size > 0) {
workingSet.forEach((staffId) => {
if (staffById.has(staffId)) byStaff.set(staffId, []);
});
}

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
.sort((a, b) => a.staffName.localeCompare(b.staffName, "en-AU"));
}, [
assignments,
staffById,
participantsById,
workingStaff,
outing1StaffIds,
outing2StaffIds,
safetyTransportStaffIds,
outing1ParticipantIds,
outing2ParticipantIds,
safetyTransportParticipantIds,
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

const upcomingFloatingRotationAnnouncement = useMemo(
() =>
buildUpcomingFloatingRotationAnnouncement({
  date,
  displayTimeSlots,
  floatingAssignments,
  staffById,
  tick,
  currentMinutes,
  noticeMinutes: 1,
}),
[date, displayTimeSlots, floatingAssignments, staffById, tick, currentMinutes],
);

useEffect(() => {
if (!voiceAnnouncementsEnabled) return;
if (!upcomingFloatingRotationAnnouncement) return;
if (!isDashboardSpeechSupported()) return;

const { key, message } = upcomingFloatingRotationAnnouncement;
if (spokenFloatingRotationKeysRef.current.has(key)) return;

const spoken = speakDashboardAnnouncement(message);
if (spoken) {
spokenFloatingRotationKeysRef.current.add(key);
}
}, [voiceAnnouncementsEnabled, upcomingFloatingRotationAnnouncement]);

const handleToggleVoiceAnnouncements = () => {
const nextEnabled = !voiceAnnouncementsEnabled;
setVoiceAnnouncementsEnabled(nextEnabled);

if (nextEnabled) {
speakDashboardAnnouncement("Voice announcements enabled.");
} else if (isDashboardSpeechSupported()) {
try {
window.speechSynthesis?.cancel();
} catch {
// Ignore browser speech cancellation failures.
}
}
};

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
const showCleaningPanel = hasCleaningAssignments && cleaningIsOperational;
const showDropoffsPanel = hasDropoffAssignments && dropoffsAreOperational;
const showChecklistPanel = hasChecklistData && checklistIsOperational;

const visibleEventsMeetingsVisits = useMemo(() => {
return (eventsMeetingsVisits || [])
.filter((item) => isEventDashboardVisible(item, tick, dashboardNow.getTime()))
.sort(sortEventsMeetingsVisits);
}, [dashboardNow, eventsMeetingsVisits, tick]);

const todayEventsMeetingsVisits = useMemo(() => {
const today = todayISODate(dashboardNow);
return visibleEventsMeetingsVisits.filter(
(item) => String(item.event_date).slice(0, 10) === today,
);
}, [dashboardNow, visibleEventsMeetingsVisits]);

const upcomingEventsMeetingsVisits = useMemo(() => {
const today = todayISODate(dashboardNow);
return visibleEventsMeetingsVisits
.filter((item) => String(item.event_date).slice(0, 10) > today)
.slice(0, 6);
}, [dashboardNow, visibleEventsMeetingsVisits]);

const hasEventsMeetingsVisits = visibleEventsMeetingsVisits.length > 0;

const staffCelebrationItems = useMemo(() => {
return buildStaffCelebrationItems(staff, tick);
}, [staff, tick]);

const { today: todayStaffCelebrations, upcoming: upcomingStaffCelebrations } =
useMemo(() => splitStaffCelebrations(staffCelebrationItems), [staffCelebrationItems]);

const hasStaffCelebrations = staffCelebrationItems.length > 0;

const pages = useMemo<DashboardPage[]>(() => {
const list: DashboardPage[] = [];
const add = (page: DashboardPage, condition = true) => {
if (condition && !list.includes(page)) list.push(page);
};

if (operationalPhase === "arrivalSetup") {
add("morningSetup", morningSetupIsOperational);
add("team", dailyAssignmentsAreOperational);
add("eventsMeetingsVisits", hasEventsMeetingsVisits);
add("outings", visibleOutings.length > 0);
add("staffCelebrations", hasStaffCelebrations);
add("floating", floatingIsOperational);
} else if (operationalPhase === "activeProgram") {
add("floating", floatingIsOperational);
add("outings", visibleOutings.length > 0);
add("eventsMeetingsVisits", hasEventsMeetingsVisits);
add("team", dailyAssignmentsAreOperational);
add("staffCelebrations", hasStaffCelebrations);
} else if (operationalPhase === "cleaningActive") {
add("floating", floatingIsOperational);
add("cleaning", showCleaningPanel);
add("outings", visibleOutings.length > 0);
add("eventsMeetingsVisits", hasEventsMeetingsVisits);
add("team", dailyAssignmentsAreOperational);
add("staffCelebrations", hasStaffCelebrations);
} else if (operationalPhase === "departureWindow") {
add("dropoffs", showDropoffsPanel);
add("floating", floatingIsOperational);
add("cleaning", showCleaningPanel);
add("outings", visibleOutings.length > 0);
add("eventsMeetingsVisits", hasEventsMeetingsVisits);
add("team", dailyAssignmentsAreOperational);
add("staffCelebrations", hasStaffCelebrations);
} else {
add("checklist", showChecklistPanel);
add("dropoffs", showDropoffsPanel);
add("cleaning", showCleaningPanel);
add("eventsMeetingsVisits", hasEventsMeetingsVisits);
add("team", dailyAssignmentsAreOperational);
add("staffCelebrations", hasStaffCelebrations);
}

return reminderBurstActive ? [...REMINDER_PAGE_ORDER] : list;
}, [
hasEventsMeetingsVisits,
dailyAssignmentsAreOperational,
morningSetupIsOperational,
floatingIsOperational,
hasStaffCelebrations,
operationalPhase,
reminderBurstActive,
showChecklistPanel,
showCleaningPanel,
showDropoffsPanel,
visibleOutings.length,
]);

useEffect(() => {
setPageIndex(0);
}, [reminderBurstActive]);

useEffect(() => {
if (!autoRotationEnabled || pages.length <= 1) return;

const timer = setInterval(() => {
setPageIndex((value) => (value + 1) % Math.max(1, pages.length));
}, ROTATE_MS);
return () => clearInterval(timer);
}, [autoRotationEnabled, pages.length]);

useEffect(() => {
if (pageIndex >= pages.length) setPageIndex(0);
}, [pageIndex, pages.length]);

const clearAutoResumeTimer = useCallback(() => {
if (autoResumeTimerRef.current) {
  clearTimeout(autoResumeTimerRef.current);
  autoResumeTimerRef.current = null;
}
}, []);

const pauseAutoRotationBriefly = useCallback(() => {
setAutoRotationEnabled(false);
clearAutoResumeTimer();
autoResumeTimerRef.current = setTimeout(() => {
  setAutoRotationEnabled(true);
  autoResumeTimerRef.current = null;
}, MANUAL_ROTATION_RESUME_MS);
}, [clearAutoResumeTimer]);

const handlePreviousPage = useCallback(() => {
pauseAutoRotationBriefly();
setPageIndex((value) => {
  const count = Math.max(1, pages.length);
  return (value - 1 + count) % count;
});
}, [pages.length, pauseAutoRotationBriefly]);

const handleNextPage = useCallback(() => {
pauseAutoRotationBriefly();
setPageIndex((value) => (value + 1) % Math.max(1, pages.length));
}, [pages.length, pauseAutoRotationBriefly]);

const handleToggleAutoRotation = useCallback(() => {
clearAutoResumeTimer();
setAutoRotationEnabled((value) => !value);
}, [clearAutoResumeTimer]);

useEffect(() => {
return () => clearAutoResumeTimer();
}, [clearAutoResumeTimer]);

useEffect(() => {
if (typeof window === "undefined") return;

const handleKeyDown = (event: any) => {
  const target = event.target as any;
  const tagName = target?.tagName?.toLowerCase?.();
  if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    handlePreviousPage();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    handleNextPage();
  } else if (event.key === " ") {
    event.preventDefault();
    handleToggleAutoRotation();
  }
};

window.addEventListener("keydown", handleKeyDown);
return () => window.removeEventListener("keydown", handleKeyDown);
}, [handleNextPage, handlePreviousPage, handleToggleAutoRotation]);

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
  participantsById={participantsById}
  attendingParticipants={attendingParticipants}
  activeOutings={visibleOutings}
  tick={tick}
  currentMinutes={currentMinutes}
/>
);
}

if (currentPage === "outings") {
return (
<OutingsPanel
  activeOutings={visibleOutings}
  staffById={staffById}
  participantsById={participantsById}
  currentMinutes={currentMinutes}
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

if (currentPage === "staffCelebrations") {
return (
<StaffCelebrationsPanel
  todayCelebrations={todayStaffCelebrations}
  upcomingCelebrations={upcomingStaffCelebrations}
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

if (todayScheduleStatus === "idle" || todayScheduleStatus === "loading") {
return (
<DashboardFrame
  date={date}
  tick={tick}
  lastDashboardRefresh={lastDashboardRefresh}
  currentPage="team"
  pageIndex={0}
  pageCount={1}
  pageTheme={DASHBOARD_PAGE_THEMES.team}
  currentMinutes={currentMinutes}
  isPreviewMode={isPreviewMode}
  previewTimeLabel={previewTimeLabel}
  autoRotationEnabled={false}
  floatingOverlay={null}
>
  <NoSchedulePanel loading />
</DashboardFrame>
);
}

if (todayScheduleStatus === "missing" || todayScheduleStatus === "error") {
return (
<DashboardFrame
  date={date}
  tick={tick}
  lastDashboardRefresh={lastDashboardRefresh}
  currentPage="team"
  pageIndex={0}
  pageCount={1}
  pageTheme={DASHBOARD_PAGE_THEMES.team}
  currentMinutes={currentMinutes}
  isPreviewMode={isPreviewMode}
  previewTimeLabel={previewTimeLabel}
  autoRotationEnabled={false}
  floatingOverlay={null}
>
  <NoSchedulePanel
    errorMessage={todayScheduleStatus === "error" ? scheduleLoadError : null}
  />
</DashboardFrame>
);
}

return (
<DashboardFrame
  date={date}
  tick={tick}
  lastDashboardRefresh={lastDashboardRefresh}
  currentPage={currentPage}
  pageIndex={pageIndex}
  pageCount={pages.length}
  pageTheme={pageTheme}
  voiceAnnouncementsEnabled={voiceAnnouncementsEnabled}
  voiceAnnouncementsSupported={isDashboardSpeechSupported()}
  onToggleVoiceAnnouncements={handleToggleVoiceAnnouncements}
  currentMinutes={currentMinutes}
  isPreviewMode={isPreviewMode}
  previewTimeLabel={previewTimeLabel}
  autoRotationEnabled={autoRotationEnabled}
  onPreviousPage={handlePreviousPage}
  onNextPage={handleNextPage}
  onToggleAutoRotation={handleToggleAutoRotation}
  floatingOverlay={
    <>
      <FloatingRotationBanner
        displayTimeSlots={displayTimeSlots}
        floatingAssignments={floatingAssignments}
        staffById={staffById}
        currentMinutes={currentMinutes}
      />
      <DailyPhasePills
        currentMinutes={currentMinutes}
        dashboardNow={dashboardNow}
        outings={activeOutings}
        todayEventsMeetingsVisits={todayEventsMeetingsVisits}
      />
    </>
  }
>
  {renderCurrentPanel()}
</DashboardFrame>
);
}