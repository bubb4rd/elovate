# Discord server setup checklist

Step-by-step build order for the elovate Discord server. Paste-ready copy (rules,
welcome message, onboarding question text) lives in `docs/discord-server-content.md`.

**Design recap:** three independent axes — **access tier** (who you are),
**functional role** (what you're trusted to do), **automation identity**
(which service is posting). Don't collapse them into one role; a premium
subscriber who also mods is `@premium` + `@community`, not a new combined role.

---

## 1. Roles

Create roles top-to-bottom in this order so the hierarchy is right the first time
(Discord permissions cascade from the top of the role list down).

**Access tiers** (mutually exclusive, assigned by bot/integration, not manually toggled day-to-day):

| Role | Who | Notes |
|---|---|---|
| `@core` | Founders / owner | Full admin |
| `@staff` | Paid or trusted team | Grouped with functional roles below |
| `@premium` | Active paying subscribers | Synced from Stripe — see §5 |
| `@contributor` | Non-staff who ship things (bug bounty, community mods) | Optional, add later |
| `@member` | Verified regular | Default after onboarding completes |
| `@guest` | Just joined, not onboarded | Default on join |

**Functional roles** (stack on top of an access tier, assign manually to staff/trusted members):

| Role | Scope |
|---|---|
| `@platform` | Server infra: channels, roles, integrations, bot config |
| `@community` | Moderation, events, day-to-day engagement |
| `@signal` | Outbound comms: releases, status updates, announcements |
| `@advocate` | Inbound support: tickets, trust & safety, ban appeals |

**Automation identities** (one per integration, no shared tokens/webhooks):

| Role | Used by |
|---|---|
| `@svc-cutoff` | N-02 cutoff-snapshot webhook → posts to `#events` |
| `@svc-ci` | CI/CD pipeline → posts to `#changelog` |
| `@svc-status` | Uptime/status checks → posts to `#status`, `#alerts-internal` |
| `@svc-billing` | Stripe sync → grants/revokes `@premium` |

**Hierarchy placement:** put every `@svc-*` role **directly below `@premium`**, above
`@member`/`@guest`. A service role must never sit above a role it could be tricked
into granting — `@svc-billing` can assign `@premium` but nothing above itself.

## 2. Categories & channels

Create in this order; set category-level permission overwrites once, channels inherit.

| Category | Channels | Default access |
|---|---|---|
| **START HERE** | `#welcome`, `#rules`, `#announcements`, `#changelog`, `#status` | Read-only for `@guest`+; post restricted to `@signal`/`@platform` |
| **NOTIFICATIONS** | `#events`, `#leaderboard-updates`, `#premium-updates` | Read-only, opt-in via channel-follow or self-role; bot-post only |
| **COMMUNITY** | `#general`, `#feature-requests`, `#bug-reports`, `#show-and-tell`, `#off-topic` | Read/write for `@member`+ |
| **PREMIUM** | `#lounge`, `#support`, `#early-access`, `#roadmap-input` | Visible/writable to `@premium`+`@staff` only |
| **SUPPORT** | `#help`, `#support-tickets`, `#faq` | Read/write for `@member`+; tickets scoped to opener + `@advocate` |
| **STAFF** | `#staff-chat`, `#mod-log`, `#bot-config`, `#alerts-internal` | `@staff`+ only |
| **VOICE** | Community VC, Premium VC, Staff VC, AFK | Matches text-channel tiering above |

`#guest`-tier members should only ever see **START HERE**. Onboarding (§4) is what
moves them to `@member` and unlocks the rest.

## 3. Permissions pass

Once categories exist, do a single top-down permission audit before inviting anyone:

1. `@everyone` — no access to anything except what `@guest` needs (i.e., treat
   `@everyone` as `@guest`'s floor).
2. Verify `@svc-*` roles can post in their target channel and **nowhere else**,
   and cannot read `STAFF`.
3. Verify `@premium` cannot see `STAFF`, and `@staff` without `@premium` still
   sees `PREMIUM` (staff need visibility for support).
4. Confirm `#rules` and `#announcements` are read-only for every non-`@signal`/`@platform` role.

## 4. Onboarding

1. Enable Discord's **Membership Screening** (rules-acceptance gate) — new joins
   land in limbo until they agree, no channel access until then.
2. Enable Discord's **Onboarding** flow (Server Settings → Onboarding) with the
   prompts drafted in `docs/discord-server-content.md` — these should self-assign
   the `NOTIFICATIONS` opt-in roles (events / leaderboard / premium-updates) and
   surface the Premium-account-link prompt.
3. On completion, the flow should move the member from `@guest` to `@member`.
4. Post the `#welcome` message (see content doc) before opening invites.

## 5. Integrations

| Integration | Source | Target | Role used |
|---|---|---|---|
| Cutoff snapshot webhook (N-02, already shipped in `supabase/functions/poll-wz-cutoff`) | `DISCORD_CUTOFF_WEBHOOK_URL` | `#events` | `@svc-cutoff` |
| CI/CD | GitHub Actions / Netlify deploy hook | `#changelog` | `@svc-ci` |
| Uptime/status | Status checker (e.g. Netlify/Supabase health) | `#status` + `#alerts-internal` | `@svc-status` |
| Stripe subscription sync | Stripe webhook → bot | Grants/revokes `@premium` on subscribe/cancel/payment-fail | `@svc-billing` |

Each integration gets its **own** webhook URL / bot token — never share one
webhook across services, so a leaked credential has a blast radius of one channel
and one role grant, not the whole server.

Moderation/ticketing bots (Carl-bot or Dyno for auto-mod + logging, Ticket Tool
for `#support-tickets`) should be scoped to `@community`/`@advocate` equivalent
permissions only — no `Administrator`, no role-management above `@svc-billing`.

## 6. Soft launch

1. Invite `@core`/`@staff` only, verify every channel/permission row above.
2. Post `#welcome`, `#rules`, first `#announcements` entry.
3. Confirm `@svc-cutoff` posts land in `#events` (already smoke-tested in prod
   per N-02 — see PR #32).
4. Invite `@premium` cohort, confirm Stripe sync grants the role correctly.
5. Open general invites once onboarding flow + notification opt-ins are verified
   end-to-end.

## Open follow-ups (not covered here)

- Premium ↔ Discord OAuth account linking (needed for §5 Stripe sync to know
  *which* Discord user to grant `@premium` to) — separate build, not content/config.
- CI/CD, status, and billing webhooks are wiring, not copy — build against the
  integration table in §5 when ready.
