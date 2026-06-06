import { createClient } from "@supabase/supabase-js";

// Helper to get Supabase configuration from environment variables
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return {
    url: envUrl || "",
    key: envKey || ""
  };
};

const config = getSupabaseConfig();

export const supabase = config.url && config.key
  ? createClient(config.url, config.key)
  : null;

export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

