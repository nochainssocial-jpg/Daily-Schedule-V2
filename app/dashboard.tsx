import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSchedule } from "@/hooks/schedule-store";
import {
  chores as STATIC_CHORES,
  checklistItems as STATIC_CHECKLIST_ITEMS,
  TIME_SLOTS,
} from "@/constants/data";

import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { DashboardPanelRouter } from "@/components/dashboard/DashboardPanelRouter";
import { FloatingRotationBanner } from "@/components/dashboard/FloatingRotationBanner";
import type { DashboardPage } from "@/components/dashboard/dashboardTypes";
import {
  DASHBOARD_OPERATIONAL_TIMES,
  DASHBOARD_PAGE_THEMES,
  REMINDER_PAGE_ORDER,
  STAFF_OTHER_COLOR,
} from "@/components/dashboard/dashboardTheme";
import {
  colorForStaff,
  getDashboardOperationalPhase,
  getOutingPhase,
  hasOutingContent,
  isEventDashboardVisible,
  sortEventsMeetingsVisits,
  todayISODate,
} from "@/components/dashboard/dashboardUtils";
import { resolveDashboardLocationId } from "@/components/dashboard/dashboardConfig";
import { useDashboardClock } from "@/components/dashboard/hooks/useDashboardClock";
import { useDashboardLifecycle } from "@/components/dashboard/hooks/useDashboardLifecycle";
import { useDashboardNavigation } from "@/components/dashboard/hooks/useDashboardNavigation";
import {
  buildStaffCelebrationItems,
  splitStaffCelebrations,
} from "@/components/dashboard/staffCelebrationData";
import {
  buildUpcomingFloatingRotationAnnouncement,
  isDashboardSpeechSupported,
  speakDashboardAnnouncement,
} from "@/components/dashboard/dashboardVoice";

export default function DashboardScreen() {
const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] = useState(false);
const spokenFloatingRotationKeysRef = useRef<Set<string>>(new Set());
const locationId = useMemo(() => resolveDashboardLocationId(), []);

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
attendingParticipants = [],
outingGroups = [],
outingGroup = null,
} = useSchedule() as any;

const { tick, currentMinutes, dashboardNow, isPreviewMode, previewTimeLabel } =
useDashboardClock(date);
const { lastDashboardRefresh, eventsMeetingsVisits } =
useDashboardLifecycle(locationId);
const operationalPhase = useMemo(
() => getDashboardOperationalPhase(currentMinutes),
[currentMinutes],
);
const cleaningIsOperational = currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.cleaningStarts;
const dropoffsAreOperational =
currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.dropoffsStart &&
currentMinutes < DASHBOARD_OPERATIONAL_TIMES.programEnds;
const checklistIsOperational = currentMinutes >= DASHBOARD_OPERATIONAL_TIMES.checklistStarts;
const dailyAssignmentsAreOperational =
currentMinutes < DASHBOARD_OPERATIONAL_TIMES.dailyAssignmentsHide;
const floatingIsOperational = currentMinutes < DASHBOARD_OPERATIONAL_TIMES.floatingEnds;
const reminderBurstMinute = currentMinutes % 60;
const reminderBurstActive = reminderBurstMinute >= 15 && reminderBurstMinute < 16;

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

const visibleOutings = useMemo(
() => activeOutings.filter((outing) => getOutingPhase(outing, currentMinutes) !== "none"),
[activeOutings, currentMinutes],
);

const outing1StaffIds = useMemo(
() =>
new Set<string>(
((visibleOutings[0]?.staffIds ?? []) as any[]).map(String),
),
[visibleOutings],
);

const outing2StaffIds = useMemo(
() =>
new Set<string>(
((visibleOutings[1]?.staffIds ?? []) as any[]).map(String),
),
[visibleOutings],
);

const outing1ParticipantIds = useMemo(
() =>
new Set<string>(
((visibleOutings[0]?.participantIds ?? []) as any[]).map(String),
),
[visibleOutings],
);

const outing2ParticipantIds = useMemo(
() =>
new Set<string>(
((visibleOutings[1]?.participantIds ?? []) as any[]).map(String),
),
[visibleOutings],
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
floatingIsOperational,
hasStaffCelebrations,
operationalPhase,
reminderBurstActive,
showChecklistPanel,
showCleaningPanel,
showDropoffsPanel,
visibleOutings.length,
]);

const {
pageIndex,
currentPage,
autoRotationEnabled,
previousPage: handlePreviousPage,
nextPage: handleNextPage,
toggleAutoRotation: handleToggleAutoRotation,
} = useDashboardNavigation(pages, reminderBurstActive);

const pageTheme = DASHBOARD_PAGE_THEMES[currentPage] || DASHBOARD_PAGE_THEMES.team;

const currentPanel = (
<DashboardPanelRouter
  currentPage={currentPage}
  teamAssignmentRows={teamAssignmentRows}
  displayTimeSlots={displayTimeSlots}
  floatingAssignments={floatingAssignments}
  staffById={staffById}
  participantsById={participantsById}
  attendingParticipants={attendingParticipants}
  visibleOutings={visibleOutings}
  tick={tick}
  currentMinutes={currentMinutes}
  visibleEventsMeetingsVisits={visibleEventsMeetingsVisits}
  todayEventsMeetingsVisits={todayEventsMeetingsVisits}
  upcomingEventsMeetingsVisits={upcomingEventsMeetingsVisits}
  todayStaffCelebrations={todayStaffCelebrations}
  upcomingStaffCelebrations={upcomingStaffCelebrations}
  cleaningRows={cleaningRows}
  dropoffRows={dropoffRows}
  checklistRows={checklistRows}
  completedChecklist={completedChecklist}
  selectedFinalStaff={selectedFinalStaff}
  selectedFinalStaffColor={selectedFinalStaffColor}
  selectedFinalStaffTextColor={selectedFinalStaffTextColor}
/>
);

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
  operationalPhase={operationalPhase}
  autoRotationEnabled={autoRotationEnabled}
  onPreviousPage={handlePreviousPage}
  onNextPage={handleNextPage}
  onToggleAutoRotation={handleToggleAutoRotation}
  floatingOverlay={
    <FloatingRotationBanner
      displayTimeSlots={displayTimeSlots}
      floatingAssignments={floatingAssignments}
      staffById={staffById}
      currentMinutes={currentMinutes}
    />
  }
>
  {currentPanel}
</DashboardFrame>
);
}