import { create } from 'zustand';

export const ADMIN_SESSION_TIMEOUT_MS = 15 * 60 * 1000;

export type AccessMode =
  | 'b2-readonly'
  | 'admin-md'
  | 'admin-bruno'
  | 'admin-jessica';

export const isAdminAccessMode = (mode: AccessMode) =>
  mode === 'admin-md' ||
  mode === 'admin-bruno' ||
  mode === 'admin-jessica';

type AccessState = {
  mode: AccessMode;
  adminSessionExpiresAt: number | null;
  setB2ReadOnly: () => void;
  setAdminMd: () => void;
  setAdminBruno: () => void;
  setAdminJessica: () => void;
  refreshAdminSession: () => void;
};

const createAdminSession = (mode: AccessMode) => ({
  mode,
  adminSessionExpiresAt: Date.now() + ADMIN_SESSION_TIMEOUT_MS,
});

export const useAccessControl = create<AccessState>((set) => ({
  // Safe default: B2 read-only on fresh load
  mode: 'b2-readonly',
  adminSessionExpiresAt: null,
  setB2ReadOnly: () =>
    set({
      mode: 'b2-readonly',
      adminSessionExpiresAt: null,
    }),
  setAdminMd: () => set(createAdminSession('admin-md')),
  setAdminBruno: () => set(createAdminSession('admin-bruno')),
  setAdminJessica: () => set(createAdminSession('admin-jessica')),
  refreshAdminSession: () =>
    set((state) =>
      isAdminAccessMode(state.mode)
        ? { adminSessionExpiresAt: Date.now() + ADMIN_SESSION_TIMEOUT_MS }
        : {},
    ),
}));

export const useIsAdmin = () =>
  useAccessControl((state) => isAdminAccessMode(state.mode));

export const useIsReadOnly = () => !useIsAdmin();
