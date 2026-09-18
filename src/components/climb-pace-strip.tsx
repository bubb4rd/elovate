"use client";

import { useState } from "react";
import { ArrowRight, GameController, Gauge } from "@phosphor-icons/react";
import { RankMark } from "@/components/icons";
import { formatDelta, formatSr } from "@/lib/format";
import {
  DIVISION_TONE,
  rankThresholds,
  type DivisionId,
  type RankInfo,
} from "@/lib/ranked";
import { allSummaries, openSummary, type HistoryDocument } from "@/lib/history";
import { IRIDESCENT_GRADIENT_STOPS } from "@/lib/profile/themes";
import { TickerNumeral } from "@/components/ticker-numeral";
import { cn } from "@/lib/utils";

type PaceScope = "session" | "overall";
type Node = { sr: number; label: string; division: DivisionId };

/** A rank label's trailing tier numeral, if it has one ("Bronze II" -> "II"). */
const TIER_SUFFIX = / (I{1,3})$/;

function tierNumeral(label: string): string | null {
  return TIER_SUFFIX.exec(label)?.[1] ?? null;
}

/** Short form of each division, used instead of the full name in the pace strip. */
const DIVISION_SHORT: Record<DivisionId, string> = {
  bronze: "B",
  silver: "S",
  gold: "G",
  platinum: "P",
  diamond: "D",
  crimson: "C",
  iridescent: "Iri",
  top250: "T250",
};

/** Same source as RankMark's icon gradient — Iridescent gets the app's canonical pastel gradient. */
function gradientBackground(division: DivisionId): string {
  if (division === "iridescent") {
    return `linear-gradient(135deg, ${IRIDESCENT_GRADIENT_STOPS.map((s) => `${s.color} ${s.offset}`).join(", ")})`;
  }
  const tone = DIVISION_TONE[division];
  return `linear-gradient(135deg, ${tone.fill2}, ${tone.fill})`;
}

function GradientText({
  division,
  children,
}: {
  division: DivisionId;
  children: string;
}) {
  return (
    <span
      className="bg-clip-text text-transparent"
      style={{ backgroundImage: gradientBackground(division) }}
    >
      {children}
    </span>
  );
}

/**
 * Full ladder from the current rank to Top 250, in ascending SR order —
 * every real tier/division boundary in between (via `rankThresholds`, the
 * same exhaustive list the rank-select dropdown uses), not a hand-picked
 * handful of milestones. Picking only "next tier / next rank / Iridescent /
 * Top 250" relative to the current SR skipped real waypoints in between —
 * e.g. a Diamond II player's "next rank" lands on Crimson I, silently
 * skipping Crimson II and III on the way to Iridescent.
 */
function buildLadder(sr: number, cutoffSr: number, rank: RankInfo): Node[] {
  const upcoming = rankThresholds(cutoffSr).filter((t) => t.sr > sr);
  return [
    { sr, label: rank.label, division: rank.division },
    ...upcoming.map((t) => ({ sr: t.sr, label: t.label, division: t.division })),
  ];
}

function RankChip({ division, label }: { division: DivisionId; label: string }) {
  const numeral = tierNumeral(label);
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap" title={label}>
      <RankMark division={division} className="size-7" />
      <span className="text-lg font-semibold">
        <GradientText division={division}>{DIVISION_SHORT[division]}</GradientText>
        {numeral ? <span className="text-foreground">{numeral}</span> : null}
      </span>
    </span>
  );
}

function ScopeToggle({
  scope,
  onChange,
}: {
  scope: PaceScope;
  onChange: (scope: PaceScope) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-[6px] border border-border/80 bg-background/85 p-1 text-sm shadow-sm">
      {(["session", "overall"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "rounded-[4px] px-2.5 py-1 capitalize transition-colors",
            scope === id
              ? "bg-surface-elevated font-medium text-accent"
              : "text-muted hover:text-foreground",
          )}
          aria-pressed={scope === id}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

/**
 * Single horizontal ladder from the current rank to Top 250, replacing the
 * old per-placement "elims to go positive" labels — those assumed a
 * hypothetical next game, this reflects how the session (or, once signed in
 * with more than one session on record, the whole climb history) is going.
 */
export function ClimbPaceStrip({
  sr,
  cutoffSr,
  rank,
  doc,
  signedIn,
}: {
  sr: number;
  cutoffSr: number;
  rank: RankInfo;
  doc: HistoryDocument;
  signedIn: boolean;
}) {
  const session = openSummary(doc);
  const all = allSummaries(doc);
  const canToggleOverall = signedIn && all.length > 1;

  const [scope, setScope] = useState<PaceScope>("session");
  const effectiveScope = canToggleOverall ? scope : "session";

  const games =
    effectiveScope === "overall"
      ? all.reduce((sum, s) => sum + s.games, 0)
      : (session?.games ?? 0);
  const net =
    effectiveScope === "overall"
      ? all.reduce((sum, s) => sum + s.net, 0)
      : (session?.net ?? 0);
  const srPerGame = games > 0 ? net / games : null;
  const nodes = buildLadder(sr, cutoffSr, rank);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {canToggleOverall ? (
          <ScopeToggle scope={scope} onChange={setScope} />
        ) : (
          <h2 className="text-base font-medium text-foreground">Session pace</h2>
        )}
        {games > 0 && srPerGame != null ? (
          <div className="flex items-center gap-3 text-md">
            <span className="numeric inline-flex items-center gap-1">
              <GameController weight="bold" className="size-5 text-muted" aria-hidden />
              <TickerNumeral value={games} />
            </span>
            <span className="numeric inline-flex items-center gap-1">
              <span className="font-bold text-muted">SR</span>
              <TickerNumeral value={net} format={formatDelta} />
            </span>
            <span className="numeric inline-flex items-center gap-1">
              <Gauge weight="bold" className="size-5 text-muted" aria-hidden />
              <TickerNumeral value={Math.round(srPerGame)} format={formatDelta} />
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted">Add SR to start tracking pace</p>
        )}
      </div>
      <div className="mt-3.5 justify-center flex flex-wrap items-center gap-x-3 gap-y-2.5 overflow-x-auto">
        <RankChip division={nodes[0]!.division} label={nodes[0]!.label} />
        {nodes.length === 1 ? (
          <span className="text-sm text-muted">Top of the ladder</span>
        ) : (
          nodes.slice(1).map((node) => {
            const remaining = Math.max(0, node.sr - sr);
            const gamesNeeded =
              srPerGame != null && srPerGame > 0 ? remaining / srPerGame : null;
            return (
              <span
                key={`${node.division}-${node.sr}`}
                className="inline-flex items-center gap-3"
              >
                <ArrowRight weight="bold" className="size-5 shrink-0 text-muted" />
                <RankChip division={node.division} label={node.label} />
                <span className="numeric text-sm text-muted">
                  {formatSr(remaining)} SR
                  {gamesNeeded != null ? ` (${gamesNeeded.toFixed(1)})` : ""}
                </span>
              </span>
            );
          })
        )}
      </div>
    </section>
  );
}
