import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

export function createBrowserSupabaseClient() {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) return null;
  return createBrowserClient<Database>(url, key);
}

export { isSupabaseConfigured };
