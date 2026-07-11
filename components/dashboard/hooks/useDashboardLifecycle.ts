import { useCallback, useEffect, useState } from "react";
import { initScheduleForToday, refreshScheduleFromSupabase, useSchedule } from "@/hooks/schedule-store";
import { supabase } from "@/lib/supabase";
import type { EventMeetingVisitRecord } from "../dashboardTypes";
import { DASHBOARD_REFRESH_MS } from "../dashboardTheme";

export function useDashboardLifecycle(locationId: string) {
  const [lastDashboardRefresh, setLastDashboardRefresh] = useState<Date | null>(null);
  const [eventsMeetingsVisits, setEventsMeetingsVisits] = useState<EventMeetingVisitRecord[]>([]);

  const fetchEventsMeetingsVisits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("events_meetings_visits")
        .select("*")
        .eq("house", locationId)
        .eq("dashboard_visible", true)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        console.error("[dashboard] failed to load events, meetings and visits", error);
        return;
      }
      setEventsMeetingsVisits((data || []) as EventMeetingVisitRecord[]);
    } catch (error) {
      console.error("[dashboard] failed to load events, meetings and visits", error);
    }
  }, [locationId]);

  useEffect(() => {
    let cancelled = false;
    async function initialiseDashboard() {
      try {
        await initScheduleForToday(locationId);
        if (!cancelled) {
          await useSchedule.getState().loadMasterData();
          await fetchEventsMeetingsVisits();
          setLastDashboardRefresh(new Date());
        }
      } catch (error) {
        console.error("[dashboard] failed to initialise schedule", error);
      }
    }
    void initialiseDashboard();
    return () => {
      cancelled = true;
    };
  }, [fetchEventsMeetingsVisits, locationId]);

  useEffect(() => {
    let cancelled = false;
    const refreshDashboard = async () => {
      try {
        await refreshScheduleFromSupabase(locationId);
        await fetchEventsMeetingsVisits();
        if (!cancelled) setLastDashboardRefresh(new Date());
      } catch (error) {
        console.error("[dashboard] failed to refresh schedule", error);
      }
    };
    const timer = setInterval(() => void refreshDashboard(), DASHBOARD_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [fetchEventsMeetingsVisits, locationId]);

  return { lastDashboardRefresh, eventsMeetingsVisits };
}
