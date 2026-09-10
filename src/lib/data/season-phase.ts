import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardFreshnessStatus } from "@/components/live-status";
import { createAnonSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database";
import { formatDay } from "@/lib/format";
import { getActiveSeason } from "./queries";

export type SeasonPhase = "regular_season" | "ranked_series" | "preseason";

export type ActiveSeasonPhase = {
  phase: SeasonPhase;
  seasonId: string;
  seasonName: string;
  isOverride: boolean;
  phaseEndsAt: string | null;
};

type PhaseClient = SupabaseClient<Database> | null;

/**
 * Fail-open default. A DB blip must never flip the public site into a fake
 * "season over" state, so we fall back to the seed active season presented as a
 * normal regular season.
 */
function fallbackPhase(): ActiveSeasonPhase {
  try {
    const season = getActiveSeason();
    return {
      phase: "regular_season",
      seasonId: season.id,
      seasonName: season.name,
      isOverride: false,
      phaseEndsAt: null,
    };
  } catch {
    return {
      phase: "regular_season",
      seasonId: "",
      seasonName: "",
      isOverride: false,
      phaseEndsAt: null,
    };
  }
}

async function readActiveSeasonPhase(
  client?: PhaseClient,
): Promise<ActiveSeasonPhase> {
  const supabase = client === undefined ? createAnonSupabaseClient() : client;
  if (!supabase) return fallbackPhase();

  try {
    const { data, error } = await supabase.rpc("active_season_phase");
    if (error || !data || data.length === 0) return fallbackPhase();
    const row = data[0];
    return {
      phase: row.phase,
      seasonId: row.season_id,
      seasonName: row.season_name,
      isOverride: row.is_override,
      phaseEndsAt: row.phase_ends_at,
    };
  } catch {
    return fallbackPhase();
  }
}

const getCachedActiveSeasonPhase = unstable_cache(
  () => readActiveSeasonPhase(),
  ["active-season-phase"],
  { revalidate: 60 },
);

/**
 * The current phase of the active season. Pass a client (or `null`) to bypass
 * the cache — used by tests, mirrors how `board-source.ts` injects `fetchStored`.
 * Any failure fails open to `regular_season`.
 */
export async function getActiveSeasonPhase(
  client?: PhaseClient,
): Promise<ActiveSeasonPhase> {
  if (client !== undefined) return readActiveSeasonPhase(client);
  try {
    return await getCachedActiveSeasonPhase();
  } catch {
    return fallbackPhase();
  }
}

// --- Pure derivations (no I/O — unit-test targets) ---

/** The board freshness badge for a phase. Only a live regular season is "live". */
export function boardStatusForPhase(phase: SeasonPhase): BoardFreshnessStatus {
  return phase === "regular_season" ? "live" : "frozen";
}

/**
 * Whether pages should still fetch the live CODMunity board for a phase.
 *
 * Per D1 the freeze pauses WRITES ONLY — reads stay on for every phase so the
 * final Top 250 roster keeps rendering. Kept as an explicit function so the
 * intent is documented and Phase 2 can change it.
 */
export function shouldUseLiveBoard(phase: SeasonPhase): boolean {
  // Every phase keeps reads on today (D1). Kept per-phase and explicit so Phase 2
  // can turn a value off without touching call sites.
  const readsOn: Record<SeasonPhase, boolean> = {
    regular_season: true,
    ranked_series: true,
    preseason: true,
  };
  return readsOn[phase];
}

export type SeasonPhaseCopy = {
  headline: string;
  detail: string;
  badge: string;
};

/** Single source of phase copy for home, board, and nav. */
export function seasonPhaseCopy(
  phase: SeasonPhase,
  seasonName: string,
  phaseEndsAt: string | null,
): SeasonPhaseCopy {
  const name = seasonName || "The season";
  const endsOn = phaseEndsAt ? formatDay(phaseEndsAt) : null;

  if (phase === "regular_season") {
    return {
      headline: `${name} — ranked live`,
      detail: endsOn
        ? `Regular season standings update live. Ends ${endsOn}.`
        : "Regular season standings update live.",
      badge: "Live",
    };
  }

  if (phase === "ranked_series") {
    return {
      headline: `${name} Ranked Series`,
      detail: endsOn
        ? `The regular season is over. A Ranked Series ladder is running until ${endsOn}; the cutoff shown is the ${name} final Top 250.`
        : `The regular season is over. A Ranked Series ladder is running; the cutoff shown is the ${name} final Top 250.`,
      badge: "Ranked Series",
    };
  }

  return {
    headline: `${name} is over`,
    detail: `Ranked is between seasons. The cutoff shown is the ${name} final Top 250.`,
    badge: "Off-season",
  };
}
