# elovate Pro — foundation (PREM-00)

The shared plumbing every `PREM-*` feature builds on. Issue [#85](https://github.com/bubb4rd/elovate/issues/85).

**Shipped in this slice:** entitlement column, read helpers, `<ProGate>`, `usePro()`, a manual grant path.
**Deferred to the Stripe slice:** Checkout, customer portal, webhook, `stripe_customer_id`, the `/pro` pricing page.

---

## Entitlement model

Access is one column — `profiles.pro_until timestamptz` (nullable). A user is Pro while:

```
pro_until > now()
```

A timestamp, never a boolean: lapses and one-time season passes expire on their own, no cron. A lapsed subscriber keeps their `pro_until` value (drives "renew" copy) but `isPro` is false.

`pro_until` is **publicly readable** (it rides on the already-public `profiles` row) — fine, it's just an end date, and the Pro badge (PREM-25) needs it. It is **not writable by `authenticated`**: no column `GRANT`, so a signed-in user cannot set their own. Only `service_role` (the future Stripe webhook) or a superuser (`supabase/scripts/grant_pro.sql`) can. Enforced in `supabase/tests/profiles_rls.test.sql`.

Billing identifiers are **not** stored on `profiles` — they land in a separate owner-only table with the Stripe work.

---

## APIs

| Symbol | Import | Use |
|---|---|---|
| `isProActive(proUntil, now?)` | `@/lib/premium/entitlement` | Pure predicate. Client-safe. |
| `entitlementFromProUntil(proUntil, now?)` | `@/lib/premium/entitlement` | Pure `{ isPro, proUntil }` builder. Client-safe. |
| `isPro(userId)` | `@/lib/premium/queries` | Server. Is *that* user Pro right now? |
| `getViewerEntitlement()` | `@/lib/premium/queries` | Server, request-cached. The current viewer's `{ isPro, proUntil }`. |
| `getViewerProfile().isPro` / `.proUntil` | `@/lib/auth/viewer` | Server. Already loaded wherever the viewer profile is. |
| `<ProGate>` | `@/components/premium/pro-gate` | Server. Paywall wrapper (below). |
| `<PremiumProvider>` / `usePro()` | `@/lib/premium/premium-context` | Client subtrees only (below). |

---

## `<ProGate>` — the paywall

Server Component. Pro viewers get the children; everyone else gets `teaser` blurred behind an upsell.

```tsx
import { ProGate } from "@/components/premium/pro-gate";

<ProGate
  insight="You're +14 SR/game with your top duo and −6 with the next — full table inside."
  teaser={<TeammateBreakdown data={previewRows} />}
>
  <TeammateBreakdown data={allRows} />
</ProGate>
```

Rules (from `PREMIUM-FEATURES-DRAFT.md` §1.4, §5):

- **`teaser` is a real rendered preview** computed from the user's own data — a blurred chart with shape, not an empty box and never a bare padlock. Bare locks convert badly.
- **`insight` is one computed sentence** that proves the feature is worth paying for. Compute it from the same data; keep it specific and personal.
- Compute the preview from a **truncated / coarsened** slice, not the full dataset — the blur is cosmetic, the DOM is still inspectable.

## `usePro()` — client subtrees

Only when Pro status is needed below a `"use client"` boundary that can't take it as a prop (e.g. a live nudge inside the session panel). A server parent resolves and provides it:

```tsx
const entitlement = await getViewerEntitlement();
return (
  <PremiumProvider entitlement={entitlement}>
    <SessionPanel />
  </PremiumProvider>
);
```

```tsx
"use client";
const { isPro } = usePro(); // defaults to locked with no provider — fails safe
```

Prefer the server `<ProGate>` for gating rendered content.

---

## Granting Pro by hand

Until Stripe writes `pro_until`, use `supabase/scripts/grant_pro.sql` in the Supabase SQL editor:

```sql
update public.profiles
set pro_until = greatest(coalesce(pro_until, now()), now()) + interval '30 days'
where slug = 'PLAYER_SLUG';
```

Revoke with `set pro_until = null`.

---

## Next: Stripe slice

- `billing_customers` table (owner-only RLS, no anon grant): `user_id`, `stripe_customer_id`, `updated_at`.
- Checkout sessions for monthly / annual / season pass; price IDs + webhook secret via env, never `NEXT_PUBLIC_`.
- Webhook (`checkout.session.completed`, `customer.subscription.*`) → set `profiles.pro_until` idempotently; verify the signature.
- Customer portal link in `/settings`.
- `/pro` pricing page (the `<ProGate>` CTA target).
