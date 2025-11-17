import { createClient } from '@supabase/supabase-js';

// Read values from .env
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://erhotgyvqcwvyilkubuu.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaG90Z3l2cWN3dnlpbGt1YnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzg0MTcsImV4cCI6MjA3ODk1NDQxN30.3DneUEZRtYmqmMYGX7gP2Ggxhp8S1sDDIQSXRmxEAFA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
