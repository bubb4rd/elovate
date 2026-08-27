export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return fallback;
  return raw;
}

export function loginHref(next?: string): string {
  if (!next || next === "/") return "/login";
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}

export function onboardingHref(next?: string): string {
  const safe = safeNextPath(next, "/");
  if (safe === "/" || safe.startsWith("/onboarding")) return "/onboarding";
  return `/onboarding?next=${encodeURIComponent(safe)}`;
}

/** After auth, send incomplete users to onboarding; otherwise honor next. */
export function postAuthPath(input: {
  onboardingComplete: boolean;
  slug?: string;
  next?: string | null;
}): string {
  const next = safeNextPath(input.next, "/");
  if (!input.onboardingComplete) {
    return onboardingHref(next === "/onboarding" ? "/" : next);
  }
  if (next === "/" && input.slug) return `/players/${input.slug}`;
  return next;
}

/** Auth exchange and the onboarding wizard must run before the incomplete-profile gate. */
export function shouldSkipOnboardingGate(pathname: string): boolean {
  return pathname.startsWith("/onboarding") || pathname.startsWith("/auth/");
}
