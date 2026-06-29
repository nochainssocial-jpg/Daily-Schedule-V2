import type { DashboardPage, ReminderPage, RoomKey } from "./dashboardTypes";

export const HOUSE_ID = "B2";
export const ROTATE_MS = 15_000;
export const DASHBOARD_REFRESH_MS = 120_000;
export const MAX_WIDTH = 1180;
export const ROOM_KEYS: RoomKey[] = ["frontRoom", "scotty", "twins"];

export const STAFF_FEMALE_COLOR = "#FF6FB3";
export const STAFF_MALE_COLOR = "#4A90E2";
export const STAFF_OTHER_COLOR = "#9B9B9B";

export const DASHBOARD_PAGE_THEMES: Record<DashboardPage, { background: string; accent: string }> = {
  team: { background: "#E9DEFF", accent: "#7C6BF2" },
  floating: { background: "#FFF1FF", accent: "#C084FC" },
  outings: { background: "#FFF7ED", accent: "#F97316" },
  eventsMeetingsVisits: { background: "#FFF4FA", accent: "#F54FA5" },
  cleaning: { background: "#DCFCE7", accent: "#22C55E" },
  checklist: { background: "#E5ECFF", accent: "#6366F1" },
  dropoffs: { background: "#FFD0B5", accent: "#FB7185" },
  incidentReports: { background: "#FFF4FA", accent: "#F54FA5" },
  behaviourObservations: { background: "#FFF4FA", accent: "#F54FA5" },
  communicationForms: { background: "#FFF4FA", accent: "#F54FA5" },
  phoneUsage: { background: "#FFF4FA", accent: "#F54FA5" },
};

export const EVENT_CARD_THEMES = {
  future: {
    background: "#FFFCF0",
    border: "#FDE68A",
    iconBackground: "#FEF3C7",
    icon: "#92400E",
    label: "#92400E",
    muted: "#6B7280",
    pillBackground: "#FEF3C7",
    pillBorder: "#FDE68A",
    pillText: "#92400E",
    noteBackground: "#FFF7D6",
  },
  active: {
    background: "#F0FDF4",
    border: "#86EFAC",
    iconBackground: "#DCFCE7",
    icon: "#166534",
    label: "#166534",
    muted: "#166534",
    pillBackground: "#DCFCE7",
    pillBorder: "#86EFAC",
    pillText: "#166534",
    noteBackground: "#E8FBEF",
  },
};

export const ROOM_LABELS: Record<RoomKey, string> = {
  frontRoom: "Front Room",
  scotty: "Scotty",
  twins: "Twins / FSO",
};

export const REMINDER_CONTENT: Record<
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
      "Personal phone use is not permitted while on shift. Staff must remain focused on participants and daily support duties.",
    points: [
      "Phones may be used to log required forms and shift documentation",
      "Phones may be used to take appropriate photos of participants during activities",
      "Phones may be used during outings when needed for participant support or safety",
      "Phones may be used to post required updates to the WhatsApp group",
      "The main responsibility is to interact with participants and spend meaningful time with them",
    ],
    footer: "Phones are work tools during shift, not for personal use.",
  },
};

export function isReminderPage(page: DashboardPage): page is ReminderPage {
  return (
    page === "incidentReports" ||
    page === "behaviourObservations" ||
    page === "communicationForms" ||
    page === "phoneUsage"
  );
}

export function pageLabel(page: DashboardPage): string {
  switch (page) {
    case "team":
      return "Daily Assignments";
    case "floating":
      return "Floating";
    case "outings":
      return "Outings";
    case "eventsMeetingsVisits":
      return "Events | Meetings | Visits";
    case "cleaning":
      return "Cleaning";
    case "checklist":
      return "End of Shift Checklist";
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
