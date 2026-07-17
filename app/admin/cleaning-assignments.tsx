import WeeklyReportScreen from '@/components/admin/WeeklyReportScreen';
import { loadCleaningAssignmentsReport } from '@/lib/admin-report-engine';

export default function CleaningAssignmentsReportRoute() {
  return (
    <WeeklyReportScreen
      defaultWeekOffset={-1}
      pageTitle="Cleaning – Weekly Report"
      pageSubtitle="Previous-week report showing which cleaning duties were assigned to each real staff member."
      loadReport={loadCleaningAssignmentsReport}
    />
  );
}
