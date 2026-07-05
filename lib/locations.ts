export type LocationId = 'day_program' | 'social_hub';

export type LocationOption = {
  id: LocationId;
  label: string;
  shortLabel: string;
};

export const LOCATIONS: LocationOption[] = [
  {
    id: 'day_program',
    label: 'Day Program',
    shortLabel: 'Day Program',
  },
  {
    id: 'social_hub',
    label: 'Social Hub',
    shortLabel: 'Social Hub',
  },
];

export const DEFAULT_LOCATION_ID: LocationId = 'day_program';
export const LEGACY_DAY_PROGRAM_HOUSE_ID = 'B2';

export const LOCATION_PINS: Record<LocationId, string> = {
  day_program: '1935',
  social_hub: '5391',
};

export function normalizeLocationId(value?: string | null): LocationId {
  if (value === 'social_hub') return 'social_hub';
  return 'day_program';
}

export function getLocationLabel(locationId?: string | null) {
  const normalisedLocationId = normalizeLocationId(locationId);
  return LOCATIONS.find(location => location.id === normalisedLocationId)?.label ?? 'Day Program';
}

export function isLocationId(value: string): value is LocationId {
  return value === 'day_program' || value === 'social_hub';
}

export function getLocationForPin(pin?: string | null): LocationOption | null {
  const trimmedPin = String(pin || '').trim();
  const locationId = LOCATIONS.find(location => LOCATION_PINS[location.id] === trimmedPin)?.id;
  if (!locationId) return null;
  return LOCATIONS.find(location => location.id === locationId) ?? null;
}

export function getScheduleLocationId(snapshotOrState?: any): LocationId {
  return normalizeLocationId(
    snapshotOrState?.currentLocationId ??
      snapshotOrState?.meta?.locationId ??
      snapshotOrState?.meta?.house ??
      snapshotOrState?.house,
  );
}
