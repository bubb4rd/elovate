import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const satisfies readonly EmailOtpType[];

export function parseEmailOtpType(raw: string | null | undefined): EmailOtpType | null {
  if (!raw) return null;
  return (EMAIL_OTP_TYPES as readonly string[]).includes(raw) ? (raw as EmailOtpType) : null;
}
