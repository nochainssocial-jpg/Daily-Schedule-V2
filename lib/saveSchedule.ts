import { supabase } from '@/lib/supabase';
import type { ScheduleSnapshot } from '@/hooks/schedule-store';
import { getSydneyDateKey, normaliseSydneyDateKey } from '@/lib/sydneyDate';

const TABLE = 'schedules';
const PATCH_RPC = 'patch_daily_schedule_snapshot';

export type ScheduleRecord = {
  id: string;
  house: string;
  snapshot: ScheduleSnapshot;
  code: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  scheduleDate: string;
};

export type ScheduleRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown; data?: null; reason?: string };

// Retained only for compatibility with the current schedules table if code is NOT NULL.
// The application no longer exposes or relies on this value.
function generateLegacyCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function mapScheduleRow(row: any, fallbackDate?: string): ScheduleRecord {
  const snapshot = (row?.snapshot || {}) as ScheduleSnapshot;
  const createdAt = row?.created_at ? String(row.created_at) : null;
  const updatedAt = row?.updated_at ? String(row.updated_at) : null;
  const scheduleDate = normaliseSydneyDateKey(
    row?.schedule_date || snapshot.date || createdAt?.slice(0, 10) || fallbackDate,
  );

  return {
    id: String(row.id),
    house: String(row.house || ''),
    snapshot: { ...snapshot, date: scheduleDate },
    code: row?.code ? String(row.code) : null,
    createdAt,
    updatedAt,
    scheduleDate,
  };
}

const SCHEDULE_SELECT =
  'id, house, snapshot, code, created_at, updated_at, schedule_date';

export async function fetchScheduleForHouseAndDate(
  house: string,
  scheduleDate = getSydneyDateKey(),
): Promise<ScheduleRepositoryResult<ScheduleRecord | null>> {
  const dateKey = normaliseSydneyDateKey(scheduleDate);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(SCHEDULE_SELECT)
      .eq('house', house)
      .eq('schedule_date', dateKey)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[schedule] exact-date fetch failed', error);
      return { ok: false, error, data: null };
    }

    return { ok: true, data: data ? mapScheduleRow(data, dateKey) : null };
  } catch (error) {
    console.error('[schedule] exact-date fetch exception', error);
    return { ok: false, error, data: null };
  }
}

export async function createScheduleForDate(
  house: string,
  scheduleDate: string,
  snapshot: ScheduleSnapshot,
): Promise<ScheduleRepositoryResult<ScheduleRecord>> {
  const dateKey = normaliseSydneyDateKey(scheduleDate);
  const existing = await fetchScheduleForHouseAndDate(house, dateKey);

  if (!existing.ok) return existing as ScheduleRepositoryResult<ScheduleRecord>;
  if (existing.data) {
    return {
      ok: false,
      error: new Error('A schedule already exists for this location and date.'),
      reason: 'already_exists',
      data: null,
    };
  }

  const snapshotWithDate: ScheduleSnapshot = {
    ...snapshot,
    date: dateKey,
    outingGroups: [],
    outingGroup: null,
  };

  const payload = {
    house,
    code: generateLegacyCode(),
    snapshot: snapshotWithDate,
    schedule_date: dateKey,
  };

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select(SCHEDULE_SELECT)
      .single();

    if (error || !data) {
      console.error('[schedule] create failed', error);
      return { ok: false, error: error || new Error('Schedule create failed'), data: null };
    }

    return { ok: true, data: mapScheduleRow(data, dateKey) };
  } catch (error) {
    console.error('[schedule] create exception', error);
    return { ok: false, error, data: null };
  }
}

export async function updateScheduleById(args: {
  scheduleId: string;
  house: string;
  scheduleDate: string;
  snapshot: ScheduleSnapshot;
}): Promise<ScheduleRepositoryResult<ScheduleRecord>> {
  const dateKey = normaliseSydneyDateKey(args.scheduleDate);
  const snapshot = {
    ...args.snapshot,
    date: dateKey,
    outingGroups: [],
    outingGroup: null,
  } as ScheduleSnapshot;

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ snapshot, schedule_date: dateKey })
      .eq('id', args.scheduleId)
      .eq('house', args.house)
      .eq('schedule_date', dateKey)
      .select(SCHEDULE_SELECT)
      .single();

    if (error || !data) {
      return { ok: false, error: error || new Error('Schedule update failed'), data: null };
    }

    return { ok: true, data: mapScheduleRow(data, dateKey) };
  } catch (error) {
    return { ok: false, error, data: null };
  }
}

async function fallbackPatchSchedule(args: {
  scheduleId: string;
  house: string;
  scheduleDate: string;
  patch: Partial<ScheduleSnapshot>;
}): Promise<ScheduleRepositoryResult<ScheduleRecord>> {
  const dateKey = normaliseSydneyDateKey(args.scheduleDate);

  // Retry once if another editor changes the row between read and update.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: current, error: readError } = await supabase
      .from(TABLE)
      .select(SCHEDULE_SELECT)
      .eq('id', args.scheduleId)
      .eq('house', args.house)
      .eq('schedule_date', dateKey)
      .single();

    if (readError || !current) {
      return { ok: false, error: readError || new Error('Active schedule was not found'), data: null };
    }

    const currentRecord = mapScheduleRow(current, dateKey);
    const mergedSnapshot = {
      ...currentRecord.snapshot,
      ...args.patch,
      date: dateKey,
      outingGroups: [],
      outingGroup: null,
    } as ScheduleSnapshot;

    let updateQuery = supabase
      .from(TABLE)
      .update({ snapshot: mergedSnapshot, schedule_date: dateKey })
      .eq('id', args.scheduleId)
      .eq('house', args.house)
      .eq('schedule_date', dateKey);

    if (currentRecord.updatedAt) {
      updateQuery = updateQuery.eq('updated_at', currentRecord.updatedAt);
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select(SCHEDULE_SELECT);

    if (updateError) return { ok: false, error: updateError, data: null };
    if (updatedRows && updatedRows.length === 1) {
      return { ok: true, data: mapScheduleRow(updatedRows[0], dateKey) };
    }
  }

  return {
    ok: false,
    error: new Error('The schedule changed on another device. Reload and try again.'),
    reason: 'conflict',
    data: null,
  };
}

export async function patchScheduleById(args: {
  scheduleId: string;
  house: string;
  scheduleDate: string;
  patch: Partial<ScheduleSnapshot>;
}): Promise<ScheduleRepositoryResult<ScheduleRecord>> {
  const dateKey = normaliseSydneyDateKey(args.scheduleDate);
  const safePatch = { ...args.patch } as any;

  // Outings must never be merged into the daily schedule row.
  delete safePatch.outingGroups;
  delete safePatch.outingGroup;
  delete safePatch.outingAutoResetEnabled;
  delete safePatch.outingLastAutoResetDate;
  delete safePatch.date;

  try {
    const { data, error } = await supabase.rpc(PATCH_RPC, {
      p_schedule_id: args.scheduleId,
      p_house: args.house,
      p_schedule_date: dateKey,
      p_patch: safePatch,
    });

    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) return { ok: true, data: mapScheduleRow(row, dateKey) };
    }

    // The testing branch can run before the SQL migration is applied.
    // Fall back to an optimistic read/merge/update path in that case.
    if (error) {
      console.warn('[schedule] patch RPC unavailable; using compatibility fallback', error);
    }
    return fallbackPatchSchedule({ ...args, scheduleDate: dateKey, patch: safePatch });
  } catch (error) {
    console.warn('[schedule] patch RPC exception; using compatibility fallback', error);
    return fallbackPatchSchedule({ ...args, scheduleDate: dateKey, patch: safePatch });
  }
}

/**
 * Legacy helper retained for historical reporting/import code only.
 * Operational screens must use fetchScheduleForHouseAndDate().
 */
export async function fetchLatestScheduleForHouse(house: string) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(SCHEDULE_SELECT)
      .eq('house', house)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false as const, error, data: null };
    return { ok: true as const, data: data ? mapScheduleRow(data) : null };
  } catch (error) {
    return { ok: false as const, error, data: null };
  }
}

/** @deprecated Use createScheduleForDate or patchScheduleById. */
export async function saveScheduleToSupabase(house: string, snapshot: ScheduleSnapshot) {
  return createScheduleForDate(house, normaliseSydneyDateKey(snapshot.date), snapshot);
}
