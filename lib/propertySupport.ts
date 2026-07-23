import { supabase } from '@/lib/supabase';
import { normaliseSydneyDateKey } from '@/lib/sydneyDate';

const LOCATIONS_TABLE = 'property_locations';
const DAILY_TABLE = 'daily_property_support';
const DEFAULT_ASSIGNMENT_COUNT = 4;

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

export function emptyPropertySupportAssignments(
  count = DEFAULT_ASSIGNMENT_COUNT,
): PropertySupportAssignment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `property-support-${index + 1}`,
    propertyLocationId: '',
    staffIds: [],
    notes: '',
  }));
}

function normaliseAssignment(
  value: any,
  index: number,
): PropertySupportAssignment {
  return {
    id: String(value?.id || `property-support-${index + 1}`),
    propertyLocationId: String(
      value?.propertyLocationId || value?.property_location_id || '',
    ),
    staffIds: Array.isArray(value?.staffIds)
      ? value.staffIds.map(String)
      : Array.isArray(value?.staff_ids)
        ? value.staff_ids.map(String)
        : [],
    notes: String(value?.notes || ''),
  };
}

function hasAssignmentContent(assignment: PropertySupportAssignment) {
  return Boolean(
    assignment.propertyLocationId ||
      assignment.staffIds.length > 0 ||
      assignment.notes.trim(),
  );
}

function getAssignmentSlotIndex(id: string, count: number) {
  const match = String(id || '').match(/^property-support-(\d+)$/);
  if (!match) return -1;

  const index = Number(match[1]) - 1;
  return index >= 0 && index < count ? index : -1;
}

/**
 * Restores saved assignments to their permanent visual card positions.
 *
 * Supabase stores only populated assignments. Without restoring by ID, a
 * Participant Support assignment saved as property-support-3 can become the
 * first array item and incorrectly appear inside Property Support 1.
 */
export function restorePropertySupportAssignmentSlots(
  value: unknown,
  count = DEFAULT_ASSIGNMENT_COUNT,
): PropertySupportAssignment[] {
  const slots = emptyPropertySupportAssignments(count);
  if (!Array.isArray(value)) return slots;

  const occupiedSlots = new Set<number>();

  value
    .slice(0, count)
    .map(normaliseAssignment)
    .forEach((assignment) => {
      const preferredSlot = getAssignmentSlotIndex(assignment.id, count);
      const slotIndex =
        preferredSlot >= 0 && !occupiedSlots.has(preferredSlot)
          ? preferredSlot
          : slots.findIndex((_slot, index) => !occupiedSlots.has(index));

      if (slotIndex < 0) return;
      occupiedSlots.add(slotIndex);
      slots[slotIndex] = {
        ...assignment,
        id: `property-support-${slotIndex + 1}`,
      };
    });

  return slots;
}

/**
 * Produces the compact JSON payload stored in Supabase while preserving each
 * assignment's permanent card ID.
 */
export function normalisePropertySupportAssignments(
  value: unknown,
): PropertySupportAssignment[] {
  return restorePropertySupportAssignmentSlots(
    value,
    DEFAULT_ASSIGNMENT_COUNT,
  ).filter(hasAssignmentContent);
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

    if (error) {
      return {
        ok: false as const,
        error,
        data: [] as PropertyLocation[],
      };
    }

    return {
      ok: true as const,
      data: (data || []).map(mapLocation),
    };
  } catch (error) {
    return {
      ok: false as const,
      error,
      data: [] as PropertyLocation[],
    };
  }
}

export async function fetchPropertySupportForDate(
  house: string,
  supportDate: string,
) {
  const dateKey = normaliseSydneyDateKey(supportDate);

  try {
    const { data, error } = await supabase
      .from(DAILY_TABLE)
      .select('*')
      .eq('house', house)
      .eq('support_date', dateKey)
      .maybeSingle();

    if (error) return { ok: false as const, error, data: null };
    return {
      ok: true as const,
      data: data ? mapDailyRecord(data) : null,
    };
  } catch (error) {
    return { ok: false as const, error, data: null };
  }
}

export async function fetchPropertySupportData(
  house: string,
  supportDate: string,
) {
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

  // Canonicalise all four card IDs before compacting the payload. This makes
  // each individual tile stable even when one or more earlier cards are empty.
  const canonicalAssignments = restorePropertySupportAssignmentSlots(
    args.assignments,
    DEFAULT_ASSIGNMENT_COUNT,
  );

  const payload = {
    house: args.house,
    support_date: supportDate,
    assignments: canonicalAssignments.filter(hasAssignmentContent),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from(DAILY_TABLE)
      .upsert(payload, { onConflict: 'house,support_date' })
      .select('*')
      .single();

    if (error || !data) {
      return { ok: false as const, error, data: null };
    }

    return {
      ok: true as const,
      data: mapDailyRecord(data),
    };
  } catch (error) {
    return { ok: false as const, error, data: null };
  }
}
