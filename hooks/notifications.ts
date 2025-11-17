// hooks/notifications.ts
import { create } from 'zustand';

export type NotificationCategory =
  | 'create'
  | 'staff'
  | 'participants'
  | 'assignments'
  | 'floating'
  | 'cleaning'
  | 'pickups'
  | 'checklist'
  | 'general';

export type AppNotification = {
  id: string;
  message: string;
  category?: NotificationCategory;
  createdAt: number;
};

type State = {
  items: AppNotification[];
  current: AppNotification | null;
  push: (message: string, category?: NotificationCategory) => void;
  clearCurrent: () => void;
};

export const useNotifications = create<State>(set => ({
  items: [],
  current: null,
  push: (message, category) =>
    set(state => {
      const n: AppNotification = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message,
        category,
        createdAt: Date.now(),
      };
      return {
        items: [n, ...state.items].slice(0, 50),
        current: n,
      };
    }),
  clearCurrent: () => set({ current: null }),
}));
