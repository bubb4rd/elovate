import { formatDelta, formatSr } from "@/lib/format";
import { nowMs } from "@/lib/premium/clock";
import { ProTeaserCard, TeaserCaption } from "./pro-feature-card";
import { type RacePoint, SrToT250RaceChart } from "./sr-to-t250-race-chart";

/**
 * PREM-11 teaser — "Will I make T250, and is the cutoff outrunning me?"
 *
 * Layout family: an object race chart (you vs the live cutoff) with a catch
 * callout on the crossing. Not a completeness gauge. Deterministic sample data
 * anchored to `nowMs()` so the catch date reads as a nearby calendar date.
 */

const DAY_MS = 86_400_000;

const SAMPLE = {
  cutoffNowSr: 10_800,
  gapSr: 310,
  yourRatePerDay: 49,
  cutoffRatePerDay: 31,
  historyDays: 12,
};

/** Deterministic mild wobble so the sample lines don't look ruled. */
function wobble(day: number): number {
  if (day === 0) return 0;
  if (day % 3 === 0) return 16;
  if (day % 2 === 0) return -11;
  return 6;
}

function buildRace(now: number) {
  const cutNow = SAMPLE.cutoffNowSr;
  const youNow = cutNow - SAMPLE.gapSr;

  const you: RacePoint[] = [];
  const cutoff: RacePoint[] = [];
  for (let d = SAMPLE.historyDays; d >= 0; d -= 1) {
    const t = now - d * DAY_MS;
    const n = wobble(d);
    you.push({ t, sr: Math.round(youNow - SAMPLE.yourRatePerDay * d + n) });
    cutoff.push({ t, sr: Math.round(cutNow - SAMPLE.cutoffRatePerDay * d + n * 0.3) });
  }

  const closing = SAMPLE.yourRatePerDay - SAMPLE.cutoffRatePerDay;
  const willCatch = closing > 0;
  const catchDaysExact = willCatch ? SAMPLE.gapSr / closing : Infinity;
  const catchDays = Number.isFinite(catchDaysExact) ? Math.ceil(catchDaysExact) : null;
  const crossMs = now + (catchDays ?? 45) * DAY_MS;
  const crossSr = youNow + SAMPLE.yourRatePerDay * (catchDays ?? 45);

  return { you, cutoff, willCatch, catchDays, crossMs, crossSr };
}

export function SrToT250Preview({ index }: { index?: number }) {
  const now = nowMs();
  const { you, cutoff, willCatch, catchDays, crossMs, crossSr } = buildRace(now);

  const headline =
    willCatch && catchDays != null
      ? `T250 in ${catchDays} days`
      : "Cutoff is pulling away";
  const calloutLabel =
    willCatch && catchDays != null ? `${catchDays}d` : "miss";
  const insight =
    willCatch && catchDays != null
      ? `${formatSr(SAMPLE.gapSr)} SR to cutoff. At this pace, T250 in ${catchDays} days.`
      : `${formatSr(SAMPLE.gapSr)} SR to cutoff, and it is climbing faster than you.`;
  const a11yLabel =
    willCatch && catchDays != null
      ? `${formatSr(SAMPLE.gapSr)} SR to the live T250 cutoff. At ${formatDelta(
          SAMPLE.yourRatePerDay,
        )} SR per day versus cutoff ${formatDelta(
          SAMPLE.cutoffRatePerDay,
        )}, projected catch in ${catchDays} days.`
      : `${formatSr(SAMPLE.gapSr)} SR to the live T250 cutoff. Cutoff is pulling away; not projected this season.`;

  return (
    <ProTeaserCard index={index} bleed>
      <div className="px-4 pt-4">
        <TeaserCaption>SR to T250</TeaserCaption>
        <p className="mt-2 text-lg font-semibold leading-tight tracking-tight text-foreground">
          {headline}
        </p>
        <p className="mt-0.5 numeric text-sm font-semibold text-foreground">
          {formatSr(SAMPLE.gapSr)}
          <span className="ml-2 font-sans text-xs font-medium text-muted">
            SR to cutoff
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">
          Your SR vs the live cutoff. You {formatDelta(SAMPLE.yourRatePerDay)}/day,
          cutoff {formatDelta(SAMPLE.cutoffRatePerDay)}/day.
        </p>
      </div>

      <SrToT250RaceChart
        you={you}
        cutoff={cutoff}
        now={now}
        yourRatePerDay={SAMPLE.yourRatePerDay}
        cutoffRatePerDay={SAMPLE.cutoffRatePerDay}
        crossMs={crossMs}
        crossSr={crossSr}
        calloutLabel={calloutLabel}
        willCatch={willCatch}
        a11yLabel={a11yLabel}
        height={200}
      />

      <p className="px-4 pb-4 pt-2 text-xs text-muted">
        <span className="sr-only">Preview data. </span>
        {insight}
      </p>
    </ProTeaserCard>
  );
}
