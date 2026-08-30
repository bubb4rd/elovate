import { formatDelta, formatSr, snapshotAge } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardMetrics } from "@/lib/data/types";

export function MetricStrip({ metrics }: { metrics: BoardMetrics }) {
  const items = [
    { label: "Cutoff SR", value: formatSr(metrics.cutoffSr), tone: "accent" as const },
    {
      label: "Avg / day (season)",
      value:
        metrics.avgPerDaySeason == null
          ? "—"
          : formatDelta(Math.round(metrics.avgPerDaySeason)),
      tone:
        metrics.avgPerDaySeason == null
          ? ("plain" as const)
          : metrics.avgPerDaySeason >= 0
            ? ("accent" as const)
            : ("neg" as const),
    },
    {
      label: "Avg / day (7d)",
      value:
        metrics.avgPerDay7d == null
          ? "—"
          : formatDelta(Math.round(metrics.avgPerDay7d)),
      tone:
        metrics.avgPerDay7d == null
          ? ("plain" as const)
          : metrics.avgPerDay7d >= 0
            ? ("accent" as const)
            : ("neg" as const),
    },
    { label: "Players sampled", value: String(metrics.playersSampled), tone: "plain" as const },
    { label: "Snapshot age", value: snapshotAge(metrics.capturedAt), tone: "plain" as const },
  ];

  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="panel-elevated px-3 py-3"
        >
          <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{item.label}</dt>
          <dd
            className={cn(
              "numeric mt-2 text-xl leading-none",
              item.tone === "accent" && "text-accent",
              item.tone === "neg" && "text-negative",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
