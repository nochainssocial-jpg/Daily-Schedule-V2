import { supabase } from '@/lib/supabase';
import type { OutingGroup } from '@/hooks/schedule-store';
import { normaliseSydneyDateKey } from '@/lib/sydneyDate';

const TABLE = 'daily_outings';

export type DailyOutingsRecord = {
  id: string;
  house: string;
  outingDate: string;
  outings: OutingGroup[];
  archivedOutings: OutingGroup[];
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
    driverId: value?.driverId ? String(value.driverId) : '',
    linkedOutingId: value?.linkedOutingId ? String(value.linkedOutingId) : '',
    startTime: value?.startTime ? String(value.startTime) : '',
    endTime: value?.endTime ? String(value.endTime) : '',
    notes: value?.notes ? String(value.notes) : '',
  };
}

export function normaliseOutings(value: unknown): OutingGroup[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map(normaliseOuting).filter((outing) =>
    Boolean(
      outing.name.trim() ||
        outing.startTime?.trim() ||
        outing.endTime?.trim() ||
        outing.notes?.trim() ||
        outing.driverId?.trim() ||
        outing.linkedOutingId?.trim() ||
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
    archivedOutings: normaliseOutings(row.archived_outings),
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
  archivedOutings?: OutingGroup[];
  autoResetEnabled?: boolean;
  lastAutoResetDate?: string;
}) {
  const outingDate = normaliseSydneyDateKey(args.outingDate);
  const payload: Record<string, unknown> = {
    house: args.house,
    outing_date: outingDate,
    outings: normaliseOutings(args.outings),
    auto_reset_enabled: args.autoResetEnabled !== false,
    last_auto_reset_date: args.lastAutoResetDate || null,
    updated_at: new Date().toISOString(),
  };
  if (Array.isArray(args.archivedOutings) && args.archivedOutings.length > 0) {
    payload.archived_outings = normaliseOutings(args.archivedOutings);
  }

  try {
    let { data, error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'house,outing_date' })
      .select('*')
      .single();

    // Keep the existing outing reset operational if the app is deployed a few
    // minutes before the archive migration is applied.
    if (error && 'archived_outings' in payload) {
      const legacyPayload = { ...payload };
      delete legacyPayload.archived_outings;
      const retry = await supabase
        .from(TABLE)
        .upsert(legacyPayload, { onConflict: 'house,outing_date' })
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) return { ok: false as const, error, data: null };
    return { ok: true as const, data: mapRow(data) };
  } catch (error) {
    return { ok: false as const, error, data: null };
  }
}
