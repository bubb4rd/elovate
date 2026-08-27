import { IRIDESCENT_SR } from "@/lib/ranked";
import { formatSr } from "@/lib/format";

function compactSr(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return formatSr(value);
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

  return (
    <div className="flex h-full flex-col justify-center gap-3 pr-2 pl-8 py-2">
      <div
        className="h-2.5 overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-valuemin={start}
        aria-valuemax={end}
        aria-valuenow={currentSr}
        aria-label={`${pct}% from Iridescent to Top 250`}
      >
        <span
          className="profile-theme-gradient block h-full rounded-full"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 12px color-mix(in oklab, var(--accent) 45%, transparent)",
          }}
        />
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
