import type { ScheduleSnapshot } from '@/hooks/schedule-store';
import { normaliseSydneyDateKey } from '@/lib/sydneyDate';

export type DailyScheduleSaveScope =
  | 'dreamTeam'
  | 'participants'
  | 'assignments'
  | 'floating'
  | 'cleaning'
  | 'pickups'
  | 'checklist';

function baseSnapshot(schedule: any, dateKey: string): ScheduleSnapshot {
  return {
    staff: schedule.staff || [],
    participants: schedule.participants || [],
    workingStaff: schedule.workingStaff || [],
    attendingParticipants: schedule.attendingParticipants || [],
    trainingStaffToday: schedule.trainingStaffToday || [],
    assignments: schedule.assignments || {},
    floatingAssignments: schedule.floatingAssignments || {},
    cleaningAssignments: schedule.cleaningAssignments || {},
    cleaningBinsVariant: schedule.cleaningBinsVariant ?? 0,
    finalChecklist: schedule.finalChecklist || {},
    finalChecklistStaff: schedule.finalChecklistStaff ?? null,
    pickupParticipants: schedule.pickupParticipants || [],
    helperStaff: schedule.helperStaff || [],
    helperPickupStaff: schedule.helperPickupStaff || [],
    dropoffAssignments: schedule.dropoffAssignments || {},
    dropoffLocations: schedule.dropoffLocations || {},

    // Outings are deliberately excluded from the daily schedule source of truth.
    // They are persisted independently in daily_outings.
    outingGroups: [],
    outingGroup: null,

    date: normaliseSydneyDateKey(dateKey),
    meta: schedule.meta ?? {},
  } as ScheduleSnapshot;
}

export function buildDailyScheduleSnapshot(schedule: any, dateKey: string): ScheduleSnapshot {
  return baseSnapshot(schedule, dateKey);
}

export function buildDailySchedulePatch(
  schedule: any,
  scope: DailyScheduleSaveScope,
): Partial<ScheduleSnapshot> {
  switch (scope) {
    case 'dreamTeam':
      return {
        workingStaff: schedule.workingStaff || [],
        trainingStaffToday: schedule.trainingStaffToday || [],
      };
    case 'participants':
      return {
        attendingParticipants: schedule.attendingParticipants || [],
      };
    case 'assignments':
      return {
        assignments: schedule.assignments || {},
      };
    case 'floating':
      return {
        floatingAssignments: schedule.floatingAssignments || {},
      };
    case 'cleaning':
      return {
        cleaningAssignments: schedule.cleaningAssignments || {},
        cleaningBinsVariant: schedule.cleaningBinsVariant ?? 0,
      };
    case 'pickups':
      return {
        pickupParticipants: schedule.pickupParticipants || [],
        helperStaff: schedule.helperStaff || [],
        helperPickupStaff: schedule.helperPickupStaff || [],
        dropoffAssignments: schedule.dropoffAssignments || {},
        dropoffLocations: schedule.dropoffLocations || {},
      } as Partial<ScheduleSnapshot>;
    case 'checklist':
      return {
        finalChecklist: schedule.finalChecklist || {},
        finalChecklistStaff: schedule.finalChecklistStaff ?? null,
      };
  }
}
