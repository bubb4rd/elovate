# elovate — Brand voice & blog post format

**Status:** Canonical. This is the voice source of truth for `/blog` and any elovate-authored
copy. Derived from shipped product copy, `docs/`, and commit history — not from a style
guide written in the abstract.

**Consumers:** `BLOG-01` encodes §4–§6 as TypeScript types. Changing a vocabulary or label
format here means changing a type in `src/lib/blog/types.ts`. Decide once.

**One post kind: the changelog.** Narrative dev-diary posts were considered and dropped.
Context that used to justify a separate kind now lives in a post's lead-in (§5).

**No tags.** Cut for v1 — with a single post kind and a short archive, tags are decoration,
not navigation. Revisit past ~20 posts.

---

## 1. VOICE PROFILE

```text
VOICE PROFILE
=============
Author: team elovate (collective; posts may be written by a human or an agent)
Goal: editorial technical release log at /blog — changelog posts, one kind
Confidence: High. Large in-repo corpus across product copy, docs, and commits.

Source Set
- Shipped product copy: home hero, /desktop, onboarding, season-phase strings,
  save-climb CTA, error recovery, live-status
- docs/: LAUNCH_ROADMAP.md, PREMIUM-FEATURES.md, OPS-06-error-monitoring.md, README.md
- Commit history: ~60 subjects on master (Conventional Commits + workstream IDs)

Rhythm
- Short declaratives. Product copy averages 6-12 words; almost no sentence exceeds 20.
- Docs run longer but break constantly into tables, bullets, and bold status lines.
- Fragments are allowed as labels ("Standings frozen until ranked resumes"), not as prose.
- No sentence-length monotony: a long qualifying sentence is followed by a short flat one.

Compression
- High. State the rule, then stop. "The regular season is over." / "Top 250 roster keeps
  rendering." Two facts, two sentences, no bridge between them.
- Explanation is earned by a mechanism, not by restating the claim in softer words.
- Every paragraph should survive deletion of its first sentence. If it doesn't, that
  sentence was throat-clearing.

Capitalization
- Conventional sentence case for headings, titles, and UI labels: "Save this session",
  "Something went wrong". Not Title Case.
- "elovate" is always lowercase, including at the start of a sentence. This is an observed
  brand rule (wordmark, "elovate Pro", "elovate Desktop"), not a stylistic affectation.
- Proper nouns keep their caps: Warzone, Ranked Series, Top 250, Discord, Supabase,
  CODMunity, Netlify, Season 5.
- Product names capitalize the noun only: "elovate Desktop", "elovate Pro".

Parentheticals
- Used for qualification and narrowing, never for jokes or asides.
  Observed: "(default `50`)", "(preferred for hosting)", "(ingest only, never `NEXT_PUBLIC_`)".
- Em dashes carry the same job in prose — a correction or a tightening of the claim.
- Never a wink at the reader. No "(yes, really)". No "(we've all been there)".

Question Use
- Rare, and only to ask the reader for real input. Observed only in onboarding:
  "Where are you sitting right now in ranked?", "What are you chasing this season?"
- Never rhetorical. Never as an opener. Never as a hook.
- A blog post may end on an open question only if it is a genuine unresolved decision the
  reader could weigh in on.

Claim Style
- Claims are stated flatly and backed by a mechanism or a number in the same breath.
  Observed: "The home 24h gain uses that table only — never generated seed snapshots."
- Negative claims are stated as hard rules: "never serve seed players or a seed cutoff as
  live data", "Do not commit credential files."
- Scope is fenced explicitly. Docs ship literal "Explicitly out of scope" and "Explicitly
  not Pro" sections. Carry that habit into posts: say what did not change.
- Uncertainty is labeled, not hedged. "Data-source spike first" beats "we may explore".

Preferred Moves
- Name the mechanism: "merge live cutoff point by timestamp, not array position".
- Cite what the reader can observe or verify: a number, a date, a timing, a page, a
  visible label, a domain, or a named job they'd see in ops output (`poll-wz-cutoff`).
- Say what a change means for someone using the site, not what it means in the codebase.
- Give the number: 15-minute poll, 24h of history, `MIN_CUTOFF_DELTA` default 50.
- State the constraint before the solution.
- Explain why the obvious fix was wrong, inline, in a clause — not as its own section.
- Second person for anything the reader does: "Register or sign in to keep matches and
  teammates on every device."
- Close a loop opened earlier in the post, or say it's still open.

Banned Moves
- Hype adjectives: seamless, powerful, robust, blazing, game-changing, revolutionary.
- Exclamation marks. Zero appear anywhere in shipped copy.
- "Excited to share", "thrilled to announce", "we're proud to".
- Founder-journey filler, lessons-learned wrap-ups, "the journey continues".
- Fake curiosity hooks and bait questions.
- "not X, just Y" as an opener. (Contrast is fine when it corrects a real misreading —
  "it is the acceptance contract, not a wishlist" — but never as a rhythm trick.)
- "no fluff", "let's dive in", "buckle up".
- Forced lowercase prose. Lowercase "elovate" is the only lowercase rule.
- Emoji in post body or headings.
- Vague improvement claims: "improved performance", "various bug fixes", "under the hood".
- First person singular. Posts are team elovate, not a person.
- Repo and tracker insider speech: PR numbers, issue numbers, commit SHAs, branch names,
  workstream IDs (WZ-17, OPS-07, PREM-03), "merged", "opened a PR", "landed on master".
  The reader is a player or a curious engineer, not a contributor. This bookkeeping
  belongs in commit messages and `TASKS.md`.
- Process narration: "we scoped it", "we spiked it", "we picked up the ticket".
- Devspeak. Internal type, function, and pattern names the reader cannot observe:
  "state machine", "enum", "RPC", "resolution order", `getActiveSeasonPhase()`,
  `shouldUseLiveBoard()`, `unstable_cache`. Name the behavior, not the implementation.
- Architecture tourism. How a thing is built is only interesting when it explains what
  the reader now sees.
- Chronology theater: "first we... then we... finally we...". Show the problem and the
  fix, not the calendar.

CTA Rules
- At most one CTA per post, and only when there is a real next action.
- Legitimate CTAs: join the Desktop waitlist, open the board, check a season page.
- The CTA is a plain link in a final short line. No button-speak, no urgency language.
- Changelog posts usually need no CTA at all. A changelog is the payload.

Channel Notes
- /blog entries: structured, no narrative voice, no "we". See §4.
- /blog lead-in: optional, 40-100 words, plain language, "we" only for decisions. See §5.
- Commit messages: unchanged — Conventional Commits, imperative, workstream ID in parens.
- Discord/X (future): lift the summary verbatim. If the summary doesn't stand alone as a
  post, the summary is wrong.
```

---

## 2. The source-set split (do not average these)

The corpus contains two distinct registers. Blog posts inherit different ones.

| Register | Where it lives | Traits | Inherited by |
|---|---|---|---|
| **Product UI** | hero, onboarding, CTAs, error states | Spare. Second person. No parentheticals. 6-12 word sentences. Never says "we". | Post **summaries** and changelog **entries** |
| **Docs / eng** | `docs/`, README, commit bodies | Dense. Qualified. Explicit scope fences. Blunt. | Post **lead-ins** |

When they conflict, the surface decides: anything that renders on a card or in a meta tag
uses the Product UI register. Anything inside the post body uses Docs/eng.

---

## 3. What "not an essay" means, operationally

Length is capped by structure. A post fails review if it:

- has a lead-in over **150 words** (target 40-100)
- explains implementation the reader cannot observe
- contains zero receipts (no number, date, timing, or visible surface named)
- opens with scene-setting ("It was a Tuesday", "Anyone who's played ranked knows...")
- closes with a lessons-learned or journey paragraph
- could be published by a competitor with the nouns swapped

The last one is the real test. If nothing in the post is specific to elovate's board, data,
or decisions, it isn't a release log.

---

## 4. Changelog posts

**Purpose:** what changed, in what release, with enough mechanism that a reader can verify it.

**Structure**
1. `summary` — 1-2 sentences, the release in plain terms (see §6).
2. `Body` (optional) — 1-3 sentences of lead-in. Use it only when a change needs context
   the entries can't carry. Omit it by default.
3. `changes[]` — the payload.

**Entry rules**
- One sentence. Max **140 characters**.
- Present tense, describing the product's new behavior — not the act of shipping.
  - Yes: "Cutoff chart merges points by timestamp instead of array position."
  - No: "We shipped a fix for the cutoff chart."
- Lead with the subject (the surface or system), not the verb.
- Name the mechanism or the number. An entry with neither is not an entry.
- **3-12 entries.** Fewer than 3 isn't a release worth posting. More than 12 is two posts.
- No entry may be a pure improvement claim. "Faster board" fails. "Board query bounded to
  the last 500 snapshots" passes.
- Infra and ops changes are in scope and count as `changed` — this is a *technical* release
  log. Name the job or function: `poll-wz-cutoff`, `active_season_phase()`.

### 4.1 ChangeType vocabulary — **`added` / `changed` / `fixed` / `removed`**

Four values. Locked.

| Value | Use for | Maps from commit type |
|---|---|---|
| `added` | New surface, feature, page, or capability | `feat` |
| `changed` | Behavior, copy, layout, perf, infra, or defaults that already existed | `refactor`, `perf`, `style`, `chore`, some `feat` |
| `fixed` | Something was wrong and now isn't | `fix` |
| `removed` | Surface, option, or behavior taken away | `revert`, removals |

**Why not `shipped` / `tuned` / `squashed`:** it reads cute, ages badly, and "shipped"
already means "merged to master" in `TASKS.md` and `docs/LAUNCH_ROADMAP.md` — overloading
it inside a post creates a real ambiguity. The four standard values also map 1:1 onto the
Conventional Commit types already in the log, so an agent generating a changelog post from
`git log` needs no judgment call. Keep it boring.

`docs`-only commits do not appear in changelog posts unless the doc is user-facing.

### 4.2 Release label — **`<season token> · <ISO date>`**

Format: `S5 · 2026-09-10`

- Separator is a middle dot with spaces: ` · `.
- Date is the publish date, ISO `YYYY-MM-DD`. Guarantees sortability and uniqueness.
- Season token comes from the active phase in `src/lib/data/season-phase.ts`:

| Phase | Token | Example |
|---|---|---|
| Regular season | `S<n>` | `S5 · 2026-09-10` |
| Ranked Series window | `S<n> Series` | `S5 Series · 2026-09-10` |
| Off-season | `Off-season` | `Off-season · 2026-09-22` |

**Why not semver:** `package.json` is still `0.1.0` and nothing bumps it. A version number
nobody maintains is a lie in the UI. Seasons are the actual unit players think in, and the
product is already season-phase aware — the label should agree with the board.

Suggested guard for `posts.test.ts`:

```ts
export const RELEASE_LABEL_RE = /^(S\d+( Series)?|Off-season) · \d{4}-\d{2}-\d{2}$/;
```

---

## 5. The lead-in (`Body`)

The editorial half of a changelog post. Optional, and omitted by default — most releases
are just entries.

**Use it when** a release needs context the entries can't carry on their own: a freeze, an
outage, a change in how something fundamentally behaves, or a decision a reader would
otherwise misread.

**Shape**
- 40-100 words. Hard cap 150.
- Two moves, in order: **what was wrong or what changed underneath**, then **what that
  means for you**. Both in plain language.
- No subheads. If it needs subheads, it's too long.
- Written in "we" when describing a decision; otherwise describe the product directly.

**Rules**
- Say the user-visible symptom, not the internal cause. "It kept showing a dead season as
  live" beats "seasons were modeled as a boolean".
- Never name an internal function, type, or pattern. Named jobs and domains are fine.
- Say what did *not* change. "Standings are frozen, not gone" does more work than three
  entries.
- Rejected alternatives only if the reader would otherwise assume we did the obvious thing.
  One clause, inline.
- Do not narrate the work or the day it happened on.

**One release, one lead-in.** It frames the whole post, not one entry.

## 6. House rules (all posts)

| Field | Rule |
|---|---|
| `title` | Sentence case. No trailing period. Max ~65 chars so it survives the `%s \| elovate` template in search results. Lead with the subject. |
| `summary` | 1-2 sentences, **120-200 characters**, hard cap 200. Doubles as the meta description and the index card blurb. Must stand alone with no page context. No ellipsis. |
| `slug` | Lowercase, hyphenated, no dates, no season tokens. Stable forever once published. |
| `authors` | GitHub handles. `["bubb4rd"]`. Agent-written posts still list the human who shipped them. |
| Person | Entries: no person, describe the product. Lead-in: "we" for decisions. Never "I". Never third-person self-reference ("elovate now supports…") outside product names. |
| Numbers | Numerals always, including under ten: "3 entries", "15-minute poll". |
| Dates | ISO `YYYY-MM-DD` in metadata. Prose may use "September 10" — never "9/10". |
| Times | UTC, matching the rest of the product. Say UTC. |
| Code | Backtick every identifier, path, env var, function, and table name. |
| Links | Descriptive text. Never "click here", never a bare URL in prose. |
| Headings | Sentence case. `h2` for beats, `h3` sparingly. Never `h1` in a body — the page owns it. |

---

## 7. Review checklist

Before a post merges:

- [ ] Title is sentence case, no period, ≤ 65 chars
- [ ] Summary is 120-200 chars and stands alone
- [ ] `elovate` lowercase everywhere, proper nouns capitalized
- [ ] Zero exclamation marks, zero emoji, zero banned phrases from the profile
- [ ] Changelog: 3-12 entries, each ≤ 140 chars, each naming a mechanism or number
- [ ] Changelog: `release` matches `RELEASE_LABEL_RE`
- [ ] Lead-in, if present: ≤ 150 words, no subheads, symptom before cause
- [ ] No internal function, type, or pattern names anywhere in the post
- [ ] No PR numbers, issue numbers, SHAs, branch names, or workstream IDs anywhere
- [ ] At most one CTA
- [ ] Nothing in the post could be republished by a competitor with the nouns swapped
