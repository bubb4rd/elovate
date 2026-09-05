import { unstable_cache } from "next/cache";
import type { BoardRow, BoardRung, LiveWzBoard, Player } from "./types";

export const LIVE_POLL_MS = 15 * 60 * 1000;
export const LIVE_POLL_SECONDS = LIVE_POLL_MS / 1000;

// Mirrors DEFAULT_MIN_PLAYERS in supabase/functions/poll-wz-cutoff/index.ts: a
// truncated CODMunity payload would otherwise produce a wildly wrong cutoff.
export const MIN_PLAYER_COUNT = 240;

const TOP_250_URL = "https://api.codmunity.gg/website/pages/top-250";

type RankedPlayerPayload = {
  _id?: unknown;
  gamertag?: unknown;
  rank?: unknown;
  skillRating?: unknown;
  deltaRank?: unknown;
  deltaSkillRating?: unknown;
  player?: { _id?: unknown };
};

let lastGood: LiveWzBoard | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "player";
}

export function mapRankedPlayers(
  rawPlayers: RankedPlayerPayload[],
  fetchedAt: string,
): LiveWzBoard {
  const sorted = [...rawPlayers]
    .map((raw) => {
      const sr = asNumber(raw.skillRating);
      const gamertag = asString(raw.gamertag);
      if (sr === null || !gamertag) return null;
      const stableId = asString(raw.player?._id) ?? asString(raw._id) ?? slugify(gamertag);
      const player: Player = {
        id: `wz-live-${stableId}`,
        slug: slugify(gamertag),
        displayName: gamertag,
      };
      return {
        sr,
        player,
        deltaSr: asNumber(raw.deltaSkillRating),
        deltaRank: asNumber(raw.deltaRank),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.sr - a.sr);

  if (sorted.length === 0) {
    throw new Error("CODMunity Top 250 payload had no ranked players");
  }

  // Guard against a truncated CODMunity board: a short list would produce a
  // wildly wrong cutoff (and hero numeral). Throwing here lets the caller
  // (getLiveWzBoard) fall back to the last good board instead of surfacing a
  // bad one. See supabase/functions/poll-wz-cutoff/index.ts for the matching
  // ingest-side guard.
  if (sorted.length < MIN_PLAYER_COUNT) {
    throw new Error(
      `CODMunity Top 250 payload too short (${sorted.length} players, need ${MIN_PLAYER_COUNT})`,
    );
  }

  const lastIndex = sorted.length - 1;
  const rows: BoardRow[] = sorted.map((row, index) => ({
    rank: index + 1,
    player: row.player,
    sr: row.sr,
    deltaSr: row.deltaSr,
    deltaRank: row.deltaRank,
    lastSeen: fetchedAt,
    isCutoff: index === lastIndex,
  }));

  const ladder: BoardRung[] = rows.map((row) => ({ rank: row.rank, sr: row.sr }));
  const cutoffSr = rows[lastIndex]!.sr;
  const rank1Sr = rows[0]!.sr;

  return {
    rows,
    ladder,
    cutoffSr,
    rank1Sr,
    fetchedAt,
    nextUpdateAt: new Date(Date.parse(fetchedAt) + LIVE_POLL_MS).toISOString(),
  };
}

async function fetchLiveWzBoard(): Promise<LiveWzBoard> {
  const response = await fetch(TOP_250_URL, {
    headers: { accept: "application/json" },
    next: { revalidate: LIVE_POLL_SECONDS },
  });
  if (!response.ok) {
    throw new Error(`CODMunity Top 250 failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.rankedPlayers)) {
    throw new Error("CODMunity Top 250 payload missing rankedPlayers");
  }

  const fetchedAt = new Date().toISOString();
  const mapped = mapRankedPlayers(payload.rankedPlayers as RankedPlayerPayload[], fetchedAt);
  lastGood = mapped;
  return mapped;
}

const getCachedLiveWzBoard = unstable_cache(fetchLiveWzBoard, ["codmunity-top-250"], {
  revalidate: LIVE_POLL_SECONDS,
});

export async function getLiveWzBoard(): Promise<LiveWzBoard | null> {
  try {
    const live = await getCachedLiveWzBoard();
    lastGood = live;
    return live;
  } catch {
    return lastGood;
  }
}
