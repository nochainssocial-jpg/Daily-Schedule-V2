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

  // Prefer whatever the wizard/store set, otherwise today's local date
  const baseDate =
    (snapshot.date && snapshot.date.slice(0, 10)) || toLocalDateKey(new Date());

  const payload = {
    house,
    code,
    snapshot,
    // If you later add a schedule_date column, you can wire this in:
    // schedule_date: baseDate,
  };

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('snapshot, code, created_at, seq_id')
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
        code: (data.code as string | null) ?? null,
        createdAt,
        scheduleDate, // "YYYY-MM-DD"
        seqId: (data.seq_id as number | null) ?? null,
      },
    };
  } catch (error) {
    console.error('Supabase save exception:', error);
    return { ok: false, error };
  }
}

/**
 * Fetch the most recent schedule for a given house.
 * Uses seq_id (auto-increment identity) to guarantee "latest row".
 */
export async function fetchLatestScheduleForHouse(house: string) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('snapshot, code, created_at, seq_id')
      .eq('house', house)
      .order('seq_id', { ascending: false }) // ✅ newest schedule first
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
        code: (data.code as string | null) ?? null,
        createdAt,
        scheduleDate, // "YYYY-MM-DD"
        seqId: (data.seq_id as number | null) ?? null,
      },
    };
  } catch (error) {
    console.error('Supabase fetch latest exception:', error);
    return { ok: false, error };
  }
}
