import WeeklyReportScreen from '@/components/admin/WeeklyReportScreen';
import { loadCleaningAssignmentsReport } from '@/lib/admin-report-engine';

export default function DailyCleaningTrackerRoute() {
  return (
    <WeeklyReportScreen
      defaultWeekOffset={0}
      pageTitle="Cleaning Assignments Tracker"
      pageSubtitle="Current-week fairness view using the latest saved cleaning duties for each working day."
      loadReport={loadCleaningAssignmentsReport}
    />
  );
}
