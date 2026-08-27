import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { loginHref, onboardingHref, safeNextPath } from "@/lib/auth/paths";
import { getViewerProfile } from "@/lib/auth/viewer";
import type { Mode } from "@/lib/data/types";
import { parseClimbGoals } from "@/lib/profile/goals";
import { slugify } from "@/lib/profile/slug";
import type { ClimbTarget } from "@/lib/ranked";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set up profile",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/");
  const viewer = await getViewerProfile();
  if (!viewer) {
    redirect(loginHref(onboardingHref(next)));
  }
  if (viewer.onboardingComplete) {
    redirect(next === "/" && viewer.slug ? `/players/${viewer.slug}` : next);
  }

  const supabase = await createServerSupabaseClient();
  let displayName = viewer.displayName;
  let slug = viewer.slug;
  let avatarUrl = viewer.avatarUrl;
  let profileExists = false;
  let preferredMode: Mode = "wz";
  let climbGoals: ClimbTarget[] = [];
  let currentSr: number | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, slug, avatar_url, preferred_mode, climb_goals, current_sr")
      .eq("id", viewer.id)
      .maybeSingle();
    if (data) {
      profileExists = true;
      displayName = data.display_name;
      slug = data.slug;
      avatarUrl = data.avatar_url;
      preferredMode = "wz";
      climbGoals = parseClimbGoals(data.climb_goals);
      currentSr = typeof data.current_sr === "number" ? data.current_sr : null;
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const meta = userData.user?.user_metadata ?? {};
      displayName =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        (typeof meta.user_name === "string" && meta.user_name) ||
        displayName ||
        "Player";
      slug = slugify(
        (typeof meta.user_name === "string" && meta.user_name) ||
          (typeof meta.preferred_username === "string" && meta.preferred_username) ||
          (typeof meta.name === "string" && meta.name) ||
          displayName,
      );
      avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;
    }
  }

  return (
    <OnboardingWizard
      nextPath={next}
      prefill={{
        userId: viewer.id,
        displayName: displayName || "Player",
        slug: slug || "player",
        avatarUrl,
        profileExists,
        preferredMode,
        climbGoals,
        currentSr,
      }}
    />
  );
}
