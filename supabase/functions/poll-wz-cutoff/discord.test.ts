import { assertEquals, assertRejects } from "jsr:@std/assert@^1";
import {
  buildDiscordEmbed,
  type CutoffDiscordPayload,
  formatDeltaValue,
  maybeNotifyDiscordCutoff,
} from "./discord.ts";

const base = {
  seasonId: "s5",
  seasonName: "Season 5",
  capturedAt: "2026-09-01T18:30:00.000Z",
  cutoffSr: 22443,
  rank1Sr: 28102,
  previousCutoffSr: 21962,
};

Deno.test("formatDeltaValue mirrors formatDelta", () => {
  assertEquals(formatDeltaValue(null), "new");
  assertEquals(formatDeltaValue(0), "0");
  assertEquals(formatDeltaValue(481), "+481");
  assertEquals(formatDeltaValue(-1200), "-1,200");
});

Deno.test("buildDiscordEmbed: rising cutoff is green with signed change", () => {
  const embed = buildDiscordEmbed(base) as {
    username: string;
    embeds: Array<{ color: number; fields: Array<{ value: string }>; footer: { text: string }; timestamp: string }>;
  };
  assertEquals(embed.username, "elovate");
  assertEquals(embed.embeds[0].color, 0x22c55e);
  assertEquals(embed.embeds[0].fields.map((f) => f.value), ["22,443", "+481", "28,102"]);
  assertEquals(embed.embeds[0].footer.text, "Season 5");
  assertEquals(embed.embeds[0].timestamp, "2026-09-01T18:30:00.000Z");
});

Deno.test("buildDiscordEmbed: falling cutoff is red", () => {
  const embed = buildDiscordEmbed({ ...base, previousCutoffSr: 23000 }) as {
    embeds: Array<{ color: number; fields: Array<{ value: string }> }>;
  };
  assertEquals(embed.embeds[0].color, 0xef4444);
  assertEquals(embed.embeds[0].fields[1].value, "-557");
});

Deno.test("buildDiscordEmbed: first snapshot is neutral with 'new' change", () => {
  const embed = buildDiscordEmbed({ ...base, previousCutoffSr: null }) as {
    embeds: Array<{ color: number; fields: Array<{ value: string }> }>;
  };
  assertEquals(embed.embeds[0].color, 0x6b7280);
  assertEquals(embed.embeds[0].fields[1].value, "new");
});

Deno.test("buildDiscordEmbed: falls back to seasonId and default site url", () => {
  const embed = buildDiscordEmbed({
    ...base,
    seasonName: undefined,
  }) as { embeds: Array<{ url: string; footer: { text: string } }> };
  assertEquals(embed.embeds[0].url, "https://elovatesr.netlify.app");
  assertEquals(embed.embeds[0].footer.text, "s5");
});

// --- maybeNotifyDiscordCutoff: env + threshold gating ---

const ENV_KEYS = ["DISCORD_CUTOFF_WEBHOOK_URL", "MIN_CUTOFF_DELTA"] as const;

function withEnv(
  vars: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  fn: (posts: Array<{ url: string; body: Record<string, unknown> }>) => Promise<void>,
): Promise<void> {
  const savedEnv = new Map(ENV_KEYS.map((k) => [k, Deno.env.get(k)]));
  for (const k of ENV_KEYS) Deno.env.delete(k);
  for (const [k, v] of Object.entries(vars)) Deno.env.set(k, v as string);

  const savedFetch = globalThis.fetch;
  const posts: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    posts.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) });
    return Promise.resolve(new Response(null, { status: 204 }));
  }) as typeof fetch;

  return fn(posts).finally(() => {
    globalThis.fetch = savedFetch;
    for (const k of ENV_KEYS) {
      const v = savedEnv.get(k);
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
  });
}

const payload = (over: Partial<CutoffDiscordPayload> = {}): CutoffDiscordPayload => ({
  seasonId: "s5",
  seasonName: "Season 5",
  capturedAt: "2026-09-01T18:30:00.000Z",
  cutoffSr: 22443,
  rank1Sr: 28102,
  previousCutoffSr: 21962,
  ...over,
});

Deno.test("maybeNotifyDiscordCutoff: no webhook url -> not_configured, no POST", () =>
  withEnv({}, async (posts) => {
    const result = await maybeNotifyDiscordCutoff(payload());
    assertEquals(result, { notified: false, delta: 481, skipReason: "not_configured" });
    assertEquals(posts.length, 0);
  }));

Deno.test("maybeNotifyDiscordCutoff: below default threshold -> below_threshold, no POST", () =>
  withEnv({ DISCORD_CUTOFF_WEBHOOK_URL: "https://discord.test/hook" }, async (posts) => {
    const result = await maybeNotifyDiscordCutoff(payload({ cutoffSr: 22000, previousCutoffSr: 21970 }));
    assertEquals(result, { notified: false, delta: 30, skipReason: "below_threshold" });
    assertEquals(posts.length, 0);
  }));

Deno.test("maybeNotifyDiscordCutoff: at/above threshold -> POSTs embed", () =>
  withEnv({ DISCORD_CUTOFF_WEBHOOK_URL: "https://discord.test/hook" }, async (posts) => {
    const result = await maybeNotifyDiscordCutoff(payload());
    assertEquals(result, { notified: true, delta: 481 });
    assertEquals(posts.length, 1);
    assertEquals(posts[0].url, "https://discord.test/hook");
    assertEquals(posts[0].body.username, "elovate");
  }));

Deno.test("maybeNotifyDiscordCutoff: first snapshot posts regardless of threshold", () =>
  withEnv({ DISCORD_CUTOFF_WEBHOOK_URL: "https://discord.test/hook" }, async (posts) => {
    const result = await maybeNotifyDiscordCutoff(payload({ previousCutoffSr: null }));
    assertEquals(result, { notified: true, delta: null });
    assertEquals(posts.length, 1);
  }));

Deno.test("maybeNotifyDiscordCutoff: invalid MIN_CUTOFF_DELTA falls back to 50", () =>
  withEnv(
    { DISCORD_CUTOFF_WEBHOOK_URL: "https://discord.test/hook", MIN_CUTOFF_DELTA: "abc" },
    async (posts) => {
      await maybeNotifyDiscordCutoff(payload({ cutoffSr: 22000, previousCutoffSr: 21960 })); // 40
      assertEquals(posts.length, 0);
      await maybeNotifyDiscordCutoff(payload({ cutoffSr: 22000, previousCutoffSr: 21940 })); // 60
      assertEquals(posts.length, 1);
    },
  ));

Deno.test("maybeNotifyDiscordCutoff: MIN_CUTOFF_DELTA=0 posts every move", () =>
  withEnv(
    { DISCORD_CUTOFF_WEBHOOK_URL: "https://discord.test/hook", MIN_CUTOFF_DELTA: "0" },
    async (posts) => {
      await maybeNotifyDiscordCutoff(payload({ cutoffSr: 22000, previousCutoffSr: 21999 }));
      assertEquals(posts.length, 1);
    },
  ));

Deno.test("maybeNotifyDiscordCutoff: non-2xx webhook response throws", () =>
  withEnv({ DISCORD_CUTOFF_WEBHOOK_URL: "https://discord.test/hook" }, async () => {
    globalThis.fetch = (() =>
      Promise.resolve(new Response("bad", { status: 400 }))) as typeof fetch;
    await assertRejects(() => maybeNotifyDiscordCutoff(payload()), Error, "400");
  }));
