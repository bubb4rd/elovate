/**
 * elovate Pro entitlement — pure helpers (PREM-00).
 *
 * Client-safe: this module has no server imports. Server-side reads live in
 * `src/lib/premium/queries.ts`; the client context lives in
 * `src/lib/premium/premium-context.tsx`.
 *
 * Entitlement is always derived from `profiles.pro_until`: Pro is active while
 * `pro_until > now()`. A timestamp, not a boolean — lapses and one-time season
 * passes expire on their own.
 */

export type Entitlement = {
  isPro: boolean;
  /** ISO timestamp Pro access lapses, or null if never granted. */
  proUntil: string | null;
};

export const NOT_PRO: Entitlement = { isPro: false, proUntil: null };

/** Does `proUntil` still cover `now`? Tolerates null / undefined / unparseable. */
export function isProActive(
  proUntil: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!proUntil) return false;
  const until = Date.parse(proUntil);
  if (Number.isNaN(until)) return false;
  return until > now.getTime();
}

/** Build an {@link Entitlement} from a raw `pro_until` value. */
export function entitlementFromProUntil(
  proUntil: string | null | undefined,
  now: Date = new Date(),
): Entitlement {
  return {
    isPro: isProActive(proUntil, now),
    proUntil: proUntil ?? null,
  };
}
