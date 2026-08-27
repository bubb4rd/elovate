"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * If Supabase falls back to Site URL (e.g. /?code=…), forward to /auth/callback
 * so exchangeCodeForSession still runs.
 */
export function AuthCodeCatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname?.startsWith("/auth/callback")) return;
    const code = searchParams.get("code");
    if (!code) return;
    const qs = searchParams.toString();
    router.replace(`/auth/callback${qs ? `?${qs}` : ""}`);
  }, [pathname, router, searchParams]);

  return null;
}
