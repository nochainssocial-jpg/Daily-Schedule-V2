// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// TODO: replace these with your real values from Supabase settings → API
const SUPABASE_URL = 'https://erhotgyvqcwvyilkubuu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaG90Z3l2cWN3dnlpbGt1YnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzg0MTcsImV4cCI6MjA3ODk1NDQxN30.3DneUEZRtYmqmMYGX7gP2Ggxhp8S1sDDIQSXRmxEAFA';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or anon key is missing!');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);