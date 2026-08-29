import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database";
import type { ProfilePageThemeId } from "./themes";

export type AccountSettings = {
  userId: string;
  slug: string;
  displayName: string;
  email: string | null;
  createdAt: string | null;
  isPrivate: boolean;
  notifyCutoff: boolean;
  notifyClimb: boolean;
  pageThemeId: ProfilePageThemeId;
};

export type SettingsPatch = Partial<
  Pick<
    AccountSettings,
    "displayName" | "isPrivate" | "notifyCutoff" | "notifyClimb" | "pageThemeId"
  >
>;

export async function saveAccountSettings(
  userId: string,
  patch: SettingsPatch,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Sign-in is not configured." };

  const payload: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (patch.displayName != null) {
    const trimmed = patch.displayName.trim();
    if (!trimmed) return { error: "Name cannot be empty." };
    if (trimmed.length > 40) return { error: "Keep the name under 40 characters." };
    payload.display_name = trimmed;
  }
  if (patch.isPrivate != null) payload.is_private = patch.isPrivate;
  if (patch.notifyCutoff != null) payload.notify_cutoff = patch.notifyCutoff;
  if (patch.notifyClimb != null) payload.notify_climb = patch.notifyClimb;
  if (patch.pageThemeId != null) payload.page_theme_id = patch.pageThemeId;

  if (Object.keys(payload).length === 0) return { ok: true };

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}
