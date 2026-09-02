import { cache } from "react";
import { redirect } from "next/navigation";
import { loginHref, onboardingHref } from "@/lib/auth/paths";
import { getViewerProfile, type ViewerProfile } from "@/lib/auth/viewer";
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
 * Guard for `/pro/*` pages. Requires a signed-in, onboarded viewer — but NOT a
 * Pro subscription: non-Pro users reach the suite and see the blurred teasers
 * (this is the upsell surface). Returns the viewer for the page to use.
 */
export async function requireProPage(nextPath: string): Promise<ViewerProfile> {
  const viewer = await getViewerProfile();
  if (!viewer) redirect(loginHref(nextPath));
  if (!viewer.onboardingComplete) redirect(onboardingHref(nextPath));
  return viewer;
}
