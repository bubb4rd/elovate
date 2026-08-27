import { NextResponse } from "next/server";
import {
  clearAuthNextCookie,
  readAuthNextFromCookieHeader,
} from "@/lib/auth/oauth-return";
import { postAuthPath, safeNextPath } from "@/lib/auth/paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextFromQuery = searchParams.get("next");
  const nextFromCookie = readAuthNextFromCookieHeader(request.headers.get("cookie"));
  const next = safeNextPath(nextFromQuery, nextFromCookie);

  function redirect(path: string) {
    const response = NextResponse.redirect(`${origin}${path}`);
    response.headers.append("Set-Cookie", clearAuthNextCookie());
    return response;
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return redirect("/login?error=config");
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: claimsData } = await supabase.auth.getClaims();
      const id = claimsData?.claims?.sub;
      let onboardingComplete = false;
      let slug: string | undefined;
      if (typeof id === "string") {
        const { data } = await supabase
          .from("profiles")
          .select("slug, onboarding_completed_at")
          .eq("id", id)
          .maybeSingle();
        onboardingComplete = data?.onboarding_completed_at != null;
        slug = data?.slug;
      }
      return redirect(postAuthPath({ onboardingComplete, slug, next }));
    }
  }

  return redirect("/login?error=auth");
}
