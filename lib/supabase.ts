import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const APP_ENV =
  process.env.EXPO_PUBLIC_APP_ENV?.trim();

const EXPECTED_SUPABASE_HOST =
  process.env.EXPO_PUBLIC_EXPECTED_SUPABASE_HOST?.trim();

if (
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !APP_ENV ||
  !EXPECTED_SUPABASE_HOST
) {
  throw new Error(
    "Staging configuration is incomplete. Deployment blocked.",
  );
}

const actualSupabaseHost = new URL(SUPABASE_URL).hostname;

// This feature branch must never operate as production.
if (APP_ENV !== "staging") {
  throw new Error(
    "Safety lock: testing branch must use the staging environment.",
  );
}

if (actualSupabaseHost !== EXPECTED_SUPABASE_HOST) {
  throw new Error(
    `Safety lock: expected ${EXPECTED_SUPABASE_HOST}, received ${actualSupabaseHost}.`,
  );
}

console.info(
  `[Daily Schedule] environment=${APP_ENV}, database=${actualSupabaseHost}`,
);

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
