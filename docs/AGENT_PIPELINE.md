# elovate — Claude Code agent pipeline

Three roles, defined as Claude Code subagents in `.claude/agents/`:

| Agent | Does | Tools | Never does |
|---|---|---|---|
| `senior-planner` | Turns a task into a scoped plan | Read-only + web | Write/edit code |
| `developer` | Implements one plan | Full (read/write/bash) | Schema changes outside `supabase/migrations/`; reopen `/mp/*` |
| `reviewer` | Gates the diff before merge | Read-only + bash (lint/test) | Edit code; rubber-stamp without running tests itself |

They're invoked from a Claude Code session working in this repo (`subagent_type: senior-planner \| developer \| reviewer`). Agents don't chain to each other automatically — the session driving them runs the loop below.

## The loop

1. **Pick a task** — a row from `docs/LAUNCH_ROADMAP.md` §2 (has a workstream ID + priority already), an open GitHub issue, an item from `TASKS.md`, or an ad hoc request.
2. **Plan** — invoke `senior-planner` with the task. If it comes back flagging a freeze/gate/scope conflict, resolve that with the user before continuing — don't route around it.
3. **Build** — invoke `developer` with the plan. It implements, self-tests (`npm run lint`, `npm test`), and reports the diff + results.
4. **Review** — invoke `reviewer` with the diff. It runs its own lint/test pass and returns a verdict:
   - **changes requested** → send its findings back to `developer` (step 3), repeat.
   - **approve** / **approve with nits** → done building; open or update the PR, referencing the workstream ID.
5. **Close the loop** — update `TASKS.md` (move the item to Done) and close the matching GitHub issue once merged, per the sync pattern `/productivity:update` already uses on this repo.

## Guardrails every agent already carries

- **Freeze window Sep 5–6, 2026**: bugfix only, no new features (`LAUNCH_ROADMAP.md` §3).
- **MP-01**: `/mp/*` stays gated until an explicit post-launch decision to promote it — not something any agent fixes on its own initiative.
- **Migrations only via `supabase/migrations/`** — this project already repaired migration-history drift once from a dashboard-only change; don't reintroduce it.
- **Auth regressions**: PKCE callback must keep accepting both `error=auth` and `error=device` (WZ-01).
- **OCR fails soft**: manual SR entry must work with zero Vision credentials present (WZ-07).
- Every change should trace to a workstream ID (`WZ-*`, `DESK-*`, `MP-*`, `OPS-*`, `N-*`) and priority, or be explicitly marked ad hoc.

## Relationship to the existing Cursor workflow

`docs/LAUNCH_ROADMAP.md` §6 already describes a Cursor Cloud Agents workflow (Issue → PR, QA pass, Desktop slice) plus Cursor Automations for PR hygiene and CI-fail triage. This pipeline is the Claude Code equivalent for working directly in a Claude session on this repo — same source of truth (`LAUNCH_ROADMAP.md`), same guardrails, different runtime. Use whichever you're sitting in front of; both should reach the same bar before merge.

## Extending this later

- If workstreams start needing genuinely different expertise (e.g. a Supabase/RLS specialist vs. a UI specialist), split `developer` into `developer-backend` / `developer-frontend` rather than overloading one prompt — keep each agent's system prompt scoped to what it actually needs to know.
- If PR-triggered automation is wanted later (reviewer running on every PR via GitHub Actions rather than manually), that's an additive layer on top of this, not a replacement — the same guardrails apply either way.
