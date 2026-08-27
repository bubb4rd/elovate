import { NextResponse } from "next/server";
import { postAuthPath, safeNextPath } from "@/lib/auth/paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/");

  if (code) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.redirect(`${origin}/login?error=config`);
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
      const path = postAuthPath({ onboardingComplete, slug, next });
      return NextResponse.redirect(`${origin}${path}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
