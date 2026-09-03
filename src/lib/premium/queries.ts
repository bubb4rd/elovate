import { cache } from "react";
import { redirect } from "next/navigation";
import { getViewerProfile } from "@/lib/auth/viewer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isProActive, NOT_PRO, type Entitlement } from "./entitlement";

/**
 * elovate Pro entitlement — server reads (PREM-00).
 *
 * Server-only: imports the cookie-aware Supabase client. Pure predicates are in
 * `./entitlement` and are safe to import from Client Components.
 */

/** Is the given user currently Pro? Reads their `profiles.pro_until`. */
export async function isPro(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("profiles")
    .select("pro_until")
    .eq("id", userId)
    .maybeSingle();

  return isProActive(data?.pro_until ?? null);
}

/**
 * The current viewer's entitlement. Reuses the request-cached
 * `getViewerProfile()` fetch, so `<ProGate>` and a page reading the viewer share
 * one round-trip.
 */
export const getViewerEntitlement = cache(async (): Promise<Entitlement> => {
  const viewer = await getViewerProfile();
  if (!viewer) return NOT_PRO;
  return { isPro: viewer.isPro, proUntil: viewer.proUntil };
});

/**
 * Guard for `/pro/*` feature pages. Anyone without an active Pro subscription —
 * signed-out, onboarding-incomplete, or lapsed — is sent to the public `/pro`
 * pricing page. Hard gate, no teaser.
 */
export async function requireProPage(): Promise<void> {
  const { isPro } = await getViewerEntitlement();
  if (!isPro) redirect("/pro");
}
