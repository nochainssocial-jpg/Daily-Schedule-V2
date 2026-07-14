import { supabase } from '@/lib/supabase';
import type { OutingGroup } from '@/hooks/schedule-store';
import { normaliseSydneyDateKey } from '@/lib/sydneyDate';

const TABLE = 'daily_outings';

export type DailyOutingsRecord = {
  id: string;
  house: string;
  outingDate: string;
  outings: OutingGroup[];
  autoResetEnabled: boolean;
  lastAutoResetDate?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function normaliseOuting(value: any, index: number): OutingGroup {
  return {
    id: String(value?.id || `outing-${index + 1}`),
    name: String(value?.name || ''),
    staffIds: Array.isArray(value?.staffIds) ? value.staffIds.map(String) : [],
    participantIds: Array.isArray(value?.participantIds)
      ? value.participantIds.map(String)
      : [],
    startTime: value?.startTime ? String(value.startTime) : '',
    endTime: value?.endTime ? String(value.endTime) : '',
    notes: value?.notes ? String(value.notes) : '',
  };
}

export function normaliseOutings(value: unknown): OutingGroup[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2).map(normaliseOuting).filter((outing) =>
    Boolean(
      outing.name.trim() ||
        outing.startTime?.trim() ||
        outing.endTime?.trim() ||
        outing.notes?.trim() ||
        outing.staffIds.length ||
        outing.participantIds.length,
    ),
  );
}

function mapRow(row: any): DailyOutingsRecord {
  return {
    id: String(row.id),
    house: String(row.house),
    outingDate: String(row.outing_date),
    outings: normaliseOutings(row.outings),
    autoResetEnabled: row.auto_reset_enabled !== false,
    lastAutoResetDate: row.last_auto_reset_date || undefined,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export async function fetchOutingsForDate(house: string, outingDate: string) {
  const dateKey = normaliseSydneyDateKey(outingDate);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('house', house)
      .eq('outing_date', dateKey)
      .maybeSingle();

    if (error) return { ok: false as const, error, data: null };
    return { ok: true as const, data: data ? mapRow(data) : null };
  } catch (error) {
    return { ok: false as const, error, data: null };
  }
}

export async function saveOutingsForDate(args: {
  house: string;
  outingDate: string;
  outings: OutingGroup[];
  autoResetEnabled?: boolean;
  lastAutoResetDate?: string;
}) {
  const outingDate = normaliseSydneyDateKey(args.outingDate);
  const payload = {
    house: args.house,
    outing_date: outingDate,
    outings: normaliseOutings(args.outings),
    auto_reset_enabled: args.autoResetEnabled !== false,
    last_auto_reset_date: args.lastAutoResetDate || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'house,outing_date' })
      .select('*')
      .single();

    if (error || !data) return { ok: false as const, error, data: null };
    return { ok: true as const, data: mapRow(data) };
  } catch (error) {
    return { ok: false as const, error, data: null };
  }
}
