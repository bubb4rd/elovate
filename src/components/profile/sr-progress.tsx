import { IRIDESCENT_SR } from "@/lib/ranked";
import { formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";

function compactSr(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return formatSr(value);
}

function calloutAlignClass(markerPct: number): string {
  if (markerPct <= 18) return "translate-x-0";
  if (markerPct >= 82) return "-translate-x-full";
  return "-translate-x-1/2";
}

export function SrProgress({
  currentSr,
  cutoffSr,
}: {
  currentSr: number;
  cutoffSr: number | null;
}) {
  const start = IRIDESCENT_SR;
  const end =
    cutoffSr != null && cutoffSr > start ? cutoffSr : start + 10_000;
  const fill = Math.min(1, Math.max(0, (currentSr - start) / (end - start)));
  const pct = Math.round(fill * 100);
  const remaining = Math.max(0, end - currentSr);
  const markerPct = Math.min(100, Math.max(0, fill * 100));
  const showCallout = remaining > 0;

  return (
    <div className="flex h-full flex-col justify-center gap-3 pr-2 pl-8 py-2">
      <div className="relative pt-9">
        {showCallout ? (
          <div
            className={cn(
              "pointer-events-none absolute top-0 whitespace-nowrap rounded-[6px] border border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium tracking-normal text-muted shadow-sm",
              calloutAlignClass(markerPct),
            )}
            style={{ left: `${markerPct}%` }}
            aria-hidden
          >
            <span className="numeric accent-glow text-foreground">{formatSr(remaining)}</span>
            <span> SR </span>
            <span aria-hidden>→</span>
            <span> Top 250</span>
          </div>
        ) : null}

        <div className="relative">
          {showCallout ? (
            <span
              className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-accent shadow-[0_0_8px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
              style={{ left: `${markerPct}%` }}
              aria-hidden
            />
          ) : null}

          <div
            className="h-2.5 overflow-hidden rounded-full bg-foreground/10"
            role="progressbar"
            aria-valuemin={start}
            aria-valuemax={end}
            aria-valuenow={currentSr}
            aria-label={
              showCallout
                ? `${formatSr(remaining)} SR to Top 250, ${pct}% from Iridescent`
                : `${pct}% from Iridescent to Top 250`
            }
          >
            <span
              className="profile-theme-gradient block h-full rounded-full"
              style={{
                width: `${pct}%`,
                boxShadow: "0 0 12px color-mix(in oklab, var(--accent) 45%, transparent)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between text-[11px] text-muted">
        <p>
          <span className="numeric text-foreground">{compactSr(start)}</span>
          <span className="mt-0.5 block">Iri</span>
        </p>
        <p className="text-right">
          <span className="numeric text-foreground">{compactSr(end)}</span>
          <span className="mt-0.5 block">Top250</span>
        </p>
      </div>
    </div>
  );
}
