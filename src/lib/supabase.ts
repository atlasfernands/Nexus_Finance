import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "./env";

const supabaseUrl = getEnvVar("SUPABASE_URL");
const supabaseAnonKey = getEnvVar("SUPABASE_ANON_KEY");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
