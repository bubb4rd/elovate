# elovate Premium — feature draft

**Status:** Draft / brainstorm. Not scheduled. No billing infra exists yet.
**Goal:** a paid tier that feels *"worth it"* to a Warzone player who is actively grinding SR — mostly **advanced analytics** on top of the climb data elovate already collects, plus a few flex/utility perks.

Working name: **elovate Pro** (alt: "Plus", "Premium"). Pick one before build.

---

## 1. Principles

1. **Free stays genuinely useful.** Live Top 250 board, cutoff numeral + sparkline, single-session climb tracking, the SR calculator, one public profile, reputation, friends, share cards. Nothing in that list moves behind the paywall.
2. **Pro is depth, not access.** Pro buys *more history*, *more breakdowns*, *forecasting*, and *cross-session / cross-squad* views — things that only matter once you have weeks of data and a real goal.
3. **Every Pro feature answers a grinder's question:** "Who should I queue with?" "Am I actually improving?" "Will I make T250 this season?" "When do I tilt?"
4. **Show, don't just gate.** Free users see a blurred/teaser version of a Pro chart with a one-line insight and an upgrade nudge — never a bare lock icon.

---

## 2. What data we already have (grounding)

Per logged WZ match (`climb_matches`): placement, squad elims, your elims, entry fee, placement-SR, elim-SR, capped flag, teammates[], SR before/after, net, timestamp.
Per session: mode, start/end time, start SR.
Profile: slug, privacy, 10 themes, reputation votes, climb goals.

**Not captured yet** (needed for some features below): map, mode variant (BR vs Resurgence), lobby type. Adding a single optional "map / mode" control to the match logger unlocks §3.2 — free users log it, Pro users get the analytics.

---

## 3. Feature backlog

Priority: **P0** = core "worth it" hook · **P1** = strong add · **P2** = later polish

### 3.1 Advanced climb analytics — the core hook

| ID | Feature | Pri | What it shows |
|---|---|---|---|
| PREM-01 | **Teammate breakdown** | P0 | Per teammate: games, win/positive-net rate, avg net SR, SR/hour, avg placement, your-elim share. Ranked table + "best duo / drop this queue" callouts. Directly answers "who should I play with." |
| PREM-02 | **Placement efficiency** | P0 | SR contribution split (placement-SR vs elim-SR) by placement bucket; "your elims carry you" vs "you need top-5 finishes" read; cap-loss counter (SR left on the table from capped games). |
| PREM-03 | **Trend & projection** | P0 | Personal SR/day trend (7d, 30d, season), variance band, and **projected date to hit each climb goal** (Next tier / Iridescent / Live T250) at current pace. Updates as cutoff moves. |
| PREM-04 | **Time-of-day / day-of-week heatmap** | P1 | Net SR and win rate by hour and weekday. "You're +14/game before 9pm, −6 after." |
| PREM-05 | **Tilt / session-decay detection** | P1 | Performance vs games-into-session and vs consecutive losses. Flags the point where your avg net goes negative → suggested stop-loss. Optional live nudge in the session panel ("down 3, your avg session turns here"). |
| PREM-06 | **Session comparison** | P1 | Pick any 2+ past sessions and diff them (pace, placement mix, teammates, elim share). |
| PREM-07 | **Variance & streak stats** | P2 | Longest streaks, standard deviation of net, "swing" games, luck-adjusted SR/game. |

### 3.2 Map & mode breakdowns

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-08 | **Map / mode step in the match submit flow** | Planned — [#55](https://github.com/bubb4rd/elovate/issues/55) | **Free, default, for all users.** After a match is submitted — manual *or* photo — the flow asks: **map picker → then teammates**. Confirmed enum: Rebirth Island, Fortune's Keep, Haven's Hollow (all Resurgence; no BR maps in Ranked Play now, `mode_variant` column kept for when BR rotates back). Both fields nullable / skippable; no backfill. Post-launch, not in the paid tier. Related: [#56](https://github.com/bubb4rd/elovate/issues/56) (merge hardening), [#57](https://github.com/bubb4rd/elovate/issues/57) (`climb_matches` public-read review). |
| PREM-09 | **Per-map performance** | Backlog / review | Avg placement, SR/game, elim share, win rate per map. "Rebirth is +9/game, Verdansk is −2 — stop dropping Verdansk." Free vs Pro split TBD once PREM-08 data exists. |
| PREM-10 | **Map × teammate crosstab** | Backlog / review | Best map for each duo. |

### 3.3 Cutoff & board intelligence

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-11 | **"SR to T250" personal tracker** | P0 | Live gap between your current SR and the live cutoff, your pace vs the cutoff's pace, and a "race" chart projecting both to season end. |
| PREM-12 | **Cutoff alerts** | P1 | Notify when: cutoff moves > X in 24h, you'd be pushed out of T250, you'd break in. Needs the notification sender (roadmap N-02). |
| PREM-13 | **Full cutoff history** | P1 | Free shows the default window; Pro gets the entire season's cutoff/rank-1 chart + season-over-season overlay. |
| PREM-14 | **End-of-season cutoff forecast** | P2 | Model projected final cutoff from historical curve shape. |

### 3.4 History depth & export

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-15 | **Unlimited / multi-season history** | P0 | Free: rolling cap (today's `MAX_MATCHES_PER_MODE` = 500) and date filters limited to `month`. Pro: full retention, all seasons, all-time filters. |
| PREM-16 | **CSV / JSON export** | P1 | Export sessions + matches for spreadsheet nerds and content creators. |
| PREM-17 | **Season archive of your own climbs** | P2 | Per-season recap card ("Season 5: +2,140 SR, 312 games, 41% top-10"). |

### 3.5 Squad tools (leans on Friends)

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-18 | **Squad dashboard** | P1 | Combined view for you + friends who opted in: each member's pace, shared session log, squad SR/day leaderboard. |
| PREM-19 | **Compare vs friend** | P1 | Head-to-head stat sheet (pace, placement mix, elim share, consistency). |
| PREM-20 | **Squad goal race** | P2 | Shared target ("all of us to Crimson"), progress bars, ETA per member. |

### 3.6 Profile flex & content

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-21 | **Pro-only profile themes** | P1 | Animated gradients / exclusive palettes on top of the current 10. Animated rank plate. Pure vanity — reliable impulse-buy driver. |
| PREM-22 | **Premium share cards** | P1 | Extra card designs, GIF/video export of a session, no watermark, custom background. |
| PREM-23 | **Profile view analytics** | P2 | View count + trend on your public profile ("47 views this week"). |
| PREM-24 | **Featured stats / pinned session** | P2 | Curate what shows on your public profile; pin your best climb. |
| PREM-25 | **Pro badge** | P2 | Small mark on profile / board row / reputation card. |

### 3.7 Early access

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PREM-26 | **elovate Desktop beta priority** | P1 | Pro subscribers jump the `desktop_waitlist` queue. |
| PREM-27 | **Multiplayer board early access** | P2 | When MP-02 ships, Pro sees it first. |

---

## 4. Suggested packaging

**One tier to start.** Don't fragment. "elovate Pro" — monthly + discounted annual. Consider a **season pass** (one-time, covers the current WZ season) since the audience thinks in seasons.

### Launch tier — decided

| ID | Feature |
|---|---|
| PREM-01 | Teammate breakdown |
| PREM-02 | Placement efficiency |
| PREM-03 | Trend & projection |
| PREM-11 | "SR to T250" personal tracker |
| PREM-15 | Unlimited / multi-season history |
| PREM-21 | Pro-only profile themes |
| PREM-25 | Pro badge |
| PREM-26 | elovate Desktop beta priority |

That set = "understand my climb, project my goal, keep all my data, look Pro, get in early."

### Backlogged — future addition and/or review

Everything else in §3: PREM-04, PREM-05, PREM-06, PREM-07, PREM-09, PREM-10, PREM-12, PREM-13, PREM-14, PREM-16, PREM-17, PREM-18, PREM-19, PREM-20, PREM-22, PREM-23, PREM-24, PREM-27.

**PREM-08** (map/mode step in the submit flow) is a **separate free feature**, not part of the paid tier — scoped in [#55](https://github.com/bubb4rd/elovate/issues/55), shipping post-launch. Spin-off issues: [#56](https://github.com/bubb4rd/elovate/issues/56), [#57](https://github.com/bubb4rd/elovate/issues/57).

**Rough price anchor:** $4–6/mo or ~$30/yr or ~$8/season. Validate against Warzone tracker comps (wzstats / codtracker premium tiers) before committing.

---

## 5. Implementation notes (high level)

- **Billing:** Stripe Checkout + customer portal. Webhook → set `profiles.pro_until timestamptz` (nullable). Entitlement = `pro_until > now()`. Keep it a date, not a bool, so lapses are automatic and season passes work.
- **Entitlement check:** one server helper (`isPro(userId)`), one client hook (`usePro()`), one `<ProGate>` wrapper that renders the teaser + upsell when locked.
- **RLS:** analytics run over the user's own `climb_matches` / `climb_sessions` — no new exposure. Squad features (PREM-18/19) need explicit opt-in rows (`squad_share`) with RLS scoped to accepted friends only.
- **Schema:** PREM-08 adds `map text` + `mode_variant text` (both nullable) to `climb_matches` via migration. Everything in §3.1 is computed from existing columns — no schema change, can be a pure client/server analytics module over synced history.
- **Notifications (PREM-12):** blocked on roadmap N-02 (sender job). Don't promise alerts until that exists.
- **Free-tier caps:** enforce `MAX_MATCHES_PER_MODE` + date-filter ceiling for non-Pro; Pro raises/removes both. Make sure historical data isn't *deleted* for free users who lapse — just hidden past the window.
- **Teasers:** every gated chart needs a real blurred preview with one computed insight line. Bare locks convert badly.

---

## 6. Open questions

1. Name: Pro / Plus / Premium?
2. Subscription only, or also a one-time **season pass**?
3. Is any of this in scope before the Sep 7 WZ launch, or strictly post-launch (roadmap §2.F item 4 is "deeper climb analytics")? Recommendation: **post-launch**, first paid feature ~4–6 weeks after.
4. ~~Do we gate map/mode *logging* (PREM-08) as free?~~ **Decided: yes — free and default for all users, added to the submit flow (map → teammates). Per-map analytics (PREM-09) free-vs-Pro split is still open.**
5. Squad sharing privacy model — opt-in per friend, or all-or-nothing?

---

## 10. Issue tracking

Milestone **[Premium v1](https://github.com/bubb4rd/elovate/milestone/2)**. Label `premium`.

| ID | Issue | Milestone |
|---|---|---|
| PREM-00 | [#85](https://github.com/bubb4rd/elovate/issues/85) Premium foundation — billing, entitlement, ProGate | Premium v1 |
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
| PREM-07 | [#70](https://github.com/bubb4rd/elovate/issues/70) Variance & streak stats | backlog |
| PREM-09 | [#71](https://github.com/bubb4rd/elovate/issues/71) Per-map performance | backlog / review |
| PREM-10 | [#72](https://github.com/bubb4rd/elovate/issues/72) Map × teammate crosstab | backlog / review |
| PREM-12 | [#73](https://github.com/bubb4rd/elovate/issues/73) Cutoff alerts (blocked on N-02) | backlog |
| PREM-13 | [#74](https://github.com/bubb4rd/elovate/issues/74) Full-season cutoff history | backlog |
| PREM-14 | [#75](https://github.com/bubb4rd/elovate/issues/75) Cutoff forecast | backlog |
| PREM-16 | [#76](https://github.com/bubb4rd/elovate/issues/76) CSV / JSON export | backlog |
| PREM-17 | [#77](https://github.com/bubb4rd/elovate/issues/77) Personal season archive | backlog |
| PREM-18 | [#78](https://github.com/bubb4rd/elovate/issues/78) Squad dashboard | backlog |
| PREM-19 | [#79](https://github.com/bubb4rd/elovate/issues/79) Compare vs friend | backlog |
| PREM-20 | [#80](https://github.com/bubb4rd/elovate/issues/80) Squad goal race | backlog |
| PREM-22 | [#81](https://github.com/bubb4rd/elovate/issues/81) Premium share cards | backlog |
| PREM-23 | [#82](https://github.com/bubb4rd/elovate/issues/82) Profile view analytics | backlog |
| PREM-24 | [#83](https://github.com/bubb4rd/elovate/issues/83) Featured stats / pinned session | backlog |
| PREM-27 | [#84](https://github.com/bubb4rd/elovate/issues/84) MP board early access | backlog |

Spin-offs from #55: [#56](https://github.com/bubb4rd/elovate/issues/56) (merge hardening), [#57](https://github.com/bubb4rd/elovate/issues/57) (`climb_matches` public-read review).
