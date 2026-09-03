/**
 * `Date.now()` behind a module boundary (PREM-03).
 *
 * Server Components must stay pure, so they read "now" from here instead of
 * calling the impure global inline — the same reason `src/lib/data/live-history.ts`
 * isolates its time access. Pure-analytics code still takes `now` as an explicit
 * argument; this is only for the render-time anchor.
 */
export function nowMs(): number {
  return Date.now();
}
