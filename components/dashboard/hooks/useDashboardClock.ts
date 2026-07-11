import { useEffect, useMemo, useState } from "react";
import {
  buildDashboardDateAtMinutes,
  minutesToTimeLabel,
  nowMinutes,
  parsePreviewTimeToMinutes,
} from "../dashboardUtils";

function getPreviewTimeParam(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("previewTime");
  } catch {
    return null;
  }
}

export function useDashboardClock(scheduleDate: string) {
  const [tick, setTick] = useState(0);
  const previewTimeParam = useMemo(() => getPreviewTimeParam(), []);
  const previewMinutes = useMemo(
    () => parsePreviewTimeToMinutes(previewTimeParam),
    [previewTimeParam],
  );
  const isPreviewMode = previewMinutes !== null;
  const currentMinutes = previewMinutes ?? nowMinutes();
  const dashboardNow = useMemo(
    () =>
      isPreviewMode
        ? buildDashboardDateAtMinutes(scheduleDate, currentMinutes)
        : new Date(),
    [scheduleDate, currentMinutes, isPreviewMode, tick],
  );

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  return {
    tick,
    currentMinutes,
    dashboardNow,
    isPreviewMode,
    previewTimeLabel: isPreviewMode ? minutesToTimeLabel(currentMinutes) : null,
  };
}
