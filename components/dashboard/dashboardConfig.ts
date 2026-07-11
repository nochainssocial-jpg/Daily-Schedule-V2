export const DEFAULT_DASHBOARD_LOCATION_ID = "B2";

export type DashboardLocationConfig = {
  id: string;
  name: string;
  timezone: string;
};

export const DASHBOARD_LOCATIONS: Record<string, DashboardLocationConfig> = {
  B2: { id: "B2", name: "Day Program", timezone: "Australia/Sydney" },
};

export function resolveDashboardLocationId(): string {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_LOCATION_ID;

  try {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("location") ||
      window.localStorage.getItem("dashboardLocationId") ||
      DEFAULT_DASHBOARD_LOCATION_ID
    );
  } catch {
    return DEFAULT_DASHBOARD_LOCATION_ID;
  }
}
