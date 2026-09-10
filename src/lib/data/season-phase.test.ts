import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import {
  boardStatusForPhase,
  getActiveSeasonPhase,
  seasonPhaseCopy,
  shouldUseLiveBoard,
  type SeasonPhase,
} from "./season-phase";

const PHASES: SeasonPhase[] = ["regular_season", "ranked_series", "preseason"];

// --- boardStatusForPhase ---

assert.equal(boardStatusForPhase("regular_season"), "live");
assert.equal(boardStatusForPhase("ranked_series"), "frozen");
assert.equal(boardStatusForPhase("preseason"), "frozen");

// --- shouldUseLiveBoard: reads stay on for every phase (D1) ---

for (const phase of PHASES) {
  assert.equal(shouldUseLiveBoard(phase), true, `${phase} keeps reads on`);
}

// --- seasonPhaseCopy: distinct, non-empty copy per phase ---

const copies = PHASES.map((phase) =>
  seasonPhaseCopy(phase, "Season 5", "2026-09-10T07:00:00.000Z"),
);
for (const [i, copy] of copies.entries()) {
  assert.ok(copy.headline.length > 0, `${PHASES[i]} headline non-empty`);
  assert.ok(copy.detail.length > 0, `${PHASES[i]} detail non-empty`);
  assert.ok(copy.badge.length > 0, `${PHASES[i]} badge non-empty`);
}
const headlines = new Set(copies.map((c) => c.headline));
const details = new Set(copies.map((c) => c.detail));
const badges = new Set(copies.map((c) => c.badge));
assert.equal(headlines.size, 3, "each phase has a distinct headline");
assert.equal(details.size, 3, "each phase has a distinct detail");
assert.equal(badges.size, 3, "each phase has a distinct badge");

// frozen phases mention the season as final
assert.match(seasonPhaseCopy("ranked_series", "Season 5", null).detail, /final/i);
assert.match(seasonPhaseCopy("preseason", "Season 5", null).detail, /final/i);

// --- seasonPhaseCopy: handles phaseEndsAt = null ---

for (const phase of PHASES) {
  const copy = seasonPhaseCopy(phase, "Season 5", null);
  assert.ok(copy.headline.length > 0 && copy.detail.length > 0 && copy.badge.length > 0);
  assert.doesNotMatch(copy.detail, /undefined|null|NaN/, `${phase} copy has no leaked null`);
}

// with a date, regular season surfaces it
assert.match(
  seasonPhaseCopy("regular_season", "Season 5", "2026-09-10T07:00:00.000Z").detail,
  /Sep 10/,
);

// --- getActiveSeasonPhase: fails open to regular_season ---

const erroringClient = {
  rpc: async () => ({ data: null, error: { message: "boom" } }),
} as unknown as SupabaseClient<Database>;

const throwingClient = {
  rpc: async () => {
    throw new Error("network down");
  },
} as unknown as SupabaseClient<Database>;

const okClient = {
  rpc: async () => ({
    data: [
      {
        season_id: "s5",
        season_name: "Season 5",
        phase: "ranked_series",
        is_override: false,
        phase_started_at: "2026-09-10T07:00:00.000Z",
        phase_ends_at: null,
      },
    ],
    error: null,
  }),
} as unknown as SupabaseClient<Database>;

async function run() {
  const fromError = await getActiveSeasonPhase(erroringClient);
  assert.equal(fromError.phase, "regular_season", "RPC error -> fail open");
  assert.equal(fromError.isOverride, false);

  const fromThrow = await getActiveSeasonPhase(throwingClient);
  assert.equal(fromThrow.phase, "regular_season", "RPC throw -> fail open");

  const fromNull = await getActiveSeasonPhase(null);
  assert.equal(fromNull.phase, "regular_season", "null client -> fail open");

  const fromOk = await getActiveSeasonPhase(okClient);
  assert.equal(fromOk.phase, "ranked_series");
  assert.equal(fromOk.seasonName, "Season 5");
  assert.equal(fromOk.phaseEndsAt, null);

  console.log("season-phase tests passed");
}

run();
