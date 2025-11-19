import { supabase } from './supabase';
import type { ScheduleSnapshot } from '@/hooks/schedule-store';

// Generates a simple 6-digit code (e.g. 482193)
export function generateShareCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Insert a schedule into Supabase and return a share code.
 */
export async function saveScheduleToSupabase(
  house: string,
  snapshot: ScheduleSnapshot
) {
  const code = generateShareCode();

  try {
    const { error } = await supabase.from('schedules').insert({
      house,
      snapshot,
      code,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      // Even if Supabase failed, return the code so the UI can still use it
      return { ok: false, error, code };
    }

    return { ok: true, code };
  } catch (error) {
    console.error('Supabase insert error:', error);
    // Network / DNS / other fatal error — still return the code
    return { ok: false, error, code } as any;
  }
}

/**
 * Fetch the most recently saved schedule for a given house.
 * Used for:
 *  - auto-loading yesterday’s schedule
 *  - knowing if today already has a “created” schedule
 */
export async function fetchLatestScheduleForHouse(house: string) {
  try {
    const { data, error } = await supabase
      .from('schedules')
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
      return { ok: true, data: null };
    }

    const snapshot = data.snapshot as ScheduleSnapshot;
    const createdAt = data.created_at as string | null;

    // Prefer the explicit schedule date from the snapshot; fall back to created_at.
    const scheduleDate =
      (snapshot as any)?.date ||
      (createdAt ? createdAt.slice(0, 10) : null);

    return {
      ok: true,
      data: {
        snapshot,
        code: data.code as string | null,
        createdAt,
        scheduleDate, // 'YYYY-MM-DD'
      },
    };
  } catch (error) {
    console.error('Supabase fetch latest error:', error);
    return { ok: false, error };
  }
}
