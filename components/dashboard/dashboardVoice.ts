// Legacy compatibility module. Voice announcements remain retired.
// Existing imports can continue resolving while dashboard audio uses recorded files.
export {
  floatingRotationAlarmKey,
  isDashboardAlarmSupported,
  isFloatingRotationAlarmMinute,
  playFloatingRotationAnnouncement,
} from "./dashboardAudio";
