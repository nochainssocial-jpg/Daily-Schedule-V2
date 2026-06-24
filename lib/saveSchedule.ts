import { supabase } from './supabase';
import type { ScheduleSnapshot } from '@/hooks/schedule-store';

const TABLE = 'schedules';
const SYDNEY_TIMEZONE = 'Australia/Sydney';

export function generateShareCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function toLocalDateKey(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function getSydneyDateKey(date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: SYDNEY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {}

  return toLocalDateKey(date);
}

function normaliseScheduleDate(snapshot: ScheduleSnapshot): string {
  const snapshotDate = typeof snapshot.date === 'string' ? snapshot.date.slice(0, 10) : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) return snapshotDate;
  return getSydneyDateKey();
}

export async function saveScheduleToSupabase(
  house: string,
  snapshot: ScheduleSnapshot,
) {
  const code = generateShareCode();
  const scheduleDate = normaliseScheduleDate(snapshot);

  const snapshotWithDate: ScheduleSnapshot = {
    ...snapshot,
    date: scheduleDate,
  };

  const payload = {
    house,
    code,
    snapshot: snapshotWithDate,
    schedule_date: scheduleDate,
  };

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('snapshot, code, created_at, schedule_date')
      .single();

    if (error || !data) {
      console.error('Supabase save error:', error);
      return { ok: false, error };
    }

    const createdAt = data.created_at as string | null;
    const savedSnapshot = data.snapshot as ScheduleSnapshot;
    const savedScheduleDate =
      (data.schedule_date as string | null) ||
      savedSnapshot.date ||
      (createdAt && createdAt.slice(0, 10)) ||
      scheduleDate;

    return {
      ok: true,
      data: {
        snapshot: savedSnapshot,
        code: data.code as string | null,
        createdAt,
        scheduleDate: savedScheduleDate,
      },
    };
  } catch (error) {
    console.error('Supabase save exception:', error);
    return { ok: false, error };
  }
}

export async function fetchLatestScheduleForHouse(house: string) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('snapshot, code, created_at, schedule_date')
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
    const scheduleDate =
      (data.schedule_date as string | null) ||
      snapshot.date ||
      (createdAt && createdAt.slice(0, 10)) ||
      getSydneyDateKey();

    return {
      ok: true,
      data: {
        snapshot,
        code: data.code as string | null,
        createdAt,
        scheduleDate,
      },
    };
  } catch (error) {
    console.error('Supabase fetch latest exception:', error);
    return { ok: false, error };
  }
}
