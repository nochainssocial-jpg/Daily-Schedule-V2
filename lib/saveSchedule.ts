import { supabase } from './supabase';
import { ScheduleSnapshot } from '@/types/schedule'; // adjust path if needed

// Generates a simple 6-digit code (e.g. 482193)
export function generateShareCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveScheduleToSupabase(
  house: string,
  snapshot: ScheduleSnapshot
) {
  const code = generateShareCode();

  try {
    const { error } = await supabase.from('schedules').insert({
      house,
      code,
      snapshot,
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
