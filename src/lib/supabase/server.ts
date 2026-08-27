import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database";
import { supabasePublishableKey, supabaseUrl } from "./env";

export function createAnonSupabaseClient(): SupabaseClient<Database> | null {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

/** Cookie-aware client for Server Components, Server Actions, and Route Handlers. */
export async function createServerSupabaseClient() {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component. Proxy refreshes the session.
        }
      },
    },
  });
}
