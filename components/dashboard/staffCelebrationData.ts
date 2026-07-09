import type { StaffPhotoKey } from "./staffPhotoAssets";

export type StaffCelebrationKind = "birthday" | "milestone";

export type StaffCelebrationSeed = {
  firstName: string;
  preferredName?: string;
  lastName?: string;
  birthday?: string | null;
  employmentStartDate?: string | null;
  photoKey?: StaffPhotoKey | null;
};

export type StaffCelebrationItem = {
  id: string;
  staffId: string;
  displayName: string;
  firstName: string;
  kind: StaffCelebrationKind;
  eventDate: Date;
  eventDateKey: string;
  daysAway: number;
  years?: number;
  photoKey?: StaffPhotoKey | null;
  photoUrl?: string | null;
  label: string;
  title: string;
  message: string;
};

export const STAFF_CELEBRATION_SEED: StaffCelebrationSeed[] = [
  {
    "firstName": "Bruno",
    "preferredName": "Bruno",
    "lastName": "Pouzet",
    "birthday": "1970-01-15",
    "employmentStartDate": "2020-01-01",
    "photoKey": "Bruno"
  },
  {
    "firstName": "Antoinette",
    "preferredName": "Antoinette",
    "lastName": "Bechara",
    "birthday": "1971-05-12",
    "employmentStartDate": "2021-12-12",
    "photoKey": "Antoinette"
  },
  {
    "firstName": "Jamie",
    "preferredName": "Jamie",
    "lastName": "Abraham",
    "birthday": "1975-05-19",
    "employmentStartDate": "2021-12-06",
    "photoKey": "Jamie"
  },
  {
    "firstName": "Jessica",
    "preferredName": "Jessica",
    "lastName": "Awad",
    "birthday": "1996-05-20",
    "employmentStartDate": "2020-01-01",
    "photoKey": "Jessica"
  },
  {
    "firstName": "Charlie",
    "preferredName": "Charlie",
    "lastName": "Murphy",
    "birthday": "1965-12-01",
    "employmentStartDate": "2021-09-15",
    "photoKey": "Charlie"
  },
  {
    "firstName": "Theresia",
    "preferredName": "Theresia",
    "lastName": "Touma",
    "birthday": "1999-05-21",
    "employmentStartDate": "2020-04-17",
    "photoKey": "Theresia"
  },
  {
    "firstName": "William",
    "preferredName": "William",
    "lastName": "Rudder",
    "birthday": "2003-05-25",
    "employmentStartDate": "2021-12-06",
    "photoKey": "William"
  },
  {
    "firstName": "Maray",
    "preferredName": "Maray",
    "lastName": "Ibrahim",
    "birthday": "2003-01-06",
    "employmentStartDate": "2021-01-30",
    "photoKey": "Maray"
  },
  {
    "firstName": "Michelle",
    "preferredName": "Michelle",
    "lastName": "Pouzet",
    "birthday": "1970-09-16",
    "employmentStartDate": "2020-01-01",
    "photoKey": "Michelle"
  },
  {
    "firstName": "Dalida",
    "preferredName": "Dalida",
    "lastName": "Dagher",
    "birthday": "1965-09-10",
    "employmentStartDate": "2020-01-01",
    "photoKey": "Dalida"
  },
  {
    "firstName": "Peter",
    "preferredName": "Peter",
    "lastName": "Trad",
    "birthday": "1985-05-14",
    "employmentStartDate": "2022-05-06",
    "photoKey": "Peter"
  },
  {
    "firstName": "Marianne",
    "preferredName": "Marianne",
    "lastName": "Dagher",
    "birthday": "2002-05-20",
    "employmentStartDate": "2022-09-05",
    "photoKey": "Marianne"
  },
  {
    "firstName": "George",
    "preferredName": "George",
    "lastName": "Rudder",
    "birthday": "2001-12-17",
    "employmentStartDate": "2023-05-29",
    "photoKey": "George"
  },
  {
    "firstName": "Mary",
    "preferredName": "Mary",
    "lastName": "Ibrahim",
    "birthday": "1972-07-10",
    "employmentStartDate": "2024-01-10",
    "photoKey": "Mary"
  },
  {
    "firstName": "Mikaela",
    "preferredName": "Mikaela",
    "lastName": "Nader",
    "birthday": "2005-12-21",
    "employmentStartDate": "2024-03-18",
    "photoKey": "Mikaela"
  },
  {
    "firstName": "Juliet",
    "preferredName": "Juliet",
    "lastName": "Tafiti",
    "birthday": "1985-08-10",
    "employmentStartDate": "2024-04-02",
    "photoKey": "Juliet"
  },
  {
    "firstName": "Tayla",
    "preferredName": "Tayla",
    "lastName": "Abraham",
    "birthday": "1997-01-28",
    "employmentStartDate": "2024-04-10",
    "photoKey": "Tayla"
  },
  {
    "firstName": "Readium",
    "preferredName": "Readium",
    "lastName": "Sharma Bhusal",
    "birthday": "2000-11-04",
    "employmentStartDate": "2024-05-20",
    "photoKey": "Readium"
  },
  {
    "firstName": "Crystal",
    "preferredName": "Crystal",
    "lastName": "Sid",
    "birthday": "2002-11-04",
    "employmentStartDate": "2024-07-11",
    "photoKey": "Crystal"
  },
  {
    "firstName": "Charbel",
    "preferredName": "Charbel",
    "lastName": "Nakhoul",
    "birthday": "1996-05-06",
    "employmentStartDate": "2024-09-10",
    "photoKey": "Charbel"
  },
  {
    "firstName": "Antonia",
    "preferredName": "Antonia",
    "lastName": "Baskerville",
    "birthday": "2001-07-18",
    "employmentStartDate": "2024-10-14",
    "photoKey": "Antonia"
  },
  {
    "firstName": "Gabriel",
    "preferredName": "Gabriel",
    "lastName": "Fantaye",
    "birthday": "1964-03-07",
    "employmentStartDate": "2024-10-01",
    "photoKey": "Gabriel"
  },
  {
    "firstName": "Anita",
    "preferredName": "Anita",
    "lastName": "Georges",
    "birthday": "2004-06-09",
    "employmentStartDate": "2024-11-20",
    "photoKey": "Anita"
  },
  {
    "firstName": "Temalesi",
    "preferredName": "Temalesi",
    "lastName": "Rossiter",
    "birthday": "2006-11-24",
    "employmentStartDate": "2025-01-06",
    "photoKey": "Tema"
  },
  {
    "firstName": "Isabella",
    "preferredName": "Isabella",
    "lastName": "Abraham",
    "birthday": "2000-05-17",
    "employmentStartDate": "2025-02-17",
    "photoKey": "Isabella"
  },
  {
    "firstName": "Rebecca",
    "preferredName": "Rebecca",
    "lastName": "Ibrahim",
    "birthday": "1985-11-09",
    "employmentStartDate": "2025-02-20",
    "photoKey": "Rebecca"
  },
  {
    "firstName": "Liana",
    "preferredName": "Liana",
    "lastName": "Haddad",
    "birthday": "2004-08-21",
    "employmentStartDate": "2025-04-21",
    "photoKey": "Liana"
  },
  {
    "firstName": "Merna",
    "preferredName": "Merna",
    "lastName": "Abraham",
    "birthday": "1973-12-06",
    "employmentStartDate": "2025-04-16",
    "photoKey": "Merna"
  },
  {
    "firstName": "Princess",
    "preferredName": "Princess",
    "lastName": "Agyemang",
    "birthday": "2005-06-24",
    "employmentStartDate": "2025-05-12",
    "photoKey": "Princess"
  },
  {
    "firstName": "Tsadkan (Liya)",
    "preferredName": "Liya",
    "lastName": "Hagos",
    "birthday": "1991-11-12",
    "employmentStartDate": "2025-07-14",
    "photoKey": "Liya"
  },
  {
    "firstName": "Violet",
    "preferredName": "Violet",
    "lastName": "El-Hage",
    "birthday": "1978-03-09",
    "employmentStartDate": "2025-10-13",
    "photoKey": "Violet"
  },
  {
    "firstName": "Claudette",
    "preferredName": "Claudette",
    "lastName": "Halabi",
    "birthday": "1974-04-14",
    "employmentStartDate": "2025-10-27",
    "photoKey": "Claudette"
  },
  {
    "firstName": "Natalie",
    "preferredName": "Natalie",
    "lastName": "Halabi",
    "birthday": "2002-08-29",
    "employmentStartDate": "2025-12-08",
    "photoKey": "Natalie"
  },
  {
    "firstName": "Mary Anne",
    "preferredName": "Mary Anne",
    "lastName": "Azize",
    "birthday": "1966-08-31",
    "employmentStartDate": "2026-01-27",
    "photoKey": null
  },
  {
    "firstName": "Gilda",
    "preferredName": "Gilda",
    "lastName": "Epenian",
    "birthday": "1965-06-25",
    "employmentStartDate": "2026-01-26",
    "photoKey": "Gilda"
  },
  {
    "firstName": "Miraye",
    "preferredName": "Miraye",
    "lastName": "Nicolas",
    "birthday": "1991-06-23",
    "employmentStartDate": "2026-02-02",
    "photoKey": "Miraye"
  },
  {
    "firstName": "Ahlam",
    "preferredName": "Ahlam",
    "lastName": "Abbas",
    "birthday": "2026-03-30",
    "employmentStartDate": "2026-05-05",
    "photoKey": null
  },
  {
    "firstName": "Eliana",
    "preferredName": "Eliana",
    "lastName": "Said",
    "birthday": "1992-12-15",
    "employmentStartDate": "2026-07-06",
    "photoKey": "Eliana"
  }
];

const STAFF_CELEBRATION_ALIASES: Record<string, string> = {
  liya: "tsadkan liya",
  "tsadkan liya": "tsadkan liya",
  tema: "temalesi",
};

function normalizeName(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SEED_BY_NAME = new Map<string, StaffCelebrationSeed>();

STAFF_CELEBRATION_SEED.forEach((seed) => {
  const keys = [
    seed.firstName,
    seed.preferredName || "",
    `${seed.firstName} ${seed.lastName || ""}`,
    `${seed.preferredName || ""} ${seed.lastName || ""}`,
  ];

  keys.forEach((key) => {
    const normalised = normalizeName(key);
    if (normalised && !SEED_BY_NAME.has(normalised)) {
      SEED_BY_NAME.set(normalised, seed);
    }
  });
});

function resolveSeed(staffMember: any): StaffCelebrationSeed | null {
  const rawName = String(staffMember?.name || "").trim();
  const normalised = normalizeName(rawName);
  const alias = STAFF_CELEBRATION_ALIASES[normalised] || normalised;

  if (SEED_BY_NAME.has(alias)) return SEED_BY_NAME.get(alias) || null;

  const firstToken = normalizeName(rawName.split(/\s+/)[0] || "");
  const firstAlias = STAFF_CELEBRATION_ALIASES[firstToken] || firstToken;
  return SEED_BY_NAME.get(firstAlias) || null;
}

function parseISODate(value?: string | null): { year: number; month: number; day: number } | null {
  const raw = String(value || "").slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfToday(today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function nextAnnualDate(value?: string | null, today = new Date()): Date | null {
  const parsed = parseISODate(value);
  if (!parsed) return null;

  const todayStart = startOfToday(today);
  let eventDate = new Date(todayStart.getFullYear(), parsed.month - 1, parsed.day);

  if (eventDate.getTime() < todayStart.getTime()) {
    eventDate = new Date(todayStart.getFullYear() + 1, parsed.month - 1, parsed.day);
  }

  return eventDate;
}

function diffDays(date: Date, today = new Date()): number {
  const todayStart = startOfToday(today);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target.getTime() - todayStart.getTime()) / 86400000);
}

function deterministicIndex(seed: string, length: number): number {
  if (length <= 1) return 0;
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) total += seed.charCodeAt(i);
  return total % length;
}

function birthdayMessage(firstName: string, seed: string): string {
  const variants = [
    "Wishing you a wonderful day from everyone at No Chains.",
    "Hope your day is full of smiles, kindness and celebration.",
    "Birthday cheers from the whole No Chains team.",
  ];
  return variants[deterministicIndex(`${seed}-birthday`, variants.length)].replace(/\{firstName\}/g, firstName);
}

function milestoneMessage(firstName: string, years: number, seed: string): string {
  const yearLabel = years === 1 ? "year" : "years";
  const variants = [
    `Celebrating ${years} ${yearLabel} with No Chains today.`,
    `Thank you for ${years} ${yearLabel} of care, teamwork and heart.`,
    `Work anniversary cheers for ${years} wonderful ${yearLabel} with No Chains.`,
  ];
  return variants[deterministicIndex(`${seed}-milestone`, variants.length)].replace(/\{firstName\}/g, firstName);
}

export function buildStaffCelebrationItems(
  staff: any[] = [],
  tick: number,
  windowDays = 45,
  today = new Date(),
): StaffCelebrationItem[] {
  void tick;
  const items: StaffCelebrationItem[] = [];

  (staff || []).forEach((member) => {
    if (!member) return;
    if (member.is_active === false || member.isActive === false) return;
    if (member.celebrationsVisible === false || member.celebrations_visible === false) return;

    const seed = resolveSeed(member);
    const displayName = String(member.name || seed?.preferredName || seed?.firstName || "").trim();
    if (!displayName || displayName.toLowerCase() === "everyone" || displayName.toLowerCase() === "audit") return;

    const firstName =
      String(member.preferredName || seed?.preferredName || displayName.split(/\s+/)[0] || displayName).trim();

    const birthday = member.birthday || member.birth_date || member.date_of_birth || seed?.birthday || null;
    const employmentStartDate =
      member.employmentStartDate ||
      member.employment_start_date ||
      member.start_date ||
      member.hire_date ||
      seed?.employmentStartDate ||
      null;
    const photoKey = (member.photoKey || member.photo_key || seed?.photoKey || null) as StaffPhotoKey | null;
    const photoUrl = member.photoUrl || member.photo_url || null;

    const birthdayDate = nextAnnualDate(birthday, today);
    if (birthdayDate) {
      const daysAway = diffDays(birthdayDate, today);
      if (daysAway >= 0 && daysAway <= windowDays) {
        items.push({
          id: `${String(member.id)}-birthday-${dateKey(birthdayDate)}`,
          staffId: String(member.id),
          displayName,
          firstName,
          kind: "birthday",
          eventDate: birthdayDate,
          eventDateKey: dateKey(birthdayDate),
          daysAway,
          photoKey,
          photoUrl,
          label: "Happy Birthday",
          title: `Happy Birthday, ${firstName}!`,
          message: birthdayMessage(firstName, displayName),
        });
      }
    }

    const startDate = parseISODate(employmentStartDate);
    const milestoneDate = nextAnnualDate(employmentStartDate, today);
    if (startDate && milestoneDate) {
      const years = milestoneDate.getFullYear() - startDate.year;
      const daysAway = diffDays(milestoneDate, today);

      if (years >= 1 && daysAway >= 0 && daysAway <= windowDays) {
        const yearLabel = years === 1 ? "Year" : "Years";
        items.push({
          id: `${String(member.id)}-milestone-${dateKey(milestoneDate)}`,
          staffId: String(member.id),
          displayName,
          firstName,
          kind: "milestone",
          eventDate: milestoneDate,
          eventDateKey: dateKey(milestoneDate),
          daysAway,
          years,
          photoKey,
          photoUrl,
          label: `${years} ${yearLabel}`,
          title: `Congratulations, ${firstName}!`,
          message: milestoneMessage(firstName, years, displayName),
        });
      }
    }
  });

  return items.sort((a, b) => {
    if (a.daysAway !== b.daysAway) return a.daysAway - b.daysAway;
    if (a.kind !== b.kind) return a.kind === "birthday" ? -1 : 1;
    return a.firstName.localeCompare(b.firstName, "en-AU");
  });
}

export function splitStaffCelebrations(items: StaffCelebrationItem[]): {
  today: StaffCelebrationItem[];
  upcoming: StaffCelebrationItem[];
} {
  return {
    today: items.filter((item) => item.daysAway === 0),
    upcoming: items.filter((item) => item.daysAway > 0),
  };
}

export function celebrationDateLabel(item: StaffCelebrationItem): string {
  if (item.daysAway === 0) return "Today";
  if (item.daysAway === 1) return "Tomorrow";

  return item.eventDate.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}
