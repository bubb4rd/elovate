import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ViewerProfile = {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  currentSr: number;
  onboardingComplete: boolean;
};

export async function getViewerProfile(): Promise<ViewerProfile | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: claimsData } = await supabase.auth.getClaims();
  const id = claimsData?.claims?.sub;
  if (typeof id !== "string") return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, slug, display_name, avatar_url, current_sr, onboarding_completed_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return {
      id,
      slug: "",
      displayName: "",
      avatarUrl: null,
      currentSr: 0,
      onboardingComplete: false,
    };
  }

  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    currentSr: typeof data.current_sr === "number" ? data.current_sr : 0,
    onboardingComplete: data.onboarding_completed_at != null,
  };
}

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
