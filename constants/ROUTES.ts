export const ROUTES = {
  HOME: '/home',
  CREATE: '/create-schedule',
  EDIT: '/edit',
  SHARE: '/share-schedule',
  EDIT_CATEGORY: (category: string) => `/edit/${category}`,
} as const;
