import { supabase } from '@/lib/supabase';
import { normaliseSydneyDateKey } from '@/lib/sydneyDate';

const LOCATIONS_TABLE = 'property_locations';
const DAILY_TABLE = 'daily_property_support';

export type PropertyLocation = {
  id: string;
  house: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type PropertySupportAssignment = {
  id: string;
  propertyLocationId: string;
  staffIds: string[];
  notes: string;
};

export type DailyPropertySupportRecord = {
  id: string;
  house: string;
  supportDate: string;
  assignments: PropertySupportAssignment[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function emptyPropertySupportAssignments(count = 4): PropertySupportAssignment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `property-support-${index + 1}`,
    propertyLocationId: '',
    staffIds: [],
    notes: '',
  }));
}

function normaliseAssignment(value: any, index: number): PropertySupportAssignment {
  return {
    id: String(value?.id || `property-support-${index + 1}`),
    propertyLocationId: String(value?.propertyLocationId || value?.property_location_id || ''),
    staffIds: Array.isArray(value?.staffIds)
      ? value.staffIds.map(String)
      : Array.isArray(value?.staff_ids)
        ? value.staff_ids.map(String)
        : [],
    notes: String(value?.notes || ''),
  };
}

export function normalisePropertySupportAssignments(value: unknown): PropertySupportAssignment[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 4)
    .map(normaliseAssignment)
    .filter(
      (assignment) =>
        Boolean(assignment.propertyLocationId) ||
        assignment.staffIds.length > 0 ||
        Boolean(assignment.notes.trim()),
    );
}

function mapLocation(row: any): PropertyLocation {
  return {
    id: String(row.id),
    house: String(row.house),
    name: String(row.name || ''),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapDailyRecord(row: any): DailyPropertySupportRecord {
  return {
    id: String(row.id),
    house: String(row.house),
    supportDate: String(row.support_date),
    assignments: normalisePropertySupportAssignments(row.assignments),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export async function fetchPropertyLocations(house: string) {
  try {
    const { data, error } = await supabase
      .from(LOCATIONS_TABLE)
      .select('*')
      .eq('house', house)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) return { ok: false as const, error, data: [] as PropertyLocation[] };
    return { ok: true as const, data: (data || []).map(mapLocation) };
  } catch (error) {
    return { ok: false as const, error, data: [] as PropertyLocation[] };
  }
}

export async function fetchPropertySupportForDate(house: string, supportDate: string) {
  const dateKey = normaliseSydneyDateKey(supportDate);

  try {
    const { data, error } = await supabase
      .from(DAILY_TABLE)
      .select('*')
      .eq('house', house)
      .eq('support_date', dateKey)
      .maybeSingle();

    if (error) return { ok: false as const, error, data: null };
    return { ok: true as const, data: data ? mapDailyRecord(data) : null };
  } catch (error) {
    return { ok: false as const, error, data: null };
  }
}

export async function fetchPropertySupportData(house: string, supportDate: string) {
  const [locationsResult, supportResult] = await Promise.all([
    fetchPropertyLocations(house),
    fetchPropertySupportForDate(house, supportDate),
  ]);

  if (!locationsResult.ok) {
    return {
      ok: false as const,
      error: locationsResult.error,
      locations: [] as PropertyLocation[],
      record: null as DailyPropertySupportRecord | null,
    };
  }

  if (!supportResult.ok) {
    return {
      ok: false as const,
      error: supportResult.error,
      locations: locationsResult.data,
      record: null as DailyPropertySupportRecord | null,
    };
  }

  return {
    ok: true as const,
    locations: locationsResult.data,
    record: supportResult.data,
  };
}

export async function savePropertySupportForDate(args: {
  house: string;
  supportDate: string;
  assignments: PropertySupportAssignment[];
}) {
  const supportDate = normaliseSydneyDateKey(args.supportDate);
  const payload = {
    house: args.house,
    support_date: supportDate,
    assignments: normalisePropertySupportAssignments(args.assignments),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from(DAILY_TABLE)
      .upsert(payload, { onConflict: 'house,support_date' })
      .select('*')
      .single();

    if (error || !data) return { ok: false as const, error, data: null };
    return { ok: true as const, data: mapDailyRecord(data) };
  } catch (error) {
    return { ok: false as const, error, data: null };
  }
}
