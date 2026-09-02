import { cache } from "react";
import { isProActive } from "@/lib/premium/entitlement";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isProfilePageThemeId, type ProfilePageThemeId } from "@/lib/profile/themes";

export type ViewerProfile = {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  currentSr: number;
  onboardingComplete: boolean;
  pageThemeId: ProfilePageThemeId;
  /** True while `proUntil` is in the future. */
  isPro: boolean;
  /** ISO timestamp elovate Pro access lapses, or null if never granted. */
  proUntil: string | null;
};

export const getViewerProfile = cache(async (): Promise<ViewerProfile | null> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: claimsData } = await supabase.auth.getClaims();
  const id = claimsData?.claims?.sub;
  if (typeof id !== "string") return null;

  const BASE_COLUMNS =
    "id, slug, display_name, avatar_url, current_sr, onboarding_completed_at, page_theme_id";

  let { data, error } = await supabase
    .from("profiles")
    .select(`${BASE_COLUMNS}, pro_until`)
    .eq("id", id)
    .maybeSingle();

  // The PREM-00 `pro_until` migration may not be deployed yet. A missing column
  // (Postgres 42703) must not break identity/auth — refetch without it.
  if (error?.code === "42703") {
    ({ data, error } = await supabase
      .from("profiles")
      .select(BASE_COLUMNS)
      .eq("id", id)
      .maybeSingle());
  }

  if (!data) {
    return {
      id,
      slug: "",
      displayName: "",
      avatarUrl: avatarOrDefault(null),
      currentSr: 0,
      onboardingComplete: false,
      pageThemeId: "gold",
      isPro: false,
      proUntil: null,
    };
  }

  const proUntil = "pro_until" in data ? (data.pro_until ?? null) : null;

  const pageThemeId: ProfilePageThemeId = isProfilePageThemeId(data.page_theme_id)
    ? data.page_theme_id
    : "gold";

  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    avatarUrl: avatarOrDefault(data.avatar_url),
    currentSr: typeof data.current_sr === "number" ? data.current_sr : 0,
    onboardingComplete: data.onboarding_completed_at != null,
    pageThemeId,
    isPro: isProActive(proUntil),
    proUntil,
  };
});

export async function isViewerOnboardingComplete(): Promise<{
  complete: boolean;
  slug: string | null;
  userId: string | null;
}> {
  const viewer = await getViewerProfile();
  if (!viewer) return { complete: false, slug: null, userId: null };
  return {
    complete: viewer.onboardingComplete,
    slug: viewer.slug || null,
    userId: viewer.id,
  };
}
