"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProTeaserCard, TeaserCaption } from "./pro-feature-card";

/**
 * PREM-02 teaser — "Are finishes carrying me, or elims? What did caps eat?"
 *
 * Layout family: a hero read + one composition bar + a cap-loss line (the
 * `HeadingMetrics` rhythm — one primary, one secondary). Not a placement-bucket
 * table; that is the Pro view. Labeled sample data.
 */

type Read = "elims" | "placement" | "caps";

const SAMPLE = {
  placementShare: 0.62,
  elimShare: 0.38,
  capLossSr: 420,
  netSr: 1180,
};

/** One helper, not hardcoded copy in the tile. */
function deriveRead(
  placementShare: number,
  elimShare: number,
  capLossSr: number,
  netSr: number,
): Read {
  if (netSr > 0 && capLossSr / netSr > 0.5) return "caps";
  // Placement dominates SR in Warzone, so a third-plus from elims is the story.
  if (elimShare >= 0.33) return "elims";
  return "placement";
}

const HEADLINE: Record<Read, string> = {
  elims: "Elims are carrying you",
  placement: "You need top-5 finishes",
  caps: "Caps are costing you",
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function PlacementEfficiencyPreview({
  index,
  gated = false,
}: {
  index?: number;
  gated?: boolean;
}) {
  const reduce = useReducedMotion();
  const { placementShare, elimShare, capLossSr, netSr } = SAMPLE;
  const read = deriveRead(placementShare, elimShare, capLossSr, netSr);

  const placementPct = Math.round(placementShare * 100);
  const elimPct = Math.round(elimShare * 100);
  const elimsLead = read === "elims";
  const capsLead = read === "caps";

  const insight = `Elims are ${elimPct}% of SR. Caps left ${formatSr(capLossSr)} on the table.`;

  return (
    <ProTeaserCard index={index}>
      <TeaserCaption>Placement efficiency</TeaserCaption>

      <div>
        {capsLead ? (
          <p className="numeric text-2xl font-semibold leading-none text-negative">
            {formatSr(capLossSr)}
            <span className="ml-2 font-sans text-xs font-medium text-muted">
              SR lost to caps
            </span>
          </p>
        ) : (
          <p className="text-lg font-semibold leading-tight tracking-tight text-foreground">
            {HEADLINE[read]}
          </p>
        )}
        <p className="mt-1 text-xs text-muted">Placement SR vs elim SR, plus cap loss.</p>
      </div>

      <div
        className={cn("space-y-2", gated && "select-none blur-[6px]")}
        aria-hidden={gated}
      >
        <div className="flex items-baseline justify-between text-xs">
          <span className={cn("numeric font-medium", elimsLead ? "text-muted" : "text-foreground")}>
            {placementPct}
            <span className="text-muted"> placement</span>
          </span>
          <span className={cn("numeric font-medium", elimsLead ? "text-accent" : "text-muted")}>
            {elimPct}
            <span className="text-muted"> elims</span>
          </span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-[6px] bg-foreground/[0.12] ring-1 ring-inset ring-foreground/14">
          <motion.span
            className={cn(
              "absolute inset-y-0 left-0 origin-left",
              elimsLead ? "bg-foreground/25" : "bg-accent",
            )}
            style={{ width: `${placementShare * 100}%` }}
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={reduce ? undefined : { scaleX: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          />
          <motion.span
            className={cn(
              "absolute inset-y-0 right-0 origin-right",
              elimsLead ? "bg-accent" : "bg-foreground/25",
            )}
            style={{ width: `${elimShare * 100}%` }}
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={reduce ? undefined : { scaleX: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
          />
        </div>
      </div>

      <p
        className={cn(
          "numeric text-xs",
          capsLead ? "text-muted" : "text-negative",
        )}
      >
        {formatSr(capLossSr)} SR left on the table from caps
      </p>

      <p className="text-xs text-muted">{insight}</p>
    </ProTeaserCard>
  );
}
