// CENTRAL MASTER DATA — single source of truth for the whole app.
// Types are defined locally so this file is standalone in any environment.

export type ID = string;

export type Staff = {
  id: ID;
  name: string;
  phone?: string;
  color?: string;
  isTeamLeader?: boolean;
  gender?: 'male' | 'female' | 'other';
};

export type Participant = {
  id: ID;
  name: string;
  school?: string;
  hasDropOff?: boolean;
  dropOffLocation?: string;
};

export type Chore = {
  id: ID;
  name: string;
};

export type ChecklistItem = {
  id: ID;
  name: string;
};

export type TimeSlot = {
  id: ID;
  startTime: string;   // 'HH:mm'
  endTime: string;     // 'HH:mm'
  displayTime: string; // UI label
};

export const STAFF_COLORS: string[] = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
  '#A3E4D7', '#F9E79F', '#D5A6BD', '#AED6F1', '#A9DFBF',
  '#F5B7B1', '#D2B4DE', '#A9CCE3', '#A3E4D7', '#F7DC6F',
  '#E8DAEF', '#D1F2EB'
];

export const STAFF: Staff[] = [
  { id: '13', name: 'Anita', phone: '+61497971799', color: '#FF6FB3', gender: 'female' },
  { id: '7', name: 'Antonia', phone: '+61478587297', color: '#FF6FB3', gender: 'female' },
  { id: '8', name: 'Antoinette', phone: '+61413459797', color: '#FF6FB3', gender: 'female' },
  { id: '20', name: 'Aschal', phone: '+61415581910', color: '#FF6FB3', gender: 'female' },
  { id: '29', name: 'Benoit', phone: '+61414881677', color: '#4A90E2', gender: 'male' },
  { id: '27', name: 'Bruno', phone: '+61450085380', color: '#4A90E2', gender: 'male' },
  { id: '23', name: 'Charlie', phone: '+61420888775', color: '#4A90E2', gender: 'male' },
  { id: '35', name: 'Chelsea', phone: '+61426263477', color: '#FF6FB3', gender: 'female' },
  { id: '25', name: 'Charbel', phone: '+61421596951', color: '#4A90E2', gender: 'male' },
  { id: '16', name: 'Claudette', phone: '+61406654344', color: '#FF6FB3', gender: 'female' },
  { id: '34', name: 'Crystal', phone: '+61404661344', color: '#FF6FB3', gender: 'female' },
  { id: '9',  name: 'Dalida', phone: '+61433331313', color: '#FF6FB3', gender: 'female' },
  { id: '12', name: 'Gabriel', phone: '+61478017933', color: '#4A90E2', gender: 'male' },
  { id: '32', name: 'George', phone: '+61422421458', color: '#4A90E2', gender: 'male' },
  { id: '3',  name: 'Isabella', phone: '+61401619414', color: '#FF6FB3', gender: 'female' },
  { id: '1',  name: 'Jamie', phone: '+61424785915', color: '#FF6FB3', gender: 'female' },
  { id: '6',  name: 'Jessica', phone: '+61404215414', color: '#FF6FB3', gender: 'female' },
  { id: '36', name: 'Juliet', phone: '+61412195636', color: '#FF6FB3', gender: 'female' },
  { id: '14', name: 'Liana', phone: '+61451722117', color: '#FF6FB3', gender: 'female' },
  { id: '17', name: 'Maray', phone: '+61431633378', color: '#FF6FB3', gender: 'female' },
  { id: '10', name: 'Marianne', phone: '+61422049434', color: '#FF6FB3', gender: 'female' },
  { id: '18', name: 'Mary', phone: '+61410479483', color: '#FF6FB3', gender: 'female' },
  { id: '4',  name: 'Merna', phone: '+61432475693', color: '#FF6FB3', gender: 'female' },
  { id: '28', name: 'Michelle', phone: '+61414540967', color: '#FF6FB3', gender: 'female' },
  { id: '24', name: 'Mikaela', phone: '+61452622144', color: '#FF6FB3', gender: 'female' },
  { id: '21', name: 'Paneta', phone: '+61450430147', color: '#FF6FB3', gender: 'female' },
  { id: '22', name: 'Patty', phone: '+61450274771', color: '#FF6FB3', gender: 'female' },
  { id: '5',  name: 'Princess', phone: '+61406496101', color: '#FF6FB3', gender: 'female' },
  { id: '26', name: 'Rahel', phone: '+61450700030', color: '#FF6FB3', gender: 'female' },
  { id: '19', name: 'Rebecca', phone: '+61420526656', color: '#FF6FB3', gender: 'female' },
  { id: '33', name: 'Readium', phone: '+61426800430', color: '#FF6FB3', gender: 'female' },
  { id: '2',  name: 'Tayla', phone: '+61423798141', color: '#FF6FB3', gender: 'female' },
  { id: '30', name: 'Temalesi', phone: '+61413347966', color: '#FF6FB3', gender: 'female' },
  { id: '37', name: 'Theresia', phone: '+61414396769', color: '#FF6FB3', gender: 'female' },
  { id: '15', name: 'Tsadkan (Liya)', phone: '+61404147070', color: '#FF6FB3', gender: 'female' },
  { id: '11', name: 'Violet', phone: '+61404391757', color: '#FF6FB3', gender: 'female' },
  { id: '31', name: 'William', phone: '+61451556225', color: '#4A90E2', gender: 'male' },

  // Special system entries:
  { id: '1003', name: 'Audit', color: '#9B9B9B', gender: 'other' },
  { id: '1002', name: 'Drive/Outing', color: '#9B9B9B', gender: 'other' },
  { id: '1001', name: 'Everyone', color: '#9B9B9B', gender: 'other' },
];

export const PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Ayaz' },
  { id: '2', name: 'Billy' },
  { id: '3', name: 'Billy - drop to Melina\'s', hasDropOff: true, dropOffLocation: 'Melina\'s' },
  { id: '4', name: 'Brian' },
  { id: '5', name: 'Diana' },
  { id: '6', name: 'Elias' },
  { id: '7', name: 'Gemana' },
  { id: '8', name: 'Jacob' },
  { id: '9', name: 'Jimmy' },
  { id: '10', name: 'Jessica' },
  { id: '11', name: 'Julian' },
  { id: '12', name: 'Maher' },
  { id: '13', name: 'Naveed' },
  { id: '14', name: 'Paul' },
  { id: '15', name: 'Peter' },
  { id: '16', name: 'Reema' },
  { id: '17', name: 'Reema - Mancini\'s', hasDropOff: true, dropOffLocation: 'Mancini\'s' },
  { id: '18', name: 'Saim' },
  { id: '19', name: 'Scott' },
  { id: '20', name: 'Shatha' },
  { id: '21', name: 'Sumera' },
  { id: '22', name: 'Tiffany' },
  { id: '23', name: 'Zara' },
  { id: '24', name: 'Zoya' },
  { id: '25', name: 'Tema' },
  { id: '26', name: 'Tema - Drop to Ayaz', hasDropOff: true, dropOffLocation: 'Ayaz' },
];

// End-of-shift chores (tap to assign / unassign)
export const DEFAULT_CHORES: Chore[] = [
  { id: '1', name: 'Vacuuming' },
  { id: '2', name: 'Mopping' },
  { id: '3', name: 'Clean toilets, Refill Soap Dispenser, Restock Toilet Paper' },
  { id: '4', name: 'Tidy up and Pack Twins Room' },
  { id: '5', name: 'Wipe down TV, Clean front Windows inside and outside, Wipe down Piano and table in lounge area' },
  { id: '6', name: 'Wipe Down Lounges with Soapy Water' },
  { id: '7', name: 'Wipe down door handles and light switches' },
  { id: '8', name: 'Wipe Down Kitchen Cupboards' },
  { id: '9', name: 'Pack sun bed mattresses & covers in gym area' },
  { id: '10', name: 'Tidy front and back of property with blower' },
  { id: '11', name: 'Weeding of garden beds' }
];

// Final checklist items
export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', name: 'Pack all outdoor cushions and covers in the shed & close roller door' },
  { id: '2', name: 'Lock the screen door & back door' },
  { id: '3', name: 'Place all devices, computers & walkie talkies on charge' },
  { id: '4', name: 'Turn off all lights and air conditioners' },
  { id: '5', name: 'Turn on the alarm' },
  { id: '6', name: 'Lock the front door and screen door' }
];

// Time slots for dropoffs/pickups/chores scheduling
export const TIME_SLOTS: TimeSlot[] = [
  { id: '1', startTime: '10:00', endTime: '10:30', displayTime: '10:00am - 10:30am' },
  { id: '2', startTime: '10:30', endTime: '11:00', displayTime: '10:30am - 11:00am' },
  { id: '3', startTime: '11:00', endTime: '11:30', displayTime: '11:00am - 11:30am' },
  { id: '4', startTime: '11:30', endTime: '12:00', displayTime: '11:30am - 12:00pm' },
  { id: '5', startTime: '12:00', endTime: '12:30', displayTime: '12:00pm - 12:30pm' },
  { id: '6', startTime: '12:30', endTime: '13:00', displayTime: '12:30pm - 1:00pm' },
  { id: '7', startTime: '13:00', endTime: '13:30', displayTime: '1:00pm - 1:30pm' },
  { id: '8', startTime: '13:30', endTime: '14:00', displayTime: '1:30pm - 2:00pm' },
  { id: '9', startTime: '14:00', endTime: '14:30', displayTime: '2:00pm - 2:30pm' }
];

// Twins FSO (Female Staff Only) slots – used for nappy changes in the Twins room.
// These correspond to TIME_SLOTS with IDs '3' (11:00–11:30) and '7' (13:00–13:30).
export const TWIN_FSO_TIME_SLOT_IDS: ID[] = ['3', '7'];
