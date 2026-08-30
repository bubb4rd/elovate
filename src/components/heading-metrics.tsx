import { LiveStatus, type BoardFreshnessStatus } from "@/components/live-status";
import { formatDelta, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardMetrics } from "@/lib/data/types";

export function HeadingMetrics({
  metrics,
  nextUpdateAt,
  boardStatus = "live",
  showCutoff = true,
  className,
}: {
  metrics: BoardMetrics;
  nextUpdateAt?: string;
  boardStatus?: BoardFreshnessStatus;
  showCutoff?: boolean;
  className?: string;
}) {
  const items = [
    ...(showCutoff
      ? [
          {
            label: "Cutoff",
            value: formatSr(metrics.cutoffSr),
            tone: "accent" as const,
            primary: true,
          },
        ]
      : []),
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
      primary: false,
    },
  ];

  return (
    <dl
      className={cn(
        "flex flex-wrap items-end gap-x-0 gap-y-3 sm:justify-end",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-3 text-right first:pl-0 last:pr-0">
          <dd
            className={cn(
              "numeric leading-none",
              item.primary ? "text-3xl font-semibold tracking-tight" : "text-base",
              item.tone === "accent" && "accent-glow text-accent",
              item.tone === "neg" && "text-negative",
            )}
          >
            {item.value}
          </dd>
          <dt
            className={cn(
              "mt-1 text-muted",
              item.primary
                ? "flex items-center gap-1.5 text-xs font-medium"
                : "text-[11px]",
            )}
          >
            {item.primary && nextUpdateAt ? (
              <LiveStatus nextUpdateAt={nextUpdateAt} status={boardStatus} />
            ) : null}
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
