"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatSr } from "@/lib/format";
import { MAX_MATCHES_PER_MODE } from "@/lib/history/types";
import { cn } from "@/lib/utils";
import { ProTeaserCard, TeaserCaption } from "./pro-feature-card";

/**
 * PREM-15 teaser — "Do I keep every season, or only the last 500?"
 *
 * Layout family: a hero count + a season strip where the picture is a mask —
 * seasons outside the free window are dimmed, recent seasons full accent. A
 * retention story, not an analytics chart. Labeled sample data; the cap comes
 * from `MAX_MATCHES_PER_MODE`.
 */

type Season = {
  id: string;
  label: string;
  matches: number;
  inFreeWindow: boolean;
};

const SAMPLE_SEASONS: Season[] = [
  { id: "s1", label: "S1", matches: 246, inFreeWindow: false },
  { id: "s2", label: "S2", matches: 472, inFreeWindow: false },
  { id: "s3", label: "S3", matches: 415, inFreeWindow: false },
  { id: "s4", label: "S4", matches: 638, inFreeWindow: false },
  { id: "s5", label: "S5", matches: 703, inFreeWindow: true },
  { id: "s6", label: "S6", matches: 373, inFreeWindow: true },
];

const EASE = [0.16, 1, 0.3, 1] as const;
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const barIn = {
  hidden: { scaleY: 0 },
  show: { scaleY: 1, transition: { duration: 0.45, ease: EASE } },
};

export function UnlimitedHistoryPreview({
  index,
  gated = false,
}: {
  index?: number;
  gated?: boolean;
}) {
  const reduce = useReducedMotion();
  const seasons = SAMPLE_SEASONS;
  const total = seasons.reduce((sum, s) => sum + s.matches, 0);
  const max = Math.max(...seasons.map((s) => s.matches));
  const firstKeptIndex = seasons.findIndex((s) => s.inFreeWindow);

  return (
    <ProTeaserCard index={index}>
      <TeaserCaption>Unlimited history</TeaserCaption>

      <div>
        <p className="text-lg font-semibold leading-tight tracking-tight text-foreground">
          Every season, not the last {MAX_MATCHES_PER_MODE}
        </p>
        <p className="mt-0.5 numeric text-2xl font-semibold leading-none text-accent accent-glow">
          {formatSr(total)}
          <span className="ml-2 font-sans text-xs font-medium text-muted">
            matches logged
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">
          Pro keeps the full climb. Free hides past {MAX_MATCHES_PER_MODE}.
        </p>
      </div>

      <div
        className={cn("relative pt-4", gated && "select-none blur-[6px]")}
        aria-hidden={gated}
      >
        <motion.div
          className="flex h-24 items-end gap-2"
          variants={reduce ? undefined : container}
          initial={reduce ? undefined : "hidden"}
          whileInView={reduce ? undefined : "show"}
          viewport={{ once: true, margin: "-40px" }}
        >
          {seasons.map((season) => (
            <motion.span
              key={season.id}
              className={cn(
                "flex-1 origin-bottom rounded-t-[3px]",
                season.inFreeWindow ? "bg-accent" : "bg-foreground/15",
              )}
              style={{ height: `${Math.round((season.matches / max) * 100)}%` }}
              variants={reduce ? undefined : barIn}
              role="img"
              aria-label={`Season ${season.label}, ${season.matches} matches, ${
                season.inFreeWindow ? "kept on Free" : "hidden on Free"
              }`}
            />
          ))}
        </motion.div>

        <div className="mt-1 flex gap-2">
          {seasons.map((season) => (
            <span
              key={season.id}
              className="numeric flex-1 text-center text-[10px] text-muted"
            >
              {season.label}
            </span>
          ))}
        </div>

        {firstKeptIndex > 0 ? (
          <span
            className="pointer-events-none absolute bottom-5 top-0 border-l border-dashed border-muted"
            style={{ left: `${(firstKeptIndex / seasons.length) * 100}%` }}
          >
            <span className="absolute left-1 top-0 whitespace-nowrap text-[10px] font-medium text-muted">
              Free: last {MAX_MATCHES_PER_MODE}
            </span>
          </span>
        ) : null}
      </div>

      <p className="text-xs text-muted">
        {formatSr(total)} matches. Free would keep {MAX_MATCHES_PER_MODE}.
      </p>
    </ProTeaserCard>
  );
}
