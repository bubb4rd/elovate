import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react/dist/ssr";
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

const HEAD =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted";
const CELL = "px-3 py-2.5 text-sm";

export function TeammateBreakdown({
  breakdown,
  className,
}: {
  breakdown: TeammateBreakdown;
  className?: string;
}) {
  const { rows, bestDuo, dropQueue } = breakdown;

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
        <table className="w-full min-w-[36rem] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={HEAD}>Teammate</th>
              <th className={cn(HEAD, "text-right")}>Games</th>
              <th className={cn(HEAD, "text-right")}>+Net</th>
              <th className={cn(HEAD, "text-right")}>Avg net</th>
              <th className={cn(HEAD, "text-right")}>SR/hr</th>
              <th className={cn(HEAD, "text-right")}>Avg finish</th>
              <th className={cn(HEAD, "text-right")}>Your elims</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
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
