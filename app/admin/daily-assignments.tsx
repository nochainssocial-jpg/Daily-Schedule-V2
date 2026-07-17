import WeeklyReportScreen from '@/components/admin/WeeklyReportScreen';
import { loadTeamAssignmentsReport } from '@/lib/admin-report-engine';

export default function DailyAssignmentsReportRoute() {
  return (
    <WeeklyReportScreen
      defaultWeekOffset={-1}
      pageTitle="Team Daily Assignment – Weekly Report"
      pageSubtitle="Previous-week report showing which participants were assigned to each real staff member."
      loadReport={loadTeamAssignmentsReport}
    />
  );
}
