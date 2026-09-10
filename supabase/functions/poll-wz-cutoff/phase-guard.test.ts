import { assertEquals } from "jsr:@std/assert@^1";
import { phaseSkipResponse, shouldPollForPhase } from "./phase-guard.ts";

Deno.test("shouldPollForPhase: proceeds only for regular_season", () => {
  assertEquals(shouldPollForPhase("regular_season"), true);
  assertEquals(shouldPollForPhase("ranked_series"), false);
  assertEquals(shouldPollForPhase("preseason"), false);
});

Deno.test("phaseSkipResponse: 200 with skip reason + phase echoed back", async () => {
  const res = phaseSkipResponse("ranked_series");
  assertEquals(res.status, 200);
  assertEquals(await res.json(), {
    skipped: true,
    reason: "season_phase",
    phase: "ranked_series",
  });
});

Deno.test("phaseSkipResponse: works for preseason too", async () => {
  assertEquals(await phaseSkipResponse("preseason").json(), {
    skipped: true,
    reason: "season_phase",
    phase: "preseason",
  });
});
