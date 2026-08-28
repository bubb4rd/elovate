export const DEFAULT_ACTION_COOLDOWN_SEC = 60;

/** Extract wait seconds from provider/API rate-limit copy. */
export function parseRetryAfterSeconds(message: string): number | null {
  const lower = message.toLowerCase();

  const afterSeconds = lower.match(/after\s+(\d+)\s*seconds?/);
  if (afterSeconds) return Math.max(1, Number(afterSeconds[1]));

  const inSeconds = lower.match(/(?:in|after)\s+(\d+)\s*s(?:ec(?:ond)?s?)?\b/);
  if (inSeconds) return Math.max(1, Number(inSeconds[1]));

  if (/\ba minute\b/.test(lower)) return 60;

  const minutes = lower.match(/(\d+)\s*minutes?/);
  if (minutes) return Math.max(1, Number(minutes[1]) * 60);

  if (
    /\brate\b|\bsecur|\btoo many|\bretry\b|\bwait\b/.test(lower)
  ) {
    const bare = lower.match(/(\d+)\s*s(?:ec(?:ond)?s?)?\b/);
    if (bare) return Math.max(1, Number(bare[1]));
  }

  return null;
}

export function isRateLimitMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    parseRetryAfterSeconds(message) != null ||
    lower.includes("rate limit") ||
    lower.includes("too many") ||
    lower.includes("for security purposes") ||
    lower.includes("over_email_send_rate_limit")
  );
}

export function withCooldownLabel(label: string, remainingSec: number): string {
  if (remainingSec <= 0) return label;
  return `${label} (${remainingSec}s)`;
}
