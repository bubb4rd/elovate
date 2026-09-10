# elovate Pro — Features (Final)

**Status:** Final. This is the authoritative scope for **elovate Pro** — what ships in
the paid tier, what stays free, and the spec each feature is built against.

Supersedes the brainstorm in [`PREMIUM-FEATURES-DRAFT.md`](./PREMIUM-FEATURES-DRAFT.md)
(kept for rationale, principles, and pricing research). Build/infra plumbing lives in
`docs/PREMIUM-FOUNDATION.md` (on the `premium/v1` branch) — the `profiles.pro_until`
model and the `isPro()` / `usePro()` / `<ProGate>` APIs.

**Name:** elovate Pro. One tier. Monthly + discounted annual; a one-time season pass is
still open (see §7).

> Status values in this doc reflect the `premium/v1` integration branch as of
> **2026-09-09**. The linked GitHub issue is the source of truth for live state.

---

## 1. Scope at a glance

### 1.1 Launch tier — locked (milestone: Premium v1)

| ID | Feature | Issue | Status |
|---|---|---|---|
| PREM-00 | Foundation — entitlement, `<ProGate>`, billing | [#85](https://github.com/bubb4rd/elovate/issues/85) | Merged to `premium/v1` |
| PREM-01 | Teammate breakdown | [#59](https://github.com/bubb4rd/elovate/issues/59) | Merged to `premium/v1` |
| PREM-02 | Placement efficiency | [#60](https://github.com/bubb4rd/elovate/issues/60) | Planned |
| PREM-03 | Trend & projection | [#61](https://github.com/bubb4rd/elovate/issues/61) | In progress — `premium/prem-03-trend-projection` |
| PREM-11 | "SR to T250" personal tracker | [#62](https://github.com/bubb4rd/elovate/issues/62) | Planned |
| PREM-15 | Unlimited / multi-season history | [#63](https://github.com/bubb4rd/elovate/issues/63) | Planned |
| PREM-21 | Pro-only profile themes | [#64](https://github.com/bubb4rd/elovate/issues/64) | Planned |
| PREM-25 | Pro badge | [#65](https://github.com/bubb4rd/elovate/issues/65) | Planned |
| PREM-26 | elovate Desktop beta priority | [#66](https://github.com/bubb4rd/elovate/issues/66) | Planned |

The set reads as: *understand my climb, project my goal, keep all my data, look Pro,
get in early.*

### 1.2 Free forever — never gated

Live Top 250 board · cutoff numeral + sparkline · single-session climb tracking · the SR
calculator · one public profile · reputation · friends · share cards · **map / mode
logging** (PREM-08).

### 1.3 Explicitly not Pro

- **PREM-08** — map / mode step in the match submit flow. Free and default for all
  users, scoped in [#55](https://github.com/bubb4rd/elovate/issues/55). Per-map
  *analytics* (PREM-09) free-vs-Pro split is still open.

---

## 2. Feature spec template

Copy this block for every Pro feature. Keep it filled in as the feature is built — it is
the acceptance contract, not a wishlist.

```markdown
### PREM-XX — <name>

| | |
|---|---|
| **Status** | Planned \| In progress \| Shipped \| Backlog |
| **Tier** | Launch \| Backlog \| Free |
| **Issue** | #NN |
| **Branch / PR** | — |
| **Depends on** | PREM-00 (+ others) |

**Grinder's question:** "<the one question this answers>"

**What it does:** <one paragraph — the Pro experience>

**Data source:** <tables / columns>. Schema change? <none \| migration: ...>.
RLS: <user's own rows only \| opt-in share rows \| n/a>.

**Free-tier behavior:** <what a non-Pro sees — blurred preview + one *computed*
insight line + upgrade nudge. Never a bare lock.>

**Pro behavior:** <the full view>

**Acceptance criteria:**
- [ ] <feature-specific checks>
- [ ] `<ProGate>` wraps the full view; teaser renders for non-Pro with a real computed insight line
- [ ] Low/empty-data state handled (< N games / < 7 days)
- [ ] Behaviour when entitlement lapses: view locks, data is preserved, profile not broken

**Open decisions:** <or "none">
```

---

## 3. Launch tier — specs

### PREM-00 — Foundation

| | |
|---|---|
| **Status** | Merged to `premium/v1` |
| **Tier** | Launch |
| **Issue** | [#85](https://github.com/bubb4rd/elovate/issues/85) |
| **Branch / PR** | `premium/prem-00-foundation` |
| **Depends on** | — |

**Grinder's question:** n/a — plumbing.

**What it does:** Entitlement model + gating primitives every other PREM feature builds
on. `profiles.pro_until timestamptz` (nullable); entitlement = `pro_until > now()`.
Server helper `isPro(userId)`, client hook `usePro()`, `<ProGate>` wrapper that renders
the teaser + upsell when locked. Stripe Checkout + customer portal and the
`checkout.session.completed` / `customer.subscription.*` webhook that sets `pro_until`
idempotently are the deferred slice.

**Data source:** `profiles.pro_until`. Schema change: migration
`20260902000000_add_profile_pro_until.sql`. RLS: `pro_until` readable by owner; writable
only by service role / webhook.

**Free-tier behavior:** n/a.

**Pro behavior:** n/a.

**Acceptance criteria:**
- [x] `pro_until` column + migration + RLS test
- [x] `isPro()` / `usePro()` / `<ProGate>` APIs
- [x] `supabase/scripts/grant_pro.sql` for manual grants
- [ ] Stripe Checkout + portal + webhook (deferred slice)

**Open decisions:** none — see `docs/PREMIUM-FOUNDATION.md`.

### PREM-01 — Teammate breakdown

| | |
|---|---|
| **Status** | Merged to `premium/v1` |
| **Tier** | Launch |
| **Issue** | [#59](https://github.com/bubb4rd/elovate/issues/59) |
| **Branch / PR** | `premium/prem-01-teammate-breakdown` |
| **Depends on** | PREM-00 |

**Grinder's question:** "Who should I queue with?"

**What it does:** Per-teammate table — games together, win / positive-net rate, avg net
SR, SR/hour, avg placement, your share of squad elims. Ranked, with "best duo" and "drop
this queue" callouts.

**Data source:** `climb_matches` — `teammates[]`, `net`, `timestamp`, `placement`,
squad/your elims. Schema change: none. RLS: user's own rows only.

**Free-tier behavior:** blurred table with the single top row revealed and one computed
line — *"Your best duo: {name}, +{n} SR/game over {g} games."*

**Pro behavior:** full ranked table, all teammates above a minimum-games threshold, sort
controls, callouts.

**Acceptance criteria:**
- [ ] Per-teammate aggregates match a hand computation on a fixture
- [ ] Minimum-games threshold before a teammate is ranked / gets a callout
- [ ] `<ProGate>` + teaser with a real computed insight line
- [ ] Empty state (no teammates logged) and single-teammate state
- [ ] Lapsed entitlement locks the view; match history untouched

**Open decisions:** none.

### PREM-02 — Placement efficiency

| | |
|---|---|
| **Status** | Planned |
| **Tier** | Launch |
| **Issue** | [#60](https://github.com/bubb4rd/elovate/issues/60) |
| **Branch / PR** | — |
| **Depends on** | PREM-00 |

**Grinder's question:** "What do I need to do to climb — frags or placement?"

**What it does:** Splits SR contribution into placement-SR vs elim-SR by placement
bucket, gives a plain-language read ("your elims carry you" vs "you need top-5
finishes"), and a cap-loss counter — SR left on the table from capped games.

**Data source:** `climb_matches` — placement-SR, elim-SR, capped flag, placement.
Schema change: none. RLS: user's own rows only.

**Free-tier behavior:** blurred split chart + one line — *"{x}% of your SR is elims. Cap
cost you ~{n} SR this season."*

**Pro behavior:** full split by bucket, cap-loss total, the read.

**Acceptance criteria:**
- [ ] Placement-SR / elim-SR split per bucket matches a fixture
- [ ] Cap-loss total = sum of (uncapped gain − actual gain) on capped games
- [ ] Plain-language read has defined thresholds
- [ ] `<ProGate>` + teaser with computed insight line
- [ ] Low-data state (< N games)

**Open decisions:** bucket boundaries (top-1 / 2–3 / 4–5 / 6–10 / 11+?).

### PREM-03 — Trend & projection

| | |
|---|---|
| **Status** | In progress |
| **Tier** | Launch |
| **Issue** | [#61](https://github.com/bubb4rd/elovate/issues/61) |
| **Branch / PR** | `premium/prem-03-trend-projection` |
| **Depends on** | PREM-00 |

**Grinder's question:** "Am I actually improving, and will I make my goal?"

**What it does:** Personal SR/day trend over 7-day, 30-day, and season windows with a
variance band, plus a projected calendar date to hit each climb goal (next tier /
Iridescent / live T250) at current pace. Re-projects as the live cutoff moves.

**Data source:** `climb_matches` — `net`, `timestamp`; `profiles` climb goals; live
cutoff history. Schema change: none. RLS: user's own rows only.

**Free-tier behavior:** blurred trend sparkline + one line — *"At your 30-day pace: ~{date}
to T250."*

**Pro behavior:** all three windows, variance band, per-goal ETA, cutoff-aware
re-projection.

**Acceptance criteria:**
- [ ] SR/day for each window matches a fixture
- [ ] Variance band derived from net-SR standard deviation
- [ ] Per-goal ETA = (goal − current) / pace, clamped, "unreachable this season" case
- [ ] Projection updates when the cutoff snapshot changes
- [ ] "Not enough data" state (< 7 days of matches)
- [ ] `<ProGate>` + teaser with computed insight line

**Open decisions:** pace = simple mean vs linear-regression slope.

### PREM-11 — "SR to T250" personal tracker

| | |
|---|---|
| **Status** | Planned |
| **Tier** | Launch |
| **Issue** | [#62](https://github.com/bubb4rd/elovate/issues/62) |
| **Branch / PR** | — |
| **Depends on** | PREM-00, PREM-03 (shared projection math) |

**Grinder's question:** "How far am I from T250, and am I catching up or falling behind?"

**What it does:** Live gap between your current SR and the live cutoff, your pace vs the
cutoff's pace, and a "race" chart projecting both lines to season end.

**Data source:** latest `climb_matches` SR for the user; live cutoff history. Schema
change: none. RLS: user's own rows only.

**Free-tier behavior:** the gap number only — *"You're {n} SR below the cutoff."* Race
chart blurred.

**Pro behavior:** gap + dual-pace + race projection to season end.

**Acceptance criteria:**
- [ ] Gap = user SR − live cutoff, updates on new cutoff snapshot
- [ ] Cutoff pace from the cutoff history series
- [ ] Race projection renders both lines to the season-end date
- [ ] "Already in T250" state (gap ≥ 0) — shows margin, not deficit
- [ ] `<ProGate>` + teaser with the gap line

**Open decisions:** none.

### PREM-15 — Unlimited / multi-season history

| | |
|---|---|
| **Status** | Planned |
| **Tier** | Launch |
| **Issue** | [#63](https://github.com/bubb4rd/elovate/issues/63) |
| **Branch / PR** | — |
| **Depends on** | PREM-00 |

**Grinder's question:** "Where's my old data?"

**What it does:** Free keeps the rolling cap (`MAX_MATCHES_PER_MODE`, currently 500) and
date filters limited to `month`. Pro removes the cap — full retention, every season,
all-time filters.

**Data source:** existing history store; enforcement in the query layer. Schema change:
none. **Data for lapsed Pro users is hidden past the free window, never deleted.**

**Free-tier behavior:** hits the cap / filter ceiling with an upsell at the boundary,
not an error.

**Pro behavior:** uncapped history, season selector, all-time date filters.

**Acceptance criteria:**
- [ ] Non-Pro capped at current `MAX_MATCHES_PER_MODE` + `month` filter ceiling
- [ ] Pro: no cap, season + all-time filters
- [ ] Lapsed Pro — older rows preserved in the DB, just re-hidden
- [ ] Upsell renders at the boundary (scroll / filter), gated content not fetched for non-Pro
- [ ] Re-subscribing restores full visibility with no re-sync

**Open decisions:** does the season selector need a `season_id` backfill on old matches?

### PREM-21 — Pro-only profile themes

| | |
|---|---|
| **Status** | Planned |
| **Tier** | Launch |
| **Issue** | [#64](https://github.com/bubb4rd/elovate/issues/64) |
| **Branch / PR** | — |
| **Depends on** | PREM-00 |

**Grinder's question:** vanity — "make my profile look Pro."

**What it does:** Animated gradients / exclusive palettes on top of the current 10, plus
an animated rank plate. Pure flex; a reliable impulse-buy driver.

**Data source:** `profiles` theme value. Schema change: extend the theme enum with Pro
values (no new column). RLS: unchanged.

**Free-tier behavior:** Pro themes appear in the picker with a locked preview.

**Pro behavior:** select and apply any Pro theme; animated rank plate.

**Acceptance criteria:**
- [ ] N Pro themes + animated rank plate
- [ ] Locked preview in the picker for non-Pro
- [ ] Server rejects a Pro-theme write from a non-Pro account
- [ ] Lapsed Pro falls back to the default theme — profile still renders, not broken
- [ ] Re-subscribing restores the previously selected Pro theme

**Open decisions:** how many Pro themes at launch (3? 5?).

### PREM-25 — Pro badge

| | |
|---|---|
| **Status** | Planned |
| **Tier** | Launch |
| **Issue** | [#65](https://github.com/bubb4rd/elovate/issues/65) |
| **Branch / PR** | — |
| **Depends on** | PREM-00 |

**Grinder's question:** status.

**What it does:** A small mark on the public profile, the Top 250 board row, and the
reputation card, shown for any account with an active entitlement.

**Data source:** derived from `isPro()`. Schema change: none. RLS: n/a — entitlement
state is already owner-readable; the badge is a public boolean.

**Free-tier behavior:** sees other users' badges; none on their own.

**Pro behavior:** badge on profile header, board row, reputation card.

**Acceptance criteria:**
- [ ] Badge renders in all three surfaces from a single `isPro` check
- [ ] Visible to all viewers, not just the owner
- [ ] Clears within one session / cache TTL of entitlement lapse
- [ ] No layout shift on board rows when the badge is absent

**Open decisions:** does the badge expose *anything* beyond "is Pro" (e.g. tenure)? Default: no.

### PREM-26 — elovate Desktop beta priority

| | |
|---|---|
| **Status** | Planned |
| **Tier** | Launch |
| **Issue** | [#66](https://github.com/bubb4rd/elovate/issues/66) |
| **Branch / PR** | — |
| **Depends on** | PREM-00 |

**Grinder's question:** "Get me into the desktop app sooner."

**What it does:** Pro subscribers jump the `desktop_waitlist` queue when invites go out.

**Data source:** `desktop_waitlist`; ordering applied at invite-selection time by
`isPro()` (not stored priority). Schema change: none required. RLS: unchanged.

**Free-tier behavior:** normal queue position.

**Pro behavior:** selected ahead of non-Pro entries in each invite batch.

**Acceptance criteria:**
- [ ] Invite selection orders active-Pro entries ahead of the rest
- [ ] Pro status checked at send time, not at signup time
- [ ] Desktop page messaging — "Pro members skip the line"
- [ ] A Pro user who joined the waitlist late still outranks earlier free entries

**Open decisions:** tie-break among Pro entries — signup order (default) or entitlement age.

---

## 4. Backlog

Not in the launch tier. Priorities carried from the draft: **P1** strong add · **P2**
later polish · **review** = free-vs-Pro split undecided.

### 4.1 Advanced climb analytics

| ID | Feature | Pri | What it shows |
|---|---|---|---|
| PREM-04 | Time-of-day / day-of-week heatmap | P1 | Net SR and win rate by hour and weekday. "You're +14/game before 9pm, −6 after." |
| PREM-05 | Tilt / session-decay detection | P1 | Performance vs games-into-session and vs consecutive losses; flags where avg net turns negative → suggested stop-loss. Optional live nudge in the session panel. |
| PREM-06 | Session comparison | P1 | Diff any 2+ past sessions — pace, placement mix, teammates, elim share. |

### 4.2 Map & mode breakdowns

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-09 | Per-map performance | review | Avg placement, SR/game, elim share, win rate per map. Free-vs-Pro split TBD once PREM-08 data exists. |

*(PREM-08, the logging step itself, is free — see §1.3.)*

### 4.3 Cutoff & board intelligence

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-12 | Cutoff alerts | P1 | Notify when the cutoff moves > X in 24h, or you'd be pushed out of / break into T250. **Blocked on roadmap N-02** (notification sender). |
| PREM-13 | Full cutoff history | P1 | Pro gets the entire season's cutoff / rank-1 chart + season-over-season overlay. |
| PREM-14 | End-of-season cutoff forecast | P2 | Project the final cutoff from historical curve shape. |

### 4.4 History depth & export

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-16 | CSV / JSON export | P1 | Export sessions + matches for spreadsheets and content creators. |
| PREM-17 | Season archive of your own climbs | P2 | Per-season recap card ("Season 5: +2,140 SR, 312 games, 41% top-10"). |

### 4.5 Squad tools (lean on Friends)

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-18 | Squad dashboard | P1 | Combined view for opted-in friends — each member's pace, shared session log, squad SR/day leaderboard. Needs `squad_share` opt-in rows with RLS scoped to accepted friends. |
| PREM-19 | Compare vs friend | P1 | Head-to-head stat sheet — pace, placement mix, elim share, consistency. |

### 4.6 Profile flex & content

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-22 | Premium share cards | P1 | Extra card designs, GIF/video export of a session, no watermark, custom background. |
| PREM-23 | Profile view analytics | P2 | View count + trend on your public profile ("47 views this week"). |
| PREM-24 | Featured stats / pinned session | P2 | Curate what shows on your public profile; pin your best climb. |

### 4.7 Early access

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-27 | Multiplayer board early access | P2 | When MP-02 ships, Pro sees it first. |

### 4.8 Cut

Dropped from the plan (2026-09-09). Recorded here so they aren't re-proposed.

| ID | Feature | Issue |
|---|---|---|
| PREM-07 | Variance & streak stats | [#70](https://github.com/bubb4rd/elovate/issues/70) |
| PREM-10 | Map × teammate crosstab | [#72](https://github.com/bubb4rd/elovate/issues/72) |
| PREM-20 | Squad goal race | [#80](https://github.com/bubb4rd/elovate/issues/80) |

---

## 5. Packaging & pricing

**One tier.** Don't fragment. elovate Pro — monthly + discounted annual. A one-time
**season pass** (covers the current WZ season) is under consideration since the audience
thinks in seasons.

**Rough price anchor (not locked):** $4–6/mo, ~$30/yr, ~$8/season. Validate against
Warzone tracker comps (wzstats / codtracker premium) before committing.

**Entitlement:** `profiles.pro_until` is a timestamp, not a bool — lapses are automatic
and a season pass is just a fixed-window grant. Every gated surface uses `<ProGate>`
with a real blurred teaser + one computed insight line. Bare locks convert badly.

---

## 6. Issue tracking

Milestone **[Premium v1](https://github.com/bubb4rd/elovate/milestone/2)**. Label `premium`.

| ID | Issue | Tier |
|---|---|---|
| PREM-00 | [#85](https://github.com/bubb4rd/elovate/issues/85) Premium foundation | Premium v1 |
| PREM-01 | [#59](https://github.com/bubb4rd/elovate/issues/59) Teammate breakdown | Premium v1 |
| PREM-02 | [#60](https://github.com/bubb4rd/elovate/issues/60) Placement efficiency | Premium v1 |
| PREM-03 | [#61](https://github.com/bubb4rd/elovate/issues/61) Trend & goal projection | Premium v1 |
| PREM-11 | [#62](https://github.com/bubb4rd/elovate/issues/62) SR-to-T250 tracker | Premium v1 |
| PREM-15 | [#63](https://github.com/bubb4rd/elovate/issues/63) Unlimited history | Premium v1 |
| PREM-21 | [#64](https://github.com/bubb4rd/elovate/issues/64) Pro profile themes | Premium v1 |
| PREM-25 | [#65](https://github.com/bubb4rd/elovate/issues/65) Pro badge | Premium v1 |
| PREM-26 | [#66](https://github.com/bubb4rd/elovate/issues/66) Desktop beta priority | Premium v1 |
| PREM-08 | [#55](https://github.com/bubb4rd/elovate/issues/55) Map/mode submit step (**free**, not paid) | — |
| PREM-04 | [#67](https://github.com/bubb4rd/elovate/issues/67) Time-of-day heatmap | backlog |
| PREM-05 | [#68](https://github.com/bubb4rd/elovate/issues/68) Tilt / session-decay | backlog |
| PREM-06 | [#69](https://github.com/bubb4rd/elovate/issues/69) Session comparison | backlog |
| PREM-09 | [#71](https://github.com/bubb4rd/elovate/issues/71) Per-map performance | backlog / review |
| PREM-12 | [#73](https://github.com/bubb4rd/elovate/issues/73) Cutoff alerts (blocked on N-02) | backlog |
| PREM-13 | [#74](https://github.com/bubb4rd/elovate/issues/74) Full-season cutoff history | backlog |
| PREM-14 | [#75](https://github.com/bubb4rd/elovate/issues/75) Cutoff forecast | backlog |
| PREM-16 | [#76](https://github.com/bubb4rd/elovate/issues/76) CSV / JSON export | backlog |
| PREM-17 | [#77](https://github.com/bubb4rd/elovate/issues/77) Personal season archive | backlog |
| PREM-18 | [#78](https://github.com/bubb4rd/elovate/issues/78) Squad dashboard | backlog |
| PREM-19 | [#79](https://github.com/bubb4rd/elovate/issues/79) Compare vs friend | backlog |
| PREM-22 | [#81](https://github.com/bubb4rd/elovate/issues/81) Premium share cards | backlog |
| PREM-23 | [#82](https://github.com/bubb4rd/elovate/issues/82) Profile view analytics | backlog |
| PREM-24 | [#83](https://github.com/bubb4rd/elovate/issues/83) Featured stats / pinned session | backlog |
| PREM-27 | [#84](https://github.com/bubb4rd/elovate/issues/84) MP board early access | backlog |

Spin-offs from #55: [#56](https://github.com/bubb4rd/elovate/issues/56) (merge
hardening), [#57](https://github.com/bubb4rd/elovate/issues/57) (`climb_matches`
public-read review).

---

## 7. Open questions

1. Subscription only, or also a one-time **season pass**?
2. Final price, validated against wzstats / codtracker comps.
3. PREM-09 (per-map performance) — free, Pro, or split?
4. Squad-sharing privacy model (PREM-18/19) — opt-in per friend, or all-or-nothing?
5. PREM-03 pace math — simple mean vs regression slope (also feeds PREM-11).

---

## 8. Related docs

- [`PREMIUM-FEATURES-DRAFT.md`](./PREMIUM-FEATURES-DRAFT.md) — original brainstorm:
  principles, data grounding, pricing research, decision history.
- `PREMIUM-FOUNDATION.md` (`premium/v1`) — `pro_until` model, `<ProGate>` / `usePro()` /
  `isPro()` APIs, deferred Stripe slice.
- [`LAUNCH_ROADMAP.md`](./LAUNCH_ROADMAP.md) — where Pro sits relative to the Sep 7 WZ launch.
