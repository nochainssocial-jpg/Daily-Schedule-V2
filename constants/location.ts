export const DEFAULT_LOCATION_ID = 'B2';

export const DEFAULT_LOCATION_NAME = 'Day Program';

export const APP_TIME_ZONE = 'Australia/Sydney';

export type HomeScheduleLocation = {
  id: string;
  name: string;
};

/**
 * Only locations intentionally approved for the public home screen belong here.
 * Future confidential locations must be supplied by an authorised server-side
 * configuration before they are rendered or queried by the client.
 */
export const HOME_SCHEDULE_LOCATIONS: readonly HomeScheduleLocation[] = [
  {
    id: DEFAULT_LOCATION_ID,
    name: DEFAULT_LOCATION_NAME,
  },
];
