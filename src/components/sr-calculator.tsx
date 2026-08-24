"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankPlate } from "@/components/rank-plate";
import { RankTimeline } from "@/components/rank-timeline";
import { SrTicket } from "@/components/sr-ticket";
import { TickerNumeral } from "@/components/ticker-numeral";
import { formatDelta, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SR_PER_LOSS,
  DEFAULT_SR_PER_WIN,
  RESULT_PRESETS,
  WZ_PLACEMENTS,
  clampSr,
  boardRankLabel,
  estimatedBoardRank,
  mpGamesToTarget,
  nextBoardTarget,
  rankFromSr,
  rankThresholds,
  resolveTarget,
  elimSrBreakdown,
  squadElimBaseline,
  wzGamesToTarget,
  wzNetSr,
  type BoardRung,
  type ClimbTarget,
  type RankDelta,
  type WzPlacementId,
} from "@/lib/ranked";
import type { Mode } from "@/lib/data/types";

const STORAGE_KEY = "elovate-calc-sr";
const STORAGE_EVENT = "elovate-calc-sr";

const TARGETS: { id: ClimbTarget; label: string }[] = [
  { id: "nextTier", label: "Next tier" },
  { id: "nextDivision", label: "Next rank" },
  { id: "iridescent", label: "Iridescent" },
  { id: "top250", label: "Live T250" },
];

type StoredCalc = {
  sr?: number;
  srInput?: string;
  elims?: number;
  elimsInput?: string;
  squadElims?: number;
  squadElimsInput?: string;
  yourElims?: number;
  yourElimsInput?: string;
  rankDelta?: number;
  protection?: number;
  dailyForgive?: boolean;
  srPerWin?: number;
  srPerWinInput?: string;
  srPerLoss?: number;
  srPerLossInput?: string;
  target?: ClimbTarget;
  placement?: WzPlacementId | null;
};

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function parseStored(raw: string): StoredCalc {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredCalc;
  } catch {
    return {};
  }
}

function writeStored(next: StoredCalc) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function asRankDelta(value: number | undefined): RankDelta {
  if (value == null || value < -3 || value > 3) return 0;
  return Math.round(value) as RankDelta;
}

function asTarget(value: ClimbTarget | string | undefined): ClimbTarget {
  return TARGETS.find((item) => item.id === value)?.id ?? "nextTier";
}

function asPlacement(value: WzPlacementId | null | undefined): WzPlacementId | null {
  if (value == null) return null;
  if (WZ_PLACEMENTS.some((item) => item.id === value)) return value;
  return null;
}

const COMMON_SQUAD_ELIMS = [5, 10, 15, 20, 25] as const;
const COMMON_YOUR_ELIMS = [0, 2, 5, 8, 10] as const;

function readSquadElims(stored: StoredCalc): { value: number; input: string } {
  if (stored.squadElimsInput != null || stored.squadElims != null) {
    const input = stored.squadElimsInput ?? String(stored.squadElims);
    return { input, value: Math.max(0, Math.floor(Number(input) || 0)) };
  }
  if (stored.elimsInput != null || stored.elims != null) {
    const input = stored.elimsInput ?? String(stored.elims);
    return { input, value: Math.max(0, Math.floor(Number(input) || 0)) };
  }
  return { input: "", value: 0 };
}

function readYourElims(stored: StoredCalc): { value: number; input: string } {
  if (stored.yourElimsInput != null || stored.yourElims != null) {
    const input = stored.yourElimsInput ?? String(stored.yourElims);
    return { input, value: Math.max(0, Math.floor(Number(input) || 0)) };
  }
  if (stored.elims != null || stored.elimsInput != null) {
    const legacy = Math.max(0, Math.floor(Number(stored.elimsInput ?? stored.elims) || 0));
    return { input: String(legacy), value: legacy };
  }
  return { input: "", value: 0 };
}

export function SrCalculator({
  mode,
  cutoffSr,
  ladder,
}: {
  mode: Mode;
  cutoffSr: number;
  ladder: BoardRung[];
}) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stored = parseStored(raw);

  const srInput = stored.srInput ?? (stored.sr != null ? String(stored.sr) : "0");
  const squadElimsState = readSquadElims(stored);
  const squadElimsInput = squadElimsState.input;
  const squadElims = squadElimsState.value;
  const yourElimsState = readYourElims(stored);
  const yourElimsInput = yourElimsState.input;
  const yourElims = yourElimsState.value;
  const srPerWinInput =
    stored.srPerWinInput ?? (stored.srPerWin != null ? String(stored.srPerWin) : String(DEFAULT_SR_PER_WIN));
  const srPerLossInput =
    stored.srPerLossInput ??
    (stored.srPerLoss != null ? String(stored.srPerLoss) : String(DEFAULT_SR_PER_LOSS));
  const rankDelta = asRankDelta(stored.rankDelta);
  const target = asTarget(stored.target);
  const placementId = asPlacement(stored.placement);

  const [editingSr, setEditingSr] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const sr = clampSr(Number(srInput) || 0);
  const yourElimsClamped = Math.min(yourElims, squadElims);
  const srPerWin = Math.max(0, Math.floor(Number(srPerWinInput) || 0));
  const srPerLoss = Math.max(0, Math.floor(Number(srPerLossInput) || 0));

  function patch(next: Partial<StoredCalc>) {
    writeStored({
      ...stored,
      sr,
      squadElims,
      yourElims: yourElimsClamped,
      srPerWin,
      srPerLoss,
      rankDelta,
      target,
      placement: placementId,
      srInput,
      squadElimsInput,
      yourElimsInput,
      srPerWinInput,
      srPerLossInput,
      ...next,
    });
  }

  const rank = rankFromSr(sr, cutoffSr);
  const liveRank = estimatedBoardRank(sr, ladder);
  const boardLabel = liveRank != null ? `#${liveRank}` : null;
  const displayRank =
    boardLabel == null
      ? rank
      : { ...rank, divisionLabel: boardLabel, label: boardLabel };
  const boardTarget = nextBoardTarget(sr, ladder);
  const resolved = boardTarget
    ? { sr: boardTarget.sr, label: boardTarget.label, reached: boardTarget.reached }
    : resolveTarget(sr, target, cutoffSr);
  const climbOptions = boardTarget
    ? [{ id: `board:${boardTarget.rank}`, label: boardTarget.label }]
    : TARGETS;
  const climbValue = boardTarget ? `board:${boardTarget.rank}` : target;
  const remaining = Math.max(0, resolved.sr - sr);
  const rankOptions = rankThresholds(cutoffSr);
  const selectedPlacement = placementId
    ? (WZ_PLACEMENTS.find((p) => p.id === placementId) ?? null)
    : null;

  const wzScenarios = WZ_PLACEMENTS.map((placement) => {
    const result = wzGamesToTarget({
      currentSr: sr,
      targetSr: resolved.sr,
      placement,
      squadElims,
      yourElims: yourElimsClamped,
      rankDelta,
      cutoffSr,
    });
    return { placement, ...result };
  });

  const mpResult = mpGamesToTarget({
    currentSr: sr,
    targetSr: resolved.sr,
    srPerWin,
  });

  const selectedWz = placementId
    ? (wzScenarios.find((s) => s.placement.id === placementId) ?? null)
    : null;
  const headlineNet = mode === "wz" ? (selectedWz?.net ?? 0) : mpResult.net;
  const headlineGames = mode === "wz" ? (selectedWz?.games ?? null) : mpResult.games;
  const projectedSr =
    headlineGames == null
      ? Math.max(0, sr + headlineNet)
      : Math.max(0, sr + headlineGames * headlineNet);
  const canCancel =
    mode === "wz"
      ? squadElimsInput.trim() !== "" ||
        yourElimsInput.trim() !== "" ||
        placementId != null
      : srPerWinInput.trim() !== "";

  function clearedGame(): Partial<StoredCalc> {
    if (mode === "wz") {
      return {
        squadElims: 0,
        squadElimsInput: "",
        yourElims: 0,
        yourElimsInput: "",
        placement: null,
      };
    }
    return { srPerWin: 0, srPerWinInput: "" };
  }

  function addSr() {
    if (headlineNet === 0) return;
    const next = clampSr(sr + headlineNet);
    patch({ sr: next, srInput: String(next), ...clearedGame() });
  }

  function cancel() {
    if (!canCancel) return;
    patch(clearedGame());
  }

  function patchSr(value: string) {
    patch({ srInput: value, sr: clampSr(Number(value) || 0) });
  }

  const elimParts = elimSrBreakdown(squadElims, yourElimsClamped);
  const placementSr = selectedPlacement?.placementSr ?? 0;
  const ticketNet = placementSr + elimParts.elimSr - rank.fee;
  const ticketOpen =
    hydrated &&
    mode === "wz" &&
    (placementId != null || squadElimsInput.trim() !== "" || yourElimsInput.trim() !== "");

  return (
    <div className={cn("mt-4", ticketOpen && "max-md:pb-[14.5rem] md:pb-8")}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,0.85fr)_minmax(360px,1.15fr)]">
        <div className="space-y-5">
          <RankPlate
            rank={displayRank}
            sr={sr}
            srInput={srInput}
            rankOptions={rankOptions}
            fee={rank.fee}
            mode={mode}
            boardRank={liveRank}
            onSrChange={patchSr}
            onRankChange={patchSr}
            onSrEditingChange={setEditingSr}
          />

          {mode === "mp" ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs text-muted">SR per win</span>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={srPerWinInput}
                  onChange={(e) =>
                    patch({
                      srPerWinInput: e.target.value,
                      srPerWin: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })
                  }
                  aria-describedby="win-help"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {RESULT_PRESETS.map((preset) => {
                  const placement =
                    WZ_PLACEMENTS.find((item) => item.id === preset.id) ?? WZ_PLACEMENTS[0]!;
                  const net = wzNetSr({
                    sr,
                    placement,
                    squadElims: preset.elims,
                    yourElims: Math.round(squadElimBaseline(preset.elims)),
                    rankDelta,
                    cutoffSr,
                  }).net;
                  const active = srPerWin === net && net > 0;
                  return (
                    <Button
                      key={preset.id}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      disabled={net <= 0}
                      onClick={() =>
                        patch({
                          srPerWin: net,
                          srPerWinInput: String(net),
                        })
                      }
                    >
                      {preset.label}
                      <span className="numeric ml-1 text-[10px] opacity-80">{formatDelta(net)}</span>
                    </Button>
                  );
                })}
              </div>
              <span id="win-help" className="text-[11px] text-muted">
                Typical Warzone nets at your rank. Edit if your lobby pays differently.
              </span>
              <ApplyGameBar
                net={headlineNet}
                canCancel={canCancel}
                onAdd={addSr}
                onCancel={cancel}
              />
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold tracking-tight">
              <span className="accent-glow bg-linear-to-r from-geebung-600 to-geebung-500 bg-clip-text text-4xl text-transparent md:text-5xl">
                Climb
              </span>
              <span className="text-2xl text-muted">to</span>
              <span className="relative inline-flex items-center rounded-[6px] text-xl md:text-5xl focus-within:ring-2 focus-within:ring-accent">
                <span className="pointer-events-none inline-flex items-center gap-1.5">
                  {boardTarget ? (
                    <TickerNumeral value={boardTarget.rank} format={boardRankLabel} />
                  ) : (
                    resolved.label
                  )}
                  {climbOptions.length > 1 ? (
                    <CaretDown weight="bold" className="size-5 shrink-0 text-muted" />
                  ) : null}
                </span>
                <select
                  id="climb-target"
                  value={climbValue}
                  disabled={climbOptions.length === 1}
                  onChange={(e) => patch({ target: e.target.value as ClimbTarget })}
                  className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-default"
                  aria-label="Climb to rank"
                >
                  {climbOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </span>
              <span
                className={cn(
                  "numeric inline-flex items-baseline gap-1.5 text-xl leading-none md:text-5xl",
                  resolved.reached ? "text-muted" : "accent-glow text-accent",
                )}
              >
                <TickerNumeral
                  value={resolved.reached ? 0 : remaining}
                  skip={editingSr}
                />
                <span className="text-lg font-medium text-muted">SR</span>
              </span>
            </h1>
          </div>

          {mode === "wz" ? (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted">Squad elims</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {COMMON_SQUAD_ELIMS.map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={
                        squadElimsInput.trim() !== "" && squadElims === n ? "default" : "outline"
                      }
                      onClick={() => patch({ squadElims: n, squadElimsInput: String(n) })}
                    >
                      {n}
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    inputMode="numeric"
                    placeholder="e.g. 40"
                    value={squadElimsInput}
                    onChange={(e) =>
                      patch({
                        squadElimsInput: e.target.value,
                        squadElims: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      })
                    }
                    aria-label="Custom squad elims"
                    className="h-8 w-[5.5rem] px-2 text-center"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted">Your elims</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {COMMON_YOUR_ELIMS.map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={
                        yourElimsInput.trim() !== "" && yourElimsClamped === n
                          ? "default"
                          : "outline"
                      }
                      onClick={() => patch({ yourElims: n, yourElimsInput: String(n) })}
                    >
                      {n}
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    inputMode="numeric"
                    placeholder="e.g. 8"
                    value={yourElimsInput}
                    onChange={(e) =>
                      patch({
                        yourElimsInput: e.target.value,
                        yourElims: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      })
                    }
                    aria-label="Custom your elims"
                    className="h-8 w-[5.5rem] px-2 text-center"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {wzScenarios.map((row) => {
                const selected = row.placement.id === placementId;
                return (
                  <button
                    key={row.placement.id}
                    type="button"
                    onClick={() => patch({ placement: row.placement.id })}
                    className={cn(
                      "rounded-[6px] border px-3 py-3 text-left transition-[transform,background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      selected
                        ? "border-accent bg-surface-elevated"
                        : "border-border bg-surface hover:border-border/80",
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-medium",
                        row.placement.highlight ? "text-accent" : "text-muted",
                      )}
                    >
                      {row.placement.label}
                    </p>
                    <p
                      className={cn(
                        "numeric mt-2 text-lg leading-none",
                        row.net > 0 && "text-accent",
                        row.net < 0 && "text-negative",
                        row.net === 0 && "text-muted",
                      )}
                    >
                      {formatDelta(row.net)}
                    </p>
                    <p className="mt-2 text-[11px] text-muted">
                      {resolved.reached
                        ? "At target"
                        : row.games != null
                          ? `${row.games} game${row.games === 1 ? "" : "s"}`
                          : row.breakEvenElims != null
                            ? `${row.breakEvenElims} elim${row.breakEvenElims === 1 ? "" : "s"} to go positive`
                            : "Cannot climb"}
                    </p>
                  </button>
                );
              })}
              </div>
              <ApplyGameBar
                net={headlineNet}
                canCancel={canCancel}
                onAdd={addSr}
                onCancel={cancel}
              />
            </div>
          ) : (
            <div className="panel-elevated mt-6 px-4 py-4">
              <p className="text-xs text-muted">Wins to {resolved.label}</p>
              <p className="numeric mt-2 text-3xl font-semibold tracking-tight text-accent">
                {resolved.reached ? "0" : mpResult.games != null ? mpResult.games : "n/a"}
              </p>
              <p className="mt-2 text-sm text-muted">
                {resolved.reached
                  ? "Already at this target."
                  : mpResult.games == null
                    ? "Set SR per win above zero to estimate games."
                    : `${mpResult.games} win${mpResult.games === 1 ? "" : "s"} at +${formatSr(mpResult.net)} each.`}
              </p>
            </div>
          )}
        </div>
      </div>

      <RankTimeline
        currentSr={sr}
        projectedSr={projectedSr}
        cutoffSr={cutoffSr}
        rank={displayRank}
        fee={rank.fee}
        showFee={mode === "wz"}
        skip={editingSr || !hydrated}
      />
      <SrTicket
        open={ticketOpen}
        placementSr={placementSr}
        fee={rank.fee}
        yourSr={elimParts.yourSr}
        squadSr={elimParts.squadSr}
        elimSr={elimParts.elimSr}
        net={ticketNet}
        capped={elimParts.capped}
      />
    </div>
  );
}

function ApplyGameBar({
  net,
  canCancel,
  onAdd,
  onCancel,
}: {
  net: number;
  canCancel: boolean;
  onAdd: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" disabled={net === 0} onClick={onAdd}>
        Add {formatDelta(net)} SR
      </Button>
      <Button type="button" variant="outline" disabled={!canCancel} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  primary = false,
  numeric = true,
}: {
  label: string;
  value: string;
  tone: "accent" | "neg" | "muted" | "plain";
  primary?: boolean;
  numeric?: boolean;
}) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <dd
        className={cn(
          "leading-none",
          numeric && "numeric",
          primary ? "text-3xl font-semibold tracking-tight" : "text-base",
          tone === "accent" && "accent-glow text-accent",
          tone === "neg" && "text-negative",
          tone === "muted" && "text-muted",
        )}
      >
        {value}
      </dd>
      <dt className={cn("mt-1 text-muted", primary ? "text-xs font-medium" : "text-[11px]")}>
        {label}
      </dt>
    </div>
  );
}
