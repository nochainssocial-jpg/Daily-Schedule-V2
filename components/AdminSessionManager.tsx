import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { router, usePathname } from 'expo-router';

import {
  isAdminAccessMode,
  useAccessControl,
} from '@/hooks/access-control';
import { useNotifications } from '@/hooks/notifications';

const ACTIVITY_REFRESH_THROTTLE_MS = 5_000;
const RESTRICTED_PATHS = ['/edit', '/admin', '/settings', '/create-schedule'];

export default function AdminSessionManager() {
  const pathname = usePathname();
  const push = useNotifications((state) => state.push);
  const pathnameRef = useRef(pathname);
  const expiringRef = useRef(false);
  const lastActivityRefreshRef = useRef(0);
  const warnedExpiryRef = useRef<number | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const expireSession = useCallback(() => {
    if (expiringRef.current) return;

    const { mode, setB2ReadOnly } = useAccessControl.getState();
    if (!isAdminAccessMode(mode)) return;

    expiringRef.current = true;
    setB2ReadOnly();
    push('Admin session expired - Read-only Mode enabled', 'general');

    if (RESTRICTED_PATHS.some((path) => pathnameRef.current.startsWith(path))) {
      router.replace('/home');
    }

    setTimeout(() => {
      expiringRef.current = false;
    }, 250);
  }, [push]);

  useEffect(() => {
    const checkSession = () => {
      const { mode, adminSessionExpiresAt } = useAccessControl.getState();

      if (!isAdminAccessMode(mode) || !adminSessionExpiresAt) {
        warnedExpiryRef.current = null;
        return;
      }

      const remainingMs = adminSessionExpiresAt - Date.now();

      if (remainingMs <= 0) {
        expireSession();
        return;
      }

      if (
        remainingMs <= 60_000 &&
        warnedExpiryRef.current !== adminSessionExpiresAt
      ) {
        warnedExpiryRef.current = adminSessionExpiresAt;
        push('Admin session expires in 1 minute', 'general');
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 1_000);
    return () => clearInterval(interval);
  }, [expireSession, push]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const registerActivity = () => {
      const now = Date.now();
      const {
        mode,
        adminSessionExpiresAt,
        refreshAdminSession,
      } = useAccessControl.getState();

      if (!isAdminAccessMode(mode) || !adminSessionExpiresAt) return;

      if (now >= adminSessionExpiresAt) {
        expireSession();
        return;
      }

      if (now - lastActivityRefreshRef.current < ACTIVITY_REFRESH_THROTTLE_MS) {
        return;
      }

      lastActivityRefreshRef.current = now;
      warnedExpiryRef.current = null;
      refreshAdminSession();
    };

    const events = [
      'pointerdown',
      'pointermove',
      'keydown',
      'wheel',
      'touchstart',
      'input',
    ] as const;

    events.forEach((eventName) =>
      document.addEventListener(eventName, registerActivity, { passive: true }),
    );

    return () => {
      events.forEach((eventName) =>
        document.removeEventListener(eventName, registerActivity),
      );
    };
  }, [expireSession]);

  useEffect(() => {
    const { mode, adminSessionExpiresAt, refreshAdminSession } =
      useAccessControl.getState();

    if (!isAdminAccessMode(mode) || !adminSessionExpiresAt) return;

    if (Date.now() >= adminSessionExpiresAt) {
      expireSession();
      return;
    }

    // Navigation initiated by the admin counts as active use.
    refreshAdminSession();
    warnedExpiryRef.current = null;
  }, [expireSession, pathname]);

  return null;
}
