import { AVATAR_MAX_BYTES } from "@/lib/profile/edit-storage";
import type { ProfileHeaderId } from "@/lib/profile/headers";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function extForType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function saveProfileEdits(input: {
  userId: string;
  displayName: string;
  equippedHeaderId: ProfileHeaderId;
  pageThemeId: ProfilePageThemeId;
  avatarFile?: File | null;
  avatarUrl: string;
}): Promise<{ avatarUrl: string } | { error: string }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Sign-in is not configured." };

  let avatarUrl = input.avatarUrl;
  const file = input.avatarFile;
  if (file) {
    if (file.size > AVATAR_MAX_BYTES) return { error: "Keep the image under 2 MB." };
    const path = `${input.userId}/avatar.${extForType(file.type)}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) return { error: uploadError.message };
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      avatar_url: avatarUrl || null,
      equipped_header_id: input.equippedHeaderId,
      page_theme_id: input.pageThemeId,
    })
    .eq("id", input.userId);

  if (error) return { error: error.message };
  return { avatarUrl };
}
