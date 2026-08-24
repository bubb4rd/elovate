import { formatDelta, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardMetrics } from "@/lib/data/types";

export function HeadingMetrics({ metrics }: { metrics: BoardMetrics }) {
  const items = [
    {
      label: "Cutoff",
      value: formatSr(metrics.cutoffSr),
      tone: "accent" as const,
      primary: true,
    },
    {
      label: "Avg / day (7d)",
      value: formatDelta(Math.round(metrics.avgPerDay7d)),
      tone: metrics.avgPerDay7d >= 0 ? ("accent" as const) : ("neg" as const),
      primary: false,
    },
    {
      label: "Avg / day (season)",
      value: formatDelta(Math.round(metrics.avgPerDaySeason)),
      tone: metrics.avgPerDaySeason >= 0 ? ("accent" as const) : ("neg" as const),
      primary: false,
    },
  ];

  return (
    <dl className="flex flex-wrap items-end gap-x-0 gap-y-3 sm:justify-end">
      {items.map((item) => (
        <div key={item.label} className="px-3 first:pl-0 last:pr-0">
          <dd
            className={cn(
              "numeric leading-none",
              item.primary ? "text-3xl font-semibold tracking-tight" : "text-base",
              item.tone === "accent" && "accent-glow text-accent",
              item.tone === "neg" && "text-negative",
              item.tone === "muted" && "text-muted",
            )}
          >
            {item.value}
          </dd>
          <dt
            className={cn(
              "mt-1 text-muted",
              item.primary ? "text-xs font-medium" : "text-[11px]",
            )}
          >
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
