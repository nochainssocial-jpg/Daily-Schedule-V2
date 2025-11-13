export type ID = string;

export type Staff = {
  id: ID;
  name: string;
  color?: string;
  isTeamLeader?: boolean;
  gender?: 'male' | 'female';
};

export type Participant = {
  id: ID;
  name: string;
};

export type Chore = {
  id: ID | number;
  label: string;
};

export type ChecklistItem = {
  id: ID | number;
  label: string;
};

export type TimeSlot = {
  id: string;
  label: string;
};

export const STAFF: Staff[] = [
  { id: '1', name: 'Antoinette', isTeamLeader: true, gender: 'female' },
  { id: '2', name: 'Antonia', gender: 'female' },
  { id: '3', name: 'Benoit', gender: 'male' },
  { id: '4', name: 'Charbel', gender: 'male' },
  { id: '5', name: 'Chelsea', gender: 'female' },
  { id: '6', name: 'Crystal', gender: 'female' },
  { id: '7', name: 'George', gender: 'male' },
  { id: '8', name: 'Michelle', gender: 'female' },
];

export const PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Participant One' },
  { id: 'p2', name: 'Participant Two' },
  { id: 'p3', name: 'Participant Three' },
  { id: 'p4', name: 'Participant Four' },
];

export const DEFAULT_CHORES: Chore[] = [
  { id: 1, label: 'Sweep and mop main area' },
  { id: 2, label: 'Wipe benches and tables' },
  { id: 3, label: 'Tidy kitchen and pack dishwasher' },
  { id: 4, label: 'Sanitise bathroom surfaces' },
];

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 1, label: 'All participants safely signed out / transported' },
  { id: 2, label: 'Medication checks completed and documented' },
  { id: 3, label: 'All doors and windows secure' },
  { id: 4, label: 'Bins emptied and taken out' },
];

export const FLOATING_ROOMS: { id: string; label: string }[] = [
  { id: 'front-room', label: 'Front Room' },
  { id: 'scotty', label: 'Scotty' },
  { id: 'twins', label: 'Twins' },
];

export const TIME_SLOTS: TimeSlot[] = [
  { id: '09:00-09:30', label: '09:00 – 09:30' },
  { id: '09:30-10:00', label: '09:30 – 10:00' },
  { id: '10:00-10:30', label: '10:00 – 10:30' },
  { id: '11:00-11:30', label: '11:00 – 11:30' }, // FSO for Twins
  { id: '13:00-13:30', label: '13:00 – 13:30' }, // FSO for Twins
  { id: '14:30-15:00', label: '14:30 – 15:00' },
];
