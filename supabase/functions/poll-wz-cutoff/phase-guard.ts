// Season-phase write guard for the WZ cutoff poller.
//
// D1: the off-season freeze pauses WRITES ONLY. The cron keeps firing on its
// fixed schedule; outside a live regular season this guard turns the run into a
// cheap no-op (no CODMunity fetch, no snapshot row, no Discord ping) and it
// auto-resumes when `active_season_phase()` reports `regular_season` again.

export type SeasonPhase = "regular_season" | "ranked_series" | "preseason";

/** True only during a live regular season — the one phase we ingest in. */
export function shouldPollForPhase(phase: string): boolean {
  return phase === "regular_season";
}

/** The early-return payload when the guard trips. */
export function phaseSkipResponse(phase: string): Response {
  console.log("[poll-wz-cutoff] skipped", { reason: "season_phase", phase });
  return Response.json({ skipped: true, reason: "season_phase", phase });
}
