export const TIMEZONE_COOKIE = "elovate_tz";
export const UTC_TIME_ZONE = "UTC";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 64) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function detectLocalTimeZone(): string {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(detected) ? detected : UTC_TIME_ZONE;
}

export function parseTimeZoneCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TIMEZONE_COOKIE}=`));
  if (!match) return null;
  const raw = match.slice(TIMEZONE_COOKIE.length + 1);
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return isValidTimeZone(value) ? value : null;
}

export function readTimeZoneCookie(): string | null {
  if (typeof document === "undefined") return null;
  return parseTimeZoneCookie(document.cookie);
}

export function writeTimeZoneCookie(timeZone: string): void {
  if (typeof document === "undefined") return;
  if (!isValidTimeZone(timeZone) || timeZone === UTC_TIME_ZONE) {
    document.cookie = `${TIMEZONE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
