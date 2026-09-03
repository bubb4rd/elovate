import { cn } from "@/lib/utils";
import type { HomeSignal } from "@/lib/home/pro-preview";

/**
 * One rail of the home signal marquee. A CSS-keyframe translate on a doubled
 * track (so `-50%` is the seamless loop point), paused on hover / keyboard
 * focus. The whole thing is pure CSS: `motion-reduce` turns the rail into a
 * horizontal scroll-snap strip so every chip stays reachable without motion,
 * and no JS or hydration branch is involved.
 *
 * Free and Pro chips are the same object — `panel-elevated`, `--border`, 6px.
 * Pro carries a small accent `Pro` label, never a stroke or a crown.
 */

function Spark({ points, accent }: { points: number[]; accent: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 44;
  const h = 16;
  const d = points
    .map(
      (p, i) =>
        `${((i / (points.length - 1)) * w).toFixed(1)},${(h - ((p - min) / range) * h).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-4 w-11 shrink-0", accent ? "text-accent" : "text-muted")}
      fill="none"
      aria-hidden
    >
      <polyline
        points={d}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignalChip({ signal }: { signal: HomeSignal }) {
  const pro = signal.kind === "pro";
  const valueClass =
    signal.valueTone === "accent"
      ? "text-accent"
      : signal.valueTone === "negative"
        ? "text-negative"
        : "text-foreground";

  return (
    <li className="panel-elevated flex h-[104px] w-[244px] shrink-0 snap-start flex-col justify-between px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-md font-medium text-muted">
          {signal.label}
        </span>
        {pro ? (
          <span className="shrink-0 text-sm font-semibold uppercase tracking-wide text-accent">
            Pro
          </span>
        ) : null}
      </div>
      <div className="flex items-end gap-2">
        <span className={cn("numeric text-2xl leading-none", valueClass)}>
          {signal.value}
        </span>
        <span className="truncate text-sm text-muted">{signal.support}</span>
        {signal.spark ? (
          <span className="ml-auto">
            <Spark points={signal.spark} accent={signal.valueTone === "accent"} />
          </span>
        ) : null}
      </div>
    </li>
  );
}

// Chip footprint: 244px wide + the 16px flex gap.
const CHIP_STRIDE = 260;
// One repeating unit must out-run the widest realistic viewport, or the track
// runs dry before it loops on large screens.
const MIN_UNIT_PX = 3000;
// Constant scroll speed regardless of how many chips the unit ended up holding.
const PX_PER_SECOND = 42;

export function SignalRail({
  id,
  signals,
  direction,
  railLabel,
}: {
  id: string;
  signals: HomeSignal[];
  direction: "left" | "right";
  railLabel: string;
}) {
  const reps = Math.max(
    2,
    Math.ceil(MIN_UNIT_PX / (signals.length * CHIP_STRIDE)),
  );
  const unit = Array.from({ length: reps }, () => signals).flat();
  const loop = [...unit, ...unit];
  const durationSec = Math.round((unit.length * CHIP_STRIDE) / PX_PER_SECOND);

  return (
    <div
      className={cn(
        "group relative",
        "overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]",
        "motion-reduce:snap-x motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]",
      )}
      tabIndex={0}
      role="group"
      aria-label={`${railLabel}. Focus to pause the marquee.`}
      aria-describedby={id}
    >
      <ul id={id} className="sr-only">
        {signals.map((signal) => (
          <li key={signal.id}>
            {`${signal.label}, ${signal.value}, ${signal.support}`}
            {signal.kind === "pro" ? ", Pro" : ""}
          </li>
        ))}
      </ul>
      <ul
        aria-hidden
        style={{ animationDuration: `${durationSec}s` }}
        className={cn(
          // pr-4 adds the trailing gap so a -50% shift lands seamlessly.
          "flex w-max gap-4 pr-4",
          "group-hover:[animation-play-state:paused] group-focus:[animation-play-state:paused]",
          direction === "left"
            ? "motion-safe:[animation:marquee-left_1s_linear_infinite]"
            : "motion-safe:[animation:marquee-right_1s_linear_infinite]",
        )}
      >
        {loop.map((signal, i) => (
          <SignalChip key={`${signal.id}-${i}`} signal={signal} />
        ))}
      </ul>
    </div>
  );
}
