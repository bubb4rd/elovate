"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { destinationAfterSession } from "@/lib/auth/post-auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function hasAuthHash(hash: string): boolean {
  const query = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(query);
  return params.has("access_token") || params.has("refresh_token");
}

/**
 * If Supabase falls back to Site URL (e.g. /?code=… or hash tokens),
 * establish the session and send the user through post-auth routing.
 */
export function AuthCodeCatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledHash = useRef(false);

  useEffect(() => {
    if (pathname?.startsWith("/auth/callback")) return;
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    if (!code && !tokenHash) return;
    const qs = searchParams.toString();
    router.replace(`/auth/callback${qs ? `?${qs}` : ""}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (handledHash.current) return;
    if (typeof window === "undefined") return;
    if (searchParams.get("code") || searchParams.get("token_hash")) return;
    if (!hasAuthHash(window.location.hash)) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    handledHash.current = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        handledHash.current = false;
        return;
      }
      const path = await destinationAfterSession(supabase);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      router.replace(path);
      router.refresh();
    })();
  }, [router, searchParams]);

  return null;
}
