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
'#FF6FB3', '#4A90E2'
];

export const STAFF: Staff[] = [
  { id: '01', name: 'Anita', phone: '+61497971799', color: '#FF6FB3', gender: 'female' },
  { id: '02', name: 'Antonia', phone: '+61478587297', color: '#FF6FB3', gender: 'female' },
  { id: '03', name: 'Antoinette', phone: '+61413459797', color: '#FF6FB3', gender: 'female' },
  { id: '04', name: 'Aschal', phone: '+61415581910', color: '#FF6FB3', gender: 'female' },
  { id: '05', name: 'Benoit', phone: '+61414881677', color: '#4A90E2', gender: 'male' },
  { id: '06', name: 'Bruno', phone: '+61450085380', color: '#4A90E2', gender: 'male' },
  { id: '07', name: 'Charlie', phone: '+61420888775', color: '#4A90E2', gender: 'male' },
  { id: '08', name: 'Chelsea', phone: '+61426263477', color: '#FF6FB3', gender: 'female' },
  { id: '09', name: 'Charbel', phone: '+61421596951', color: '#4A90E2', gender: 'male' },
  { id: '10', name: 'Claudette', phone: '+61406654344', color: '#FF6FB3', gender: 'female' },
  { id: '11', name: 'Crystal', phone: '+61404661344', color: '#FF6FB3', gender: 'female' },
  { id: '12', name: 'Dalida', phone: '+61433331313', color: '#FF6FB3', gender: 'female' },
  { id: '13', name: 'Gabriel', phone: '+61478017933', color: '#4A90E2', gender: 'male' },
  { id: '14', name: 'George', phone: '+61422421458', color: '#4A90E2', gender: 'male' },
  { id: '15', name: 'Iqra', phone: '+61480391757', color: '#FF6FB3', gender: 'female' },  
  { id: '16', name: 'Isabella', phone: '+61401619414', color: '#FF6FB3', gender: 'female' },
  { id: '17', name: 'Jamie', phone: '+61424785915', color: '#FF6FB3', gender: 'female' },
  { id: '18', name: 'Jessica', phone: '+61404215414', color: '#FF6FB3', gender: 'female' },
  { id: '19', name: 'Juliet', phone: '+61412195636', color: '#FF6FB3', gender: 'female' },
  { id: '20', name: 'Liana', phone: '+61451722117', color: '#FF6FB3', gender: 'female' },
  { id: '21', name: 'Maray', phone: '+61431633378', color: '#FF6FB3', gender: 'female' },
  { id: '22', name: 'Marianne', phone: '+61422049434', color: '#FF6FB3', gender: 'female' },
  { id: '23', name: 'Mary', phone: '+61410479483', color: '#FF6FB3', gender: 'female' },
  { id: '24', name: 'Merna', phone: '+61432475693', color: '#FF6FB3', gender: 'female' },
  { id: '25', name: 'Michelle', phone: '+61414540967', color: '#FF6FB3', gender: 'female' },
  { id: '26', name: 'Mikaela', phone: '+61452622144', color: '#FF6FB3', gender: 'female' },
  { id: '27', name: 'Paneta', phone: '+61450430147', color: '#FF6FB3', gender: 'female' },
  { id: '28', name: 'Natalie', phone: '+61401619414', color: '#FF6FB3', gender: 'female' },
  { id: '29', name: 'Patty', phone: '+61450274771', color: '#FF6FB3', gender: 'female' },
  { id: '30', name: 'Princess', phone: '+61406496101', color: '#FF6FB3', gender: 'female' },
  { id: '31', name: 'Rahel', phone: '+61450700030', color: '#FF6FB3', gender: 'female' },
  { id: '32', name: 'Rebecca', phone: '+61420526656', color: '#FF6FB3', gender: 'female' },
  { id: '33', name: 'Readium', phone: '+61426800430', color: '#FF6FB3', gender: 'female' },
  { id: '34', name: 'Tayla', phone: '+61423798141', color: '#FF6FB3', gender: 'female' },
  { id: '35', name: 'Temalesi', phone: '+61413347966', color: '#FF6FB3', gender: 'female' },
  { id: '36', name: 'Theresia', phone: '+61414396769', color: '#FF6FB3', gender: 'female' },
  { id: '37', name: 'Tsadkan (Liya)', phone: '+61404147070', color: '#FF6FB3', gender: 'female' },
  { id: '38', name: 'Violet', phone: '+61404391757', color: '#FF6FB3', gender: 'female' },
  { id: '39', name: 'William', phone: '+61451556225', color: '#4A90E2', gender: 'male' },

  // Special system entries:
  { id: '1003', name: 'Audit', color: '#9B9B9B', gender: 'other' },
  { id: '1002', name: 'Drive/Outing', color: '#9B9B9B', gender: 'other' },
  { id: '1001', name: 'Everyone', color: '#9B9B9B', gender: 'other' },
];

export const PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Ayaz' },
  { id: '2', name: 'Billy' },
  { id: '3', name: 'Brian' },
  { id: '4', name: 'Diana' },
  { id: '5', name: 'Elias' },
  { id: '6', name: 'Gemana' },
  { id: '7', name: 'Jacob' },
  { id: '8', name: 'Jimmy' },
  { id: '9', name: 'Jessica' },
  { id: '10', name: 'Julian' },
  { id: '11', name: 'Maher' },
  { id: '12', name: 'Naveed' },
  { id: '13', name: 'Paul' },
  { id: '14', name: 'Peter' },
  { id: '15', name: 'Reema' },
  { id: '16', name: 'Saim' },
  { id: '17', name: 'Scott' },
  { id: '18', name: 'Shatha' },
  { id: '19', name: 'Sumera' },
  { id: '20', name: 'Tiffany' },
  { id: '21', name: 'Zara' },
  { id: '22', name: 'Zoya' },
];

export const DROPOFF_OPTIONS: Record<ID, string[]> = {
  // Billy (id: '2')
  '2': [
    'Billy → Home (B1)',
    'Billy → Melina\'s',
    'Billy → Michael\'s',
  ],
  // Reema (id: '15')
  '15': [
    'Reema → Home',
    'Reema → Dinner @ Mancini\'s',
  ],
};

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
  { id: '9', name: 'Tidy front and back of property with blower' },
  { id: '10', name: 'Take red domestic and recycling bin to front of property - (Monday Afternoons)' },
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

// Rooms used in the Floating Assignments table (one column per room).
export const FLOATING_ROOMS = [
  { id: 'front', label: 'Front Room' },
  { id: 'scotty', label: 'Scotty' },
  { id: 'twins', label: 'Twins' },
];
