import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { type DiscordNotifyResult, maybeNotifyDiscordCutoff } from "./discord.ts";

const TOP_250_URL = "https://api.codmunity.gg/website/pages/top-250";
const MIN_INTERVAL_MS = 12 * 60 * 1000;

type RankedPlayerPayload = {
  skillRating?: unknown;
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    const expected = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    if (!expected || provided !== expected) {
      return unauthorized();
    }

    const admin = ctx.supabaseAdmin;
    if (!admin) {
      return Response.json({ error: "Admin client unavailable" }, { status: 500 });
    }

    const { data: season, error: seasonError } = await admin
      .from("seasons")
      .select("id, name")
      .eq("is_active", true)
      .maybeSingle();

    if (seasonError || !season) {
      return Response.json(
        { error: seasonError?.message ?? "No active season" },
        { status: 500 },
      );
    }

    const { data: latest } = await admin
      .from("snapshots")
      .select("captured_at, cutoff_sr")
      .eq("season_id", season.id)
      .eq("mode", "wz")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.captured_at) {
      const age = Date.now() - Date.parse(latest.captured_at);
      if (Number.isFinite(age) && age < MIN_INTERVAL_MS) {
        return Response.json({ skipped: true, reason: "fresh" });
      }
    }

    const response = await fetch(TOP_250_URL, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      return Response.json(
        { error: `CODMunity Top 250 failed (${response.status})` },
        { status: 502 },
      );
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.rankedPlayers)) {
      return Response.json({ error: "CODMunity payload missing rankedPlayers" }, { status: 502 });
    }

    const srs = (payload.rankedPlayers as RankedPlayerPayload[])
      .map((row) => asNumber(row.skillRating))
      .filter((sr): sr is number => sr !== null)
      .sort((a, b) => b - a);

    if (srs.length === 0) {
      return Response.json({ error: "CODMunity payload had no ranked players" }, { status: 502 });
    }

    const capturedAt = new Date().toISOString();
    const newCutoff = srs[srs.length - 1];
    const previousCutoff = latest?.cutoff_sr ?? null;

    const { error: insertError } = await admin.from("snapshots").insert({
      season_id: season.id,
      mode: "wz",
      captured_at: capturedAt,
      source: "codmunity",
      cutoff_sr: newCutoff,
      rank1_sr: srs[0],
      player_count: srs.length,
    });

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    // Fire-and-forget: a broken or unconfigured webhook must never fail ingest.
    let discord: DiscordNotifyResult = {
      notified: false,
      delta: null,
      skipReason: "not_configured",
    };
    try {
      discord = await maybeNotifyDiscordCutoff({
        seasonId: season.id,
        seasonName: season.name,
        capturedAt,
        cutoffSr: newCutoff,
        rank1Sr: srs[0],
        previousCutoffSr: previousCutoff,
      });
    } catch (err) {
      console.error("[poll-wz-cutoff] discord webhook failed", err);
      discord = {
        notified: false,
        delta: previousCutoff != null ? newCutoff - previousCutoff : null,
        skipReason: "webhook_failed",
      };
    }

    const body: Record<string, unknown> = {
      inserted: true,
      seasonId: season.id,
      capturedAt,
      cutoffSr: newCutoff,
      rank1Sr: srs[0],
      playerCount: srs.length,
      discordNotified: discord.notified,
    };
    if (discord.notified) {
      body.cutoffDelta = discord.delta;
    } else if (discord.skipReason) {
      body.discordSkipReason = discord.skipReason;
    }

    return Response.json(body);
  }),
};
