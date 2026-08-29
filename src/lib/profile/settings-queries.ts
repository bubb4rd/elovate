import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isProfilePageThemeId, type ProfilePageThemeId } from "./themes";
import type { AccountSettings } from "./settings";

export async function getAccountSettings(userId: string): Promise<AccountSettings | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const [{ data: profile }, { data: userData }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "slug, display_name, is_private, notify_cutoff, notify_climb, created_at, page_theme_id",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!profile) return null;

  const pageThemeId: ProfilePageThemeId = isProfilePageThemeId(profile.page_theme_id)
    ? profile.page_theme_id
    : "gold";

  return {
    userId,
    slug: profile.slug,
    displayName: profile.display_name,
    email: userData.user?.email ?? null,
    createdAt: profile.created_at ?? userData.user?.created_at ?? null,
    isPrivate: profile.is_private,
    notifyCutoff: profile.notify_cutoff,
    notifyClimb: profile.notify_climb,
    pageThemeId,
  };
}
