// lib/loadSchedule.ts
import { supabase } from './supabase';

export async function loadScheduleFromSupabase(code: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) {
    console.warn('[loadScheduleFromSupabase] error', error);
    return { ok: false, error };
  }

  return { ok: true, schedule: data };
}
