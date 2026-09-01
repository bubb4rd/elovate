# Discord server content

Paste-ready copy for the elovate Discord server. Setup/permissions steps live in
`docs/discord-server-setup.md` — this file is just what goes on screen.

---

## `#rules`

```md
# elovate community rules

-# Agree below to unlock the rest of the server.

**1. Be respectful.**
No harassment, hate speech, or personal attacks — disagree with ideas, not people.

**2. Keep it on-topic.**
Post in the channel that matches what you're sharing. Off-topic chat belongs in `#off-topic`.

**3. No spam or unapproved self-promo.**
Sharing your own content is fine in `#show-and-tell`; mass-posting links or ads elsewhere isn't.

**4. Respect privacy.**
No doxxing, no sharing anyone's personal info without consent — yours or theirs.

> Official elovate staff will never DM you first asking for your password, payment info, or to "verify" your account. Get support in `#help` or `#support-tickets` only.

**5. Get support the official way.**
Use `#help` or `#support-tickets`. Anyone DMing you claiming to be staff is a scammer — report it.

**6. Keep content appropriate.**
No NSFW, no illegal content, no gore.

**7. One account per person.**
Alts used to evade a ban or mute will be banned too.

**8. Staff calls are final here.**
Disagree with a mod action? Open a ticket in `#support-tickets` — don't relitigate it publicly. See something wrong? Report it there instead of calling it out in chat.

-# Breaking these rules can result in a warning, mute, kick, or ban depending on severity.
```

---

## `#welcome`

```md
# Welcome to elovate 👋

-# Track your Warzone Top 250 climb, compete on the leaderboard, and get notified the moment the cutoff moves.

**Start here:**
- Read `#rules` and accept to unlock the server
- Check `#announcements` and `#changelog` for what's new
- Head to Onboarding (top of the channel list) to pick your notification feeds and link your elovate account

**Find your way around:**
- `#events` / `#leaderboard-updates` / `#premium-updates` — opt-in, bot-posted, follow what you care about
- `#general`, `#feature-requests`, `#bug-reports`, `#show-and-tell` — the community hub
- `#help` / `#faq` — questions
- Premium subscriber? You've got a whole extra wing — `#lounge`, `#early-access`, `#roadmap-input`

> New to elovate itself? elovatesr.netlify.app — track your climb, see the live cutoff, compare with friends.

Glad you're here. See you on the board.
```

---

## Onboarding flow (Discord Server Settings → Onboarding)

Configure as multi-select prompts; each option below maps to a self-assigned role.

**Prompt 1 — "What do you want to hear about?"** *(multi-select)*
| Option | Grants |
|---|---|
| Cutoff & event alerts | `#events` access / role |
| Leaderboard updates | `#leaderboard-updates` access / role |
| Premium news | `#premium-updates` access / role (visible to all; content is general-audience even if you're not subscribed yet) |

**Prompt 2 — "Are you an elovate Premium subscriber?"** *(single-select)*
| Option | Result |
|---|---|
| Yes, link my account | Routes to the Premium-account-link flow (Discord OAuth ↔ elovate account, tracked separately — see setup doc §"Open follow-ups") |
| Not yet | No role change; shows a short "here's what Premium unlocks" blurb |

**Prompt 3 — "What brings you here?"** *(single-select, optional — helps first-week moderation)*
| Option |
|---|
| Climbing the Top 250 |
| Just here to watch/chat |
| Feedback / bug reports |

On completion: move member from `@guest` to `@member`, post nothing extra (the
`#welcome` message already covers next steps).
