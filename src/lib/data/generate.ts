import type {
  Mode,
  Player,
  Season,
  Snapshot,
  SnapshotPlayer,
} from "./types";
import { WZ_RESURGENCE_LADDER_S5 } from "./wz-ladder-s5";

const IRIDESCENT_FLOOR = 10_000;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STEMS = [
  "Nzr","Klyra","Ryn","Vex","Dusk","Hav","Pnx","Ashen","Colt","Sable",
  "Ivo","Nash","Wren","Tov","Mira","Quinn","Prel","Juno","Kael","Orr",
  "Bex","Lumen","Faye","Rook","Nyx","Sol","Grit","Vale","Hex","Moss",
  "Bran","Cade","Dax","Elk","Fenn","Gale","Holt","Iris","Jett","Kade",
  "Lark","Moth","Noa","Opal","Pike","Quill","Rookie","Sy","Tarn","Ula",
];

const TAILS = [
  "22","7","ix","tv","eu","na","zr","q","v2","low",
  "high","fn","ttv","prime","x","r","k","01","88","9",
];

function buildRoster(seed: number, mode: Mode): Player[] {
  const rand = mulberry32(seed);
  const used = new Set<string>();
  const players: Player[] = [];
  let i = 0;
  while (players.length < 280) {
    const stem = STEMS[i % STEMS.length];
    const tail = TAILS[Math.floor(rand() * TAILS.length)];
    const extra = Math.floor(rand() * 90) + 10;
    const displayName = `${stem} ${tail}${extra}`;
    const slug = `${mode}-${displayName.toLowerCase().replace(/\s+/g, "-")}`;
    if (used.has(slug)) {
      i += 1;
      continue;
    }
    used.add(slug);
    players.push({
      id: `${mode}-${players.length + 1}`,
      slug,
      displayName,
    });
    i += 1;
  }
  return players;
}

function isoAtUtc(year: number, monthIndex: number, day: number, hour = 10) {
  return new Date(Date.UTC(year, monthIndex, day, hour, 12, 0)).toISOString();
}

function eachDay(start: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString();
  });
}

function wzSrAtProgress(targetSr: number, progress: number, startFactor: number): number {
  const start = IRIDESCENT_FLOOR + Math.round((targetSr - IRIDESCENT_FLOOR) * startFactor);
  return Math.round(start + (targetSr - start) * progress);
}

function enforceDescending(srs: number[], floor: number): number[] {
  const next = [...srs];
  for (let i = 1; i < next.length; i += 1) {
    if (next[i]! >= next[i - 1]!) next[i] = next[i - 1]! - 1;
  }
  for (let i = next.length - 2; i >= 0; i -= 1) {
    if (next[i]! <= next[i + 1]!) next[i] = next[i + 1]! + 1;
  }
  return next.map((value) => Math.max(floor, value));
}

function buildWzRows(
  roster: Player[],
  dayIndex: number,
  dayCount: number,
  seasonId: string,
  rand: () => number,
): { rank: number; playerId: string; sr: number }[] {
  const progress = dayCount <= 1 ? 1 : dayIndex / (dayCount - 1);
  const atSeasonEnd = dayIndex === dayCount - 1;
  const startFactor = seasonId === "s4" ? 0.78 : 0.82;
  const board = roster.slice(0, 250);

  const srs = WZ_RESURGENCE_LADDER_S5.map((rung) => {
    const base = atSeasonEnd ? rung.sr : wzSrAtProgress(rung.sr, progress, startFactor);
    const jitter = atSeasonEnd ? 0 : Math.floor(rand() * 24) - 8;
    return base + jitter;
  });

  const stable = enforceDescending(srs, IRIDESCENT_FLOOR);
  if (atSeasonEnd) {
    WZ_RESURGENCE_LADDER_S5.forEach((rung, idx) => {
      stable[idx] = rung.sr;
    });
  }

  return stable.map((value, idx) => ({
    rank: idx + 1,
    playerId: board[idx]!.id,
    sr: value,
  }));
}

export type Database = {
  seasons: Season[];
  players: Player[];
  snapshots: Snapshot[];
  rows: SnapshotPlayer[];
};

export function generateDatabase(): Database {
  const seasons: Season[] = [
    {
      id: "s4",
      name: "Season 4",
      startsAt: isoAtUtc(2026, 4, 1),
      endsAt: isoAtUtc(2026, 6, 23, 23),
      isActive: false,
    },
    {
      id: "s5",
      name: "Season 5",
      startsAt: isoAtUtc(2026, 6, 24),
      // Midnight PT on Sep 10 (PDT, UTC-7) = Sep 10 07:00 UTC.
      endsAt: isoAtUtc(2026, 8, 10, 7),
      isActive: true,
    },
  ];

  const players: Player[] = [
    ...buildRoster(42, "wz"),
    ...buildRoster(99, "mp"),
  ];

  const snapshots: Snapshot[] = [];
  const rows: SnapshotPlayer[] = [];

  const plans: { seasonId: string; mode: Mode; start: Date; days: number; seed: number; base: number }[] = [
    { seasonId: "s4", mode: "wz", start: new Date(Date.UTC(2026, 6, 10, 10, 12)), days: 12, seed: 7, base: 11840 },
    { seasonId: "s4", mode: "mp", start: new Date(Date.UTC(2026, 6, 10, 10, 12)), days: 12, seed: 11, base: 10990 },
    { seasonId: "s5", mode: "wz", start: new Date(Date.UTC(2026, 6, 24, 10, 12)), days: 28, seed: 21, base: 12110 },
    { seasonId: "s5", mode: "mp", start: new Date(Date.UTC(2026, 6, 24, 10, 12)), days: 28, seed: 23, base: 11340 },
  ];

  for (const plan of plans) {
    const roster = players.filter((p) => p.id.startsWith(`${plan.mode}-`));
    const rand = mulberry32(plan.seed);
    const sr = new Map<string, number>();

    if (plan.mode === "mp") {
      roster.forEach((p, idx) => {
        const spread = Math.floor(rand() * 6200) + Math.floor((280 - idx) * 4);
        sr.set(p.id, plan.base + spread);
      });
    }

    const days = eachDay(plan.start, plan.days);
    days.forEach((capturedAt, dayIndex) => {
      if (plan.mode === "wz") {
        const ladderRows = buildWzRows(roster, dayIndex, plan.days, plan.seasonId, rand);
        const snapshotId = `${plan.seasonId}-${plan.mode}-d${dayIndex}`;
        const cutoffSr = ladderRows[249]?.sr ?? 0;
        const rank1Sr = ladderRows[0]?.sr ?? 0;

        snapshots.push({
          id: snapshotId,
          seasonId: plan.seasonId,
          mode: plan.mode,
          capturedAt,
          source: "seed",
          cutoffSr,
          rank1Sr,
        });

        for (const row of ladderRows) {
          rows.push({
            snapshotId,
            rank: row.rank,
            playerId: row.playerId,
            sr: row.sr,
          });
        }
        return;
      }

      for (const p of roster) {
        const drift = Math.floor(rand() * 74) - 16;
        const climb = 11 + Math.floor(rand() * 18);
        sr.set(p.id, Math.max(4200, (sr.get(p.id) ?? plan.base) + climb + drift));
      }

      const ranked = [...roster].sort((a, b) => (sr.get(b.id) ?? 0) - (sr.get(a.id) ?? 0));
      const top = ranked.slice(0, 250);
      const snapshotId = `${plan.seasonId}-${plan.mode}-d${dayIndex}`;
      const cutoffSr = sr.get(top[249].id) ?? 0;
      const rank1Sr = sr.get(top[0].id) ?? 0;

      snapshots.push({
        id: snapshotId,
        seasonId: plan.seasonId,
        mode: plan.mode,
        capturedAt,
        source: "seed",
        cutoffSr,
        rank1Sr,
      });

      top.forEach((player, index) => {
        rows.push({
          snapshotId,
          rank: index + 1,
          playerId: player.id,
          sr: sr.get(player.id) ?? 0,
        });
      });
    });
  }

  return { seasons, players, snapshots, rows };
}

let cache: Database | null = null;

export function db(): Database {
  if (!cache) cache = generateDatabase();
  return cache;
}
