import { supabase } from './supabase';
import type { ScheduleSnapshot } from '@/hooks/schedule-store';

// Single table for all schedules
const TABLE = 'schedules';

// Simple 6-digit share code
export function generateShareCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Local "YYYY-MM-DD" using the device's local time (AUS on your machines)
function toLocalDateKey(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Insert a schedule into Supabase and return a share code + metadata.
 */
export async function saveScheduleToSupabase(
  house: string,
  snapshot: ScheduleSnapshot
) {
  const code = generateShareCode();

  // Prefer whatever the wizard/store set, otherwise today's local date
  const baseDate =
    (snapshot.date && snapshot.date.slice(0, 10)) || toLocalDateKey(new Date());

  const payload = {
    house,
    code,
    snapshot,
    // Optional: if you add a dedicated schedule_date column, you can keep this:
    // schedule_date: baseDate,
  };

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('snapshot, code, created_at')
      .single();

    if (error || !data) {
      console.error('Supabase save error:', error);
      return { ok: false, error };
    }

    const createdAt = data.created_at as string | null;
    const scheduleDate =
      (snapshot.date && snapshot.date.slice(0, 10)) ||
      (createdAt ? createdAt.slice(0, 10) : baseDate);

    return {
      ok: true,
      data: {
        snapshot: data.snapshot as ScheduleSnapshot,
        code: data.code as string | null,
        createdAt,
        scheduleDate, // "YYYY-MM-DD"
      },
    };
  } catch (error) {
    console.error('Supabase save exception:', error);
    return { ok: false, error };
  }
}

/**
 * Fetch the most recent schedule for a given house.
 *
 * NOTE:
 *  - We accept an optional todayKey so existing calls
 *    `fetchLatestScheduleForHouse(houseId, todayKey)` still type-check.
 */
export async function fetchLatestScheduleForHouse(
  house: string,
  _todayKey?: string
) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('snapshot, code, created_at, updated_at')
      .eq('house', house)
      // Always prefer the most recently updated row, then fall back to newest created
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase fetch latest error:', error);
      return { ok: false, error };
    }

    if (!data) {
      // No schedule yet for this house
      return { ok: true, data: null };
    }

    const snapshot = data.snapshot as ScheduleSnapshot;
    const createdAt = data.created_at as string | null;

    const scheduleDate =
      (snapshot.date && snapshot.date.slice(0, 10)) ||
      (createdAt ? createdAt.slice(0, 10) : toLocalDateKey(new Date()));

    return {
      ok: true,
      data: {
        snapshot,
        code: data.code as string | null,
        createdAt,
        scheduleDate, // "YYYY-MM-DD"
      },
    };
  } catch (error) {
    console.error('Supabase fetch latest exception:', error);
    return { ok: false, error };
  }
}
