export const ROUTES = {
  HOME: '/home',
  CREATE: '/create-schedule',
  EDIT: '/edit',
  SHARE: '/share-schedule',
  SETTINGS: '/settings',
  EDIT_CATEGORY: (category: string) => `/edit/${category}`,
} as const;
