import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database";
import { isValidEmail, normalizeEmail } from "./email";

const WAITLIST_SOURCE = "desktop_page";

export type DesktopWaitlistInput = {
  email: string;
  wantUpdates: boolean;
  wantBeta: boolean;
  userId?: string | null;
};

export type DesktopWaitlistResult =
  | { ok: true; alreadyJoined: boolean }
  | { error: string };

export async function joinDesktopWaitlist(
  input: DesktopWaitlistInput,
): Promise<DesktopWaitlistResult> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Sign-up is not configured." };

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (!input.wantUpdates && !input.wantBeta) {
    return { error: "Pick updates, beta testing, or both." };
  }

  const payload: Database["public"]["Tables"]["desktop_waitlist"]["Insert"] = {
    email,
    want_updates: input.wantUpdates,
    want_beta: input.wantBeta,
    source: WAITLIST_SOURCE,
    user_id: input.userId ?? null,
  };

  const { error } = await supabase.from("desktop_waitlist").insert(payload);

  if (!error) return { ok: true, alreadyJoined: false };

  if (error.code === "23505") {
    return { ok: true, alreadyJoined: true };
  }

  // Profile row may be missing for rare auth-only accounts — retry without user_id.
  if (payload.user_id && (error.code === "23503" || /foreign key/i.test(error.message))) {
    const retry = await supabase.from("desktop_waitlist").insert({
      ...payload,
      user_id: null,
    });
    if (!retry.error) return { ok: true, alreadyJoined: false };
    if (retry.error.code === "23505") return { ok: true, alreadyJoined: true };
    return { error: retry.error.message };
  }

  return { error: error.message };
}
