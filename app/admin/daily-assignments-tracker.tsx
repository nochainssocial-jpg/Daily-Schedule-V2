import WeeklyReportScreen from '@/components/admin/WeeklyReportScreen';
import { loadTeamAssignmentsReport } from '@/lib/admin-report-engine';

export default function DailyAssignmentsTrackerRoute() {
  return (
    <WeeklyReportScreen
      defaultWeekOffset={0}
      pageTitle="Team Daily Assignment – Weekly Tracker"
      pageSubtitle="Current-week fairness view using the latest saved schedule for each working day."
      loadReport={loadTeamAssignmentsReport}
    />
  );
}
