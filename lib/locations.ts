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

export function getLocationLabel(locationId?: string) {
  return LOCATIONS.find(location => location.id === locationId)?.label ?? 'Day Program';
}

export function isLocationId(value: string): value is LocationId {
  return value === 'day_program' || value === 'social_hub';
}
