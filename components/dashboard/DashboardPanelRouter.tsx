import React from "react";
import { ChecklistPanel } from "./ChecklistPanel";
import { CleaningPanel } from "./CleaningPanel";
import { DropoffsPanel } from "./DropoffsPanel";
import { EventsMeetingsVisitsPanel } from "./EventsMeetingsVisitsPanel";
import { FloatingAssignmentsPanel } from "./FloatingAssignmentsPanel";
import { OutingsPanel } from "./OutingsPanel";
import { ReminderPanel } from "./ReminderPanel";
import { StaffCelebrationsPanel } from "./StaffCelebrationsPanel";
import { TeamAssignmentsPanel } from "./TeamAssignmentsPanel";
import type { DashboardPage } from "./dashboardTypes";
import { isReminderPage } from "./dashboardTheme";

type Props = {
  currentPage: DashboardPage;
  teamAssignmentRows: any[];
  displayTimeSlots: any[];
  floatingAssignments: any;
  staffById: Map<string, any>;
  participantsById: Map<string, any>;
  attendingParticipants: any[];
  visibleOutings: any[];
  tick: number;
  currentMinutes: number;
  visibleEventsMeetingsVisits: any[];
  todayEventsMeetingsVisits: any[];
  upcomingEventsMeetingsVisits: any[];
  todayStaffCelebrations: any[];
  upcomingStaffCelebrations: any[];
  cleaningRows: any[];
  dropoffRows: any[];
  checklistRows: any[];
  completedChecklist: number;
  selectedFinalStaff: string;
  selectedFinalStaffColor: string;
  selectedFinalStaffTextColor: string;
};

export function DashboardPanelRouter(props: Props) {
  const { currentPage } = props;

  if (currentPage === "team") {
    return <TeamAssignmentsPanel teamAssignmentRows={props.teamAssignmentRows} />;
  }

  if (currentPage === "floating") {
    return (
      <FloatingAssignmentsPanel
        displayTimeSlots={props.displayTimeSlots}
        floatingAssignments={props.floatingAssignments}
        staffById={props.staffById}
        participantsById={props.participantsById}
        attendingParticipants={props.attendingParticipants}
        activeOutings={props.visibleOutings}
        tick={props.tick}
        currentMinutes={props.currentMinutes}
      />
    );
  }

  if (currentPage === "outings") {
    return (
      <OutingsPanel
        activeOutings={props.visibleOutings}
        staffById={props.staffById}
        participantsById={props.participantsById}
        currentMinutes={props.currentMinutes}
      />
    );
  }

  if (currentPage === "eventsMeetingsVisits") {
    return (
      <EventsMeetingsVisitsPanel
        visibleEventsMeetingsVisits={props.visibleEventsMeetingsVisits}
        todayEventsMeetingsVisits={props.todayEventsMeetingsVisits}
        upcomingEventsMeetingsVisits={props.upcomingEventsMeetingsVisits}
      />
    );
  }

  if (currentPage === "staffCelebrations") {
    return (
      <StaffCelebrationsPanel
        todayCelebrations={props.todayStaffCelebrations}
        upcomingCelebrations={props.upcomingStaffCelebrations}
      />
    );
  }

  if (currentPage === "cleaning") return <CleaningPanel cleaningRows={props.cleaningRows} />;
  if (currentPage === "dropoffs") return <DropoffsPanel dropoffRows={props.dropoffRows} />;
  if (isReminderPage(currentPage)) return <ReminderPanel currentPage={currentPage} />;

  return (
    <ChecklistPanel
      checklistRows={props.checklistRows}
      completedChecklist={props.completedChecklist}
      selectedFinalStaff={props.selectedFinalStaff}
      selectedFinalStaffColor={props.selectedFinalStaffColor}
      selectedFinalStaffTextColor={props.selectedFinalStaffTextColor}
    />
  );
}
