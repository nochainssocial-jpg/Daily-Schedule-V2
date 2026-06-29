export type ID = string;

export type DashboardPage =
  | "team"
  | "floating"
  | "outings"
  | "eventsMeetingsVisits"
  | "cleaning"
  | "checklist"
  | "dropoffs"
  | "incidentReports"
  | "behaviourObservations"
  | "communicationForms"
  | "phoneUsage";

export type RoomKey = "frontRoom" | "scotty" | "twins";

export type ReminderPage =
  | "incidentReports"
  | "behaviourObservations"
  | "communicationForms"
  | "phoneUsage";

export type EventMeetingVisitRecord = {
  id: string;
  house: string;
  title: string;
  main_category: "Event" | "Meeting" | "Visit";
  event_type: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  display_from: string | null;
  display_until: string | null;
  visitor_name: string | null;
  organisation: string | null;
  responsible_staff: string | null;
  location: string | null;
  dashboard_visible: boolean;
  auto_archive: boolean;
  status: "Scheduled" | "Active" | "Completed" | "Cancelled" | "Archived";
  notes: string | null;
};
