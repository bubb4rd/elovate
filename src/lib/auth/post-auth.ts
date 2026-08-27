import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { postAuthPath } from "./paths";

export async function destinationAfterSession(
  supabase: SupabaseClient<Database>,
  next?: string | null,
): Promise<string> {
  const { data: claimsData } = await supabase.auth.getClaims();
  const id = claimsData?.claims?.sub;
  let onboardingComplete = false;
  let slug: string | undefined;
  if (typeof id === "string") {
    const { data } = await supabase
      .from("profiles")
      .select("slug, onboarding_completed_at")
      .eq("id", id)
      .maybeSingle();
    onboardingComplete = data?.onboarding_completed_at != null;
    slug = data?.slug;
  }
  return postAuthPath({ onboardingComplete, slug, next });
}
