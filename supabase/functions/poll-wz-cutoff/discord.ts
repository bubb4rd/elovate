const DEFAULT_MIN_DELTA = 50;
const DEFAULT_SITE_URL = "https://elovatesr.netlify.app";

// Discord embed colors (mirrors src/lib/format.ts intent: green up, red down).
const COLOR_UP = 0x22c55e;
const COLOR_DOWN = 0xef4444;
const COLOR_NEUTRAL = 0x6b7280;

export type CutoffDiscordPayload = {
  seasonId: string;
  seasonName?: string;
  capturedAt: string;
  cutoffSr: number;
  rank1Sr: number;
  previousCutoffSr: number | null;
  siteUrl?: string;
};

export type DiscordNotifyResult = {
  notified: boolean;
  delta: number | null;
  skipReason?: "not_configured" | "below_threshold" | "webhook_failed";
};

/** SR values rendered like the app: 22443 -> "22,443". */
export function formatSrValue(value: number): string {
  return value.toLocaleString("en-US");
}

/** Mirrors formatDelta in src/lib/format.ts. */
export function formatDeltaValue(delta: number | null): string {
  if (delta === null) return "new";
  if (delta === 0) return "0";
  return delta > 0 ? `+${formatSrValue(delta)}` : formatSrValue(delta);
}

function cutoffDelta(payload: CutoffDiscordPayload): number | null {
  return payload.previousCutoffSr != null
    ? payload.cutoffSr - payload.previousCutoffSr
    : null;
}

/** Pure builder for the Discord webhook request body. */
export function buildDiscordEmbed(
  payload: CutoffDiscordPayload,
): Record<string, unknown> {
  const delta = cutoffDelta(payload);
  const color = delta === null || delta === 0
    ? COLOR_NEUTRAL
    : delta > 0
    ? COLOR_UP
    : COLOR_DOWN;

  return {
    username: "elovate",
    embeds: [
      {
        title: "WZ Top 250 cutoff updated",
        url: payload.siteUrl ?? DEFAULT_SITE_URL,
        color,
        fields: [
          {
            name: "Cutoff SR",
            value: formatSrValue(payload.cutoffSr),
            inline: true,
          },
          { name: "Change", value: formatDeltaValue(delta), inline: true },
          {
            name: "Rank #1",
            value: formatSrValue(payload.rank1Sr),
            inline: true,
          },
        ],
        footer: {
          text: `${payload.seasonName ?? payload.seasonId}`,
        },
        timestamp: payload.capturedAt,
      },
    ],
  };
}

function resolveMinDelta(): number {
  const parsed = Number(Deno.env.get("MIN_CUTOFF_DELTA"));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MIN_DELTA;
}

/**
 * Fire-and-forget community webhook. Never throws for config/threshold cases —
 * only a failed HTTP POST throws, so the caller can log it without failing ingest.
 */
export async function maybeNotifyDiscordCutoff(
  payload: CutoffDiscordPayload,
): Promise<DiscordNotifyResult> {
  const delta = cutoffDelta(payload);
  const webhookUrl = Deno.env.get("DISCORD_CUTOFF_WEBHOOK_URL");

  if (!webhookUrl) {
    return { notified: false, delta, skipReason: "not_configured" };
  }

  if (delta !== null && Math.abs(delta) < resolveMinDelta()) {
    return { notified: false, delta, skipReason: "below_threshold" };
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildDiscordEmbed(payload)),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook responded ${res.status}`);
  }

  return { notified: true, delta };
}
