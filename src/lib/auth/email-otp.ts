import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";

const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const satisfies readonly EmailOtpType[];

/** New emails mint `signup` tokens; returning users mint `email` / magic-link tokens. */
export const EMAIL_OTP_VERIFY_TYPES = ["email", "signup"] as const;

export function parseEmailOtpType(raw: string | null | undefined): EmailOtpType | null {
  if (!raw) return null;
  return (EMAIL_OTP_TYPES as readonly string[]).includes(raw) ? (raw as EmailOtpType) : null;
}

export async function verifyEmailOtp(
  supabase: SupabaseClient<Database>,
  email: string,
  token: string,
) {
  let lastError: Awaited<ReturnType<SupabaseClient<Database>["auth"]["verifyOtp"]>>["error"] =
    null;
  for (const type of EMAIL_OTP_VERIFY_TYPES) {
    const result = await supabase.auth.verifyOtp({ email, token, type });
    if (!result.error) return result;
    lastError = result.error;
  }
  return { data: { user: null, session: null }, error: lastError };
}
