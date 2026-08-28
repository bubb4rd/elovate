import { NextResponse } from "next/server";
import {
  clearAuthNextCookie,
  readAuthNextFromCookieHeader,
} from "@/lib/auth/oauth-return";
import { parseEmailOtpType } from "@/lib/auth/email-otp";
import { destinationAfterSession } from "@/lib/auth/post-auth";
import { safeNextPath } from "@/lib/auth/paths";
import { publicOrigin } from "@/lib/auth/public-origin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = parseEmailOtpType(searchParams.get("type"));
  const nextFromQuery = searchParams.get("next");
  const nextFromCookie = readAuthNextFromCookieHeader(request.headers.get("cookie"));
  const next = safeNextPath(nextFromQuery, nextFromCookie);

  function redirect(path: string) {
    const response = NextResponse.redirect(`${origin}${path}`);
    response.headers.append("Set-Cookie", clearAuthNextCookie());
    return response;
  }

  // Prefer token_hash (works cross-device) over PKCE code (same-browser only).
  if (tokenHash && otpType) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return redirect("/login?error=config");
    }
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (!error) {
      const destination = await destinationAfterSession(supabase, next);
      return redirect(`/auth/complete?next=${encodeURIComponent(destination)}`);
    }
    return redirect("/login?error=auth");
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return redirect("/login?error=config");
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = await destinationAfterSession(supabase, next);
      return redirect(`/auth/complete?next=${encodeURIComponent(destination)}`);
    }
    const message = error.message.toLowerCase();
    if (
      message.includes("code verifier") ||
      message.includes("both auth code and code verifier")
    ) {
      return redirect("/login?error=device");
    }
    return redirect("/login?error=auth");
  }

  return redirect("/login?error=auth");
}
