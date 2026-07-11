import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardPage } from "../dashboardTypes";
import { ROTATE_MS } from "../dashboardTheme";

const MANUAL_ROTATION_RESUME_MS = 90_000;

export function useDashboardNavigation(pages: DashboardPage[], resetKey: unknown) {
  const [pageIndex, setPageIndex] = useState(0);
  const [autoRotationEnabled, setAutoRotationEnabled] = useState(true);
  const autoResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setPageIndex(0), [resetKey]);

  useEffect(() => {
    if (!autoRotationEnabled || pages.length <= 1) return;
    const timer = setInterval(
      () => setPageIndex((value) => (value + 1) % Math.max(1, pages.length)),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [autoRotationEnabled, pages.length]);

  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(0);
  }, [pageIndex, pages.length]);

  const clearAutoResumeTimer = useCallback(() => {
    if (autoResumeTimerRef.current) {
      clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = null;
    }
  }, []);

  const pauseAutoRotationBriefly = useCallback(() => {
    setAutoRotationEnabled(false);
    clearAutoResumeTimer();
    autoResumeTimerRef.current = setTimeout(() => {
      setAutoRotationEnabled(true);
      autoResumeTimerRef.current = null;
    }, MANUAL_ROTATION_RESUME_MS);
  }, [clearAutoResumeTimer]);

  const previousPage = useCallback(() => {
    pauseAutoRotationBriefly();
    setPageIndex((value) => {
      const count = Math.max(1, pages.length);
      return (value - 1 + count) % count;
    });
  }, [pages.length, pauseAutoRotationBriefly]);

  const nextPage = useCallback(() => {
    pauseAutoRotationBriefly();
    setPageIndex((value) => (value + 1) % Math.max(1, pages.length));
  }, [pages.length, pauseAutoRotationBriefly]);

  const toggleAutoRotation = useCallback(() => {
    clearAutoResumeTimer();
    setAutoRotationEnabled((value) => !value);
  }, [clearAutoResumeTimer]);

  useEffect(() => () => clearAutoResumeTimer(), [clearAutoResumeTimer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousPage();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextPage();
      } else if (event.key === " ") {
        event.preventDefault();
        toggleAutoRotation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, previousPage, toggleAutoRotation]);

  return {
    pageIndex,
    currentPage: pages[pageIndex] || "floating",
    autoRotationEnabled,
    previousPage,
    nextPage,
    toggleAutoRotation,
  };
}
