// hooks/access-control.ts
import { create } from 'zustand';

export type AccessMode = 'b2-readonly' | 'admin-md' | 'admin-bruno';

type AccessState = {
  mode: AccessMode;
  setB2ReadOnly: () => void;
  setAdminMd: () => void;
  setAdminBruno: () => void;
};

export const useAccessControl = create<AccessState>((set) => ({
  // Safe default: B2 read-only on fresh load
  mode: 'b2-readonly',
  setB2ReadOnly: () => set({ mode: 'b2-readonly' }),
  setAdminMd: () => set({ mode: 'admin-md' }),
  setAdminBruno: () => set({ mode: 'admin-bruno' }),
}));

export const useIsAdmin = () =>
  useAccessControl(
    (state) => state.mode === 'admin-md' || state.mode === 'admin-bruno',
  );

export const useIsReadOnly = () => !useIsAdmin();
