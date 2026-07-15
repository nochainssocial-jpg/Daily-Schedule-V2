import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const APP_ENV =
  process.env.EXPO_PUBLIC_APP_ENV?.trim() ?? "production";

const PRODUCTION_SUPABASE_HOST =
  "erhotgyvqcwvyilkubuu.supabase.co";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase environment variables are missing. Deployment blocked.",
  );
}

if (
  APP_ENV === "staging" &&
  SUPABASE_URL.includes(PRODUCTION_SUPABASE_HOST)
) {
  throw new Error(
    "Safety lock: staging cannot connect to production Supabase.",
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
