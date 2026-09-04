"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CaretDown,
  CaretUp,
  CaretUpDown,
} from "@phosphor-icons/react/dist/ssr";
import { formatDelta } from "@/lib/format";
import { avatarOrDefault } from "@/lib/profile/avatar";
import {
  avgPlacementLabel,
  type TeammateBreakdown,
  type TeammateStat,
} from "@/lib/premium/teammate-breakdown";
import { cn } from "@/lib/utils";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function netClass(value: number): string {
  if (value > 0) return "text-accent";
  if (value < 0) return "text-negative";
  return "text-muted";
}

function TeammateCell({ row }: { row: TeammateStat }) {
  const { teammate } = row;
  const inner = (
    <span className="flex items-center gap-2">
      <Image
        src={avatarOrDefault(teammate.avatarUrl)}
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0 rounded-full border border-border object-cover"
      />
      <span className="truncate font-medium text-foreground">
        {teammate.displayName}
      </span>
    </span>
  );
  return teammate.slug ? (
    <Link
      href={`/players/${teammate.slug}`}
      className="hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Callout({
  kind,
  row,
}: {
  kind: "best" | "drop";
  row: TeammateStat;
}) {
  const best = kind === "best";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[6px] border px-2.5 py-1.5 text-xs",
        best
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-negative/30 bg-negative/10 text-negative",
      )}
    >
      {best ? (
        <ArrowUp weight="bold" className="size-3.5 shrink-0" />
      ) : (
        <ArrowDown weight="bold" className="size-3.5 shrink-0" />
      )}
      <span className="font-medium uppercase tracking-[0.1em]">
        {best ? "Best duo" : "Drop this queue"}
      </span>
      <span className="text-foreground">{row.teammate.displayName}</span>
      <span className="numeric text-muted">
        {formatDelta(Math.round(row.avgNet))}/game · {row.games} games
      </span>
    </div>
  );
}

type SortDir = "asc" | "desc";
type SortKey =
  | "teammate"
  | "games"
  | "wins"
  | "posRate"
  | "avgNet"
  | "srPerHour"
  | "avgPlacement"
  | "elimShare";

/** Column sort value — nulls always sort to the bottom, in either direction. */
function sortValue(row: TeammateStat, key: SortKey): string | number | null {
  switch (key) {
    case "teammate":
      return row.teammate.displayName.toLowerCase();
    case "games":
      return row.games;
    case "wins":
      return row.wins;
    case "posRate":
      return row.positiveNetRate;
    case "avgNet":
      return row.avgNet;
    case "srPerHour":
      return row.srPerHour;
    case "avgPlacement":
      return row.avgPlacement;
    case "elimShare":
      return row.yourElimShare;
  }
}

function compare(
  a: string | number | null,
  b: string | number | null,
  dir: SortDir,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "string" || typeof b === "string") {
    const cmp = String(a).localeCompare(String(b));
    return dir === "asc" ? cmp : -cmp;
  }
  return dir === "asc" ? a - b : b - a;
}

const HEAD =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted";
const CELL = "px-3 py-2.5 text-sm";

function SortHead({
  label,
  sortKey,
  active,
  dir,
  align = "right",
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir | null;
  align?: "left" | "right";
  onSort: (key: SortKey) => void;
}) {
  return (
    <th
      className={cn(HEAD, align === "right" && "text-right")}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          align === "right" && "flex-row-reverse",
        )}
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? (
            <CaretUp weight="bold" className="size-3 shrink-0" />
          ) : (
            <CaretDown weight="bold" className="size-3 shrink-0" />
          )
        ) : (
          <CaretUpDown className="size-3 shrink-0 opacity-40" />
        )}
      </button>
    </th>
  );
}

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "teammate", label: "Teammate", align: "left" },
  { key: "games", label: "Games", align: "right" },
  { key: "wins", label: "Wins", align: "right" },
  { key: "posRate", label: "+Net", align: "right" },
  { key: "avgNet", label: "Avg net", align: "right" },
  { key: "srPerHour", label: "SR/hr", align: "right" },
  { key: "avgPlacement", label: "Avg finish", align: "right" },
  { key: "elimShare", label: "Your elims", align: "right" },
];

export function TeammateBreakdown({
  breakdown,
  className,
}: {
  breakdown: TeammateBreakdown;
  className?: string;
}) {
  const { rows, bestDuo, dropQueue } = breakdown;
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      // Third click on the same column resets to the default order.
      setSortKey(null);
      setSortDir(null);
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    return [...rows].sort((a, b) =>
      compare(sortValue(a, sortKey), sortValue(b, sortKey), sortDir),
    );
  }, [rows, sortKey, sortDir]);

  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-muted", className)}>
        Log a few WZ games with teammates and your duo breakdown shows up here.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {(bestDuo || dropQueue) && (
        <div className="flex flex-wrap gap-2">
          {bestDuo && <Callout kind="best" row={bestDuo} />}
          {dropQueue && dropQueue.key !== bestDuo?.key && (
            <Callout kind="drop" row={dropQueue} />
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-[8px] border border-border">
        <table className="w-full min-w-[40rem] border-collapse">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((col) => (
                <SortHead
                  key={col.key}
                  label={col.label}
                  sortKey={col.key}
                  align={col.align}
                  active={sortKey === col.key}
                  dir={sortKey === col.key ? sortDir : null}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-border last:border-0 odd:bg-surface/40"
              >
                <td className={cn(CELL, "max-w-[12rem]")}>
                  <TeammateCell row={row} />
                </td>
                <td className={cn(CELL, "numeric text-right text-muted")}>
                  {row.games}
                </td>
                <td className={cn(CELL, "numeric text-right text-muted")}>
                  {row.wins}
                </td>
                <td className={cn(CELL, "numeric text-right text-muted")}>
                  {pct(row.positiveNetRate)}
                </td>
                <td
                  className={cn(
                    CELL,
                    "numeric text-right font-medium",
                    netClass(row.avgNet),
                  )}
                >
                  {formatDelta(Math.round(row.avgNet))}
                </td>
                <td
                  className={cn(
                    CELL,
                    "numeric text-right",
                    row.srPerHour == null ? "text-muted" : netClass(row.srPerHour),
                  )}
                >
                  {row.srPerHour == null
                    ? "—"
                    : formatDelta(Math.round(row.srPerHour))}
                </td>
                <td className={cn(CELL, "text-right text-muted")}>
                  {avgPlacementLabel(row.avgPlacement)}
                </td>
                <td className={cn(CELL, "numeric text-right text-muted")}>
                  {row.yourElimShare == null ? "—" : pct(row.yourElimShare)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
