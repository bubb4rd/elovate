import { cn } from "@/lib/utils";
import { ProFeatureCard } from "./pro-feature-card";

/**
 * Decorative `/pro` showcase cards for the launch Pro features that don't have a
 * live demo yet (PREM-01 teammate breakdown, PREM-02 placement efficiency,
 * PREM-11 SR-to-T250, PREM-15 unlimited history).
 *
 * These are marketing previews — hand-picked sample numbers, plain SVG/flex,
 * no data reads. They render identically for signed-out visitors. When a
 * workstream ships its real demo it replaces the matching card here.
 */

/** `index` positions the card in the showcase's staggered scroll-in. */
type PreviewProps = { index?: number };

// --- Teammate breakdown -----------------------------------------------------

const SQUAD_ROWS: { name: string; net: number; share: number; neg?: boolean }[] = [
  { name: "Wraith", net: 214, share: 1 },
  { name: "K7", net: 138, share: 0.64 },
  { name: "Vez", net: 41, share: 0.32 },
  { name: "solo queue", net: -58, share: 0.36, neg: true },
];

export function TeammateBreakdownPreview({ index }: PreviewProps) {
  return (
    <ProFeatureCard
      index={index}
      title="Teammate breakdown"
      blurb="Net SR, win rate and SR/hour for every squad you run."
    >
      <p className="text-[11px] text-muted">Net SR &middot; last 14 days</p>
      <div className="space-y-2">
        {SQUAD_ROWS.map((row) => (
          <div key={row.name} className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 truncate text-xs text-foreground">
              {row.name}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <span
                className={cn(
                  "block h-full rounded-full",
                  row.neg ? "bg-negative" : "bg-accent",
                )}
                style={{ width: `${Math.round(row.share * 100)}%` }}
              />
            </span>
            <span
              className={cn(
                "numeric w-10 shrink-0 text-right text-xs font-semibold",
                row.neg ? "text-negative" : "text-accent",
              )}
            >
              {row.net > 0 ? "+" : ""}
              {row.net}
            </span>
          </div>
        ))}
      </div>
    </ProFeatureCard>
  );
}

// --- Placement efficiency --------------------------------------------------

export function PlacementEfficiencyPreview({ index }: PreviewProps) {
  return (
    <ProFeatureCard
      index={index}
      title="Placement efficiency"
      blurb="How much of your SR comes from placement vs elims."
    >
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <p className="numeric text-lg font-semibold text-foreground">
            62<span className="text-xs font-medium text-muted">% placement</span>
          </p>
          <p className="numeric text-lg font-semibold text-foreground">
            38<span className="text-xs font-medium text-muted">% elims</span>
          </p>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full border border-border">
          <span className="bg-accent" style={{ width: "62%" }} />
          <span className="bg-accent/35" style={{ width: "38%" }} />
        </div>
        <p className="numeric text-xs text-muted">&minus;420 SR lost to caps</p>
      </div>
    </ProFeatureCard>
  );
}

// --- SR to T250 -----------------------------------------------------------

function ArcGauge({
  pct,
  value,
  unit,
  caption,
}: {
  pct: number;
  value: string;
  unit: string;
  caption: string;
}) {
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 60" className="w-full max-w-[190px]">
        <path
          d="M8 56 A 52 52 0 0 1 112 56"
          fill="none"
          stroke="var(--border)"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={1}
        />
        <path
          d="M8 56 A 52 52 0 0 1 112 56"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${clamped} 1`}
        />
        <text
          x="60"
          y="50"
          textAnchor="middle"
          className="numeric fill-foreground"
          style={{ fontSize: "17px", fontWeight: 700 }}
        >
          {value}
        </text>
      </svg>
      <p className="numeric -mt-1 text-xs font-medium text-muted">{unit}</p>
      <p className="mt-1 text-[11px] text-muted">{caption}</p>
    </div>
  );
}

export function SrToT250Preview({ index }: PreviewProps) {
  return (
    <ProFeatureCard
      index={index}
      layout="split"
      title="SR-to-T250 tracker"
      blurb="Your gap to the live cutoff, and when your pace catches it."
    >
      <ArcGauge pct={0.78} value="+310" unit="SR to cutoff" caption="T250 in ~18 days" />
    </ProFeatureCard>
  );
}

// --- Unlimited history ---------------------------------------------------

const SEASON_BARS = [38, 52, 45, 68, 60, 82];

export function UnlimitedHistoryPreview({ index }: PreviewProps) {
  return (
    <ProFeatureCard
      index={index}
      layout="split"
      title="Unlimited history"
      blurb="Every match from every season, not just your last 500."
    >
      <div className="w-full max-w-[220px]">
        <div className="relative flex h-24 items-end gap-2">
          {SEASON_BARS.map((height, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-[3px] bg-accent/80"
              style={{ height: `${height}%` }}
            />
          ))}
          <span
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted"
            style={{ bottom: "26%" }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted">
          <span>Free: last 500</span>
          <span>Pro: all seasons</span>
        </div>
      </div>
    </ProFeatureCard>
  );
}
