export interface Staff {
  id: string;
  name: string;
  color: string;
  isTeamLeader?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  hasDropOff?: boolean;
  dropOffLocation?: string;
}

export interface Chore {
  id: string;
  name: string;
}

export interface ChecklistItem {
  id: string;
  name: string;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  displayTime: string;
}

export interface Assignment {
  staffId: string;
  participantIds: string[];
}

export interface TimeSlotAssignment {
  timeSlotId: string;
  staffId: string;
}

export interface ChoreAssignment {
  choreId: string;
  staffId: string;
}

export interface DropOffAssignment {
  participantId: string;
  staffId: string;
  location?: string;
}

export interface PickupAssignment {
  participantId: string;
  staffId: string;
  location?: string;
}

export interface Schedule {
  id: string;
  date: string;
  workingStaff: string[];
  attendingParticipants: string[];
  assignments: Assignment[];
  frontRoomSlots: TimeSlotAssignment[];
  scottySlots: TimeSlotAssignment[];
  twinsSlots: TimeSlotAssignment[];
  choreAssignments: ChoreAssignment[];
  finalChecklistStaff: string;
  dropoffs_pickups: DropOffAssignment[];
  dropoffs_pickups: PickupAssignment[];
}

export interface ScheduleStep {
  step: number;
  title: string;
  completed: boolean;
}

export interface SharedSchedule {
  code: string;
  schedule: Schedule;
  createdAt: string;
  expiresAt: string;
}

export interface ScheduleImportResult {
  success: boolean;
  schedule?: Schedule;
  error?: string;
}