import { supabase } from './supabase';

export async function loadScheduleFromSupabase(code: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    return { ok: false, error };
  }

  return { ok: true, schedule: data };
}
