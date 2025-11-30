import { supabase } from './supabase';
import type { ScheduleSnapshot } from '@/hooks/schedule-store';

// Single table for all schedules
const TABLE = 'schedules';

// Simple 6-digit share code
export function generateShareCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Local "YYYY-MM-DD"
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

  // We still keep a base date, but it's always "today"
  const baseDate = toLocalDateKey(new Date());

  const payload = {
    house,
    code,
    snapshot,
    // Optional: if you have a dedicated schedule_date column, uncomment:
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
    const savedSnapshot = data.snapshot as ScheduleSnapshot;

    // OPTION A: prefer the schedule's own local date if present
    const snapshotDate = savedSnapshot.date;
    const scheduleDate =
      snapshotDate || (createdAt && createdAt.slice(0, 10)) || baseDate;

    return {
      ok: true,
      data: {
        snapshot: savedSnapshot,
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
 */
export async function fetchLatestScheduleForHouse(house: string) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('snapshot, code, created_at')
      .eq('house', house)
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

    // OPTION A: use the schedule's own stored date if available
    const snapshotDate = snapshot.date;
    const scheduleDate =
      snapshotDate ||
      (createdAt && createdAt.slice(0, 10)) ||
      toLocalDateKey(new Date());

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
