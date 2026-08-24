"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { RankBadge } from "@/components/rank-badge";
import { TickerNumeral } from "@/components/ticker-numeral";
import { cn } from "@/lib/utils";
import { boardRankLabel, DIVISION_TONE, type RankInfo, type RankThreshold } from "@/lib/ranked";
import type { Mode } from "@/lib/data/types";

export function RankPlate({
  rank,
  sr,
  srInput,
  rankOptions,
  fee,
  mode,
  boardRank,
  onSrChange,
  onRankChange,
  onSrEditingChange,
}: {
  rank: RankInfo;
  sr: number;
  srInput: string;
  rankOptions: RankThreshold[];
  fee: number;
  mode: Mode;
  boardRank?: number | null;
  onSrChange: (value: string) => void;
  onRankChange: (value: string) => void;
  onSrEditingChange?: (editing: boolean) => void;
}) {
  const [editingSr, setEditingSr] = useState(false);
  const tone = DIVISION_TONE[rank.division];
  const charged = fee > 0;
  const feeLabel = charged ? `-${fee}` : "Free";
  const selectValue = String(rank.minSr);

  function setEditing(next: boolean) {
    setEditingSr(next);
    onSrEditingChange?.(next);
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex w-full max-w-[16.5rem] flex-col items-center rounded-[6px] border-2 bg-[#121214]/92 px-5 pt-6 pb-5"
        style={{
          borderColor: tone.glow,
          boxShadow: `0 0 20px ${tone.glow}47`,
        }}
      >
        <RankBadge rank={rank} />

        <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">Rank</p>
        <div className="relative mt-1 w-full rounded-[6px] focus-within:ring-2 focus-within:ring-accent">
          <p
            className={cn(
              "pointer-events-none flex items-center justify-center gap-1.5 text-2xl font-semibold tracking-tight",
              rank.division === "top250" ? "numeric" : "uppercase",
            )}
            style={{ color: tone.text }}
          >
            {boardRank != null ? (
              <TickerNumeral value={boardRank} format={boardRankLabel} />
            ) : (
              rank.divisionLabel
            )}
            <CaretDown weight="bold" className="size-4 shrink-0 text-zinc-500" />
          </p>
          <label className="sr-only" htmlFor="rank-select">
            Rank / tier
          </label>
          <select
            id="rank-select"
            value={selectValue}
            onChange={(e) => onRankChange(e.target.value)}
            className="absolute inset-0 w-full cursor-pointer appearance-none opacity-0"
            aria-label="Select rank"
          >
            {rankOptions.map((option) => (
              <option key={`${option.division}-${option.tier ?? "x"}`} value={option.sr}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="mt-4 flex h-9 w-full items-center gap-2 rounded-[6px] bg-black/70 px-2.5">
          <span className="text-[10px] font-semibold tracking-wide text-zinc-400">SR</span>
          <span className="relative min-w-0 flex-1">
            <TickerNumeral
              value={sr}
              skip={editingSr}
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-100",
                editingSr && "hidden",
              )}
            />
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={srInput}
              onChange={(e) => onSrChange(e.target.value)}
              onFocus={() => setEditing(true)}
              onBlur={() => setEditing(false)}
              className={cn(
                "numeric min-w-0 w-full bg-transparent text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                editingSr ? "text-zinc-100" : "text-transparent caret-transparent",
              )}
              aria-label="Current SR"
            />
          </span>
        </label>

        {mode === "wz" ? (
          <div
            className="mt-5 w-full rounded-[6px] px-3 py-3 text-center"
            style={{ background: charged ? "rgb(255 92 92 / 0.14)" : "rgb(255 255 255 / 0.05)" }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400"
              style={charged ? { color: "#ff8a8a" } : undefined}
            >
              Deployment fee
            </p>
            <p
              className={cn(
                "numeric mt-1 text-3xl font-semibold tracking-tight",
                !charged && "text-zinc-400",
              )}
              style={charged ? { color: "#ff5c5c" } : undefined}
            >
              {feeLabel}
            </p>
          </div>
        ) : null}
      </div>

      <p className="mt-3 w-full max-w-[16.5rem] text-center text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
        {mode === "wz" ? "Ranked play: resurgence" : "Ranked play: multiplayer"}
      </p>
    </div>
  );
}
