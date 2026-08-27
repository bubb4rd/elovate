/** Stash post-auth destination so OAuth redirectTo can stay an exact allowlisted URL. */

import { safeNextPath } from "@/lib/auth/paths";

export const AUTH_NEXT_COOKIE = "elovate_auth_next";

export function oauthCallbackUrl(origin: string): string {
  return `${origin}/auth/callback`;
}

export function stashAuthNext(next: string): void {
  const safe = safeNextPath(next, "/");
  const maxAge = 600;
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function readAuthNextFromCookieHeader(
  cookieHeader: string | null,
): string {
  if (!cookieHeader) return "/";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_NEXT_COOKIE}=`));
  if (!match) return "/";
  const raw = match.slice(AUTH_NEXT_COOKIE.length + 1);
  try {
    return safeNextPath(decodeURIComponent(raw), "/");
  } catch {
    return "/";
  }
}

export function clearAuthNextCookie(): string {
  return `${AUTH_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
