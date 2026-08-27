import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { onboardingHref, shouldSkipOnboardingGate } from "@/lib/auth/paths";
import { supabasePublishableKey, supabaseUrl } from "./env";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

export async function updateSession(request: NextRequest) {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([header, value]) =>
          supabaseResponse.headers.set(header, value),
        );
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const id = claimsData?.claims?.sub;
  const pathname = request.nextUrl.pathname;

  if (typeof id === "string" && !shouldSkipOnboardingGate(pathname)) {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", id)
      .maybeSingle();
    if (data?.onboarding_completed_at == null) {
      const nextPath =
        pathname === "/login" ? "/" : `${pathname}${request.nextUrl.search}`;
      const dest = onboardingHref(nextPath);
      const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
      return copyCookies(supabaseResponse, redirectResponse);
    }
  }

  return supabaseResponse;
}
