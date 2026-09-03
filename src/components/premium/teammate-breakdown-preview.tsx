"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { formatDelta } from "@/lib/format";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";
import { ProTeaserCard, TeaserCaption } from "./pro-feature-card";

/**
 * PREM-01 teaser — "Who should I queue with?"
 *
 * Layout family: a ranked `divide-y` list with diverging-from-zero net-SR bars.
 * The hero is the callout ("Queue with Bode"), not the feature name. Three rows
 * only — the full ranked table (win rate, SR/hour, placement, elim share) is the
 * Pro view. Labeled sample data.
 */

type Row = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  net: number;
  /** Positive-net rate, shown only on the best row. */
  posRate?: number;
  isSolo?: boolean;
};

const SAMPLE: {
  windowDays: number;
  rows: Row[];
  callout: { kind: "best" | "drop"; name: string; net: number };
} = {
  windowDays: 14,
  rows: [
    { id: "bode", displayName: "Bode", avatarUrl: null, net: 214, posRate: 0.64 },
    { id: "nova", displayName: "Nova", avatarUrl: null, net: 138 },
    { id: "solo", displayName: "solo queue", avatarUrl: null, net: -58, isSolo: true },
  ],
  callout: { kind: "best", name: "Bode", net: 214 },
};

// Positive nets get most of the track; zero sits where negatives still read.
const ZERO_PCT = 62;

const EASE = [0.16, 1, 0.3, 1] as const;
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const rowIn = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};
const barIn = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.5, ease: EASE } },
};

export function TeammateBreakdownPreview({
  index,
  gated = false,
}: {
  index?: number;
  gated?: boolean;
}) {
  const reduce = useReducedMotion();
  const { rows, callout, windowDays } = SAMPLE;
  const maxPos = Math.max(...rows.map((r) => Math.max(0, r.net)), 1);
  const scale = (100 - ZERO_PCT) / maxPos;

  const headline =
    callout.kind === "best" ? `Queue with ${callout.name}` : `Drop ${callout.name}`;
  const insight = `Best duo: ${callout.name} (${formatDelta(callout.net)} net). Solo is ${formatDelta(
    rows.find((r) => r.isSolo)?.net ?? 0,
  )}.`;

  return (
    <ProTeaserCard index={index}>
      <TeaserCaption>Teammate breakdown</TeaserCaption>

      <div>
        <p className="text-lg font-semibold leading-tight tracking-tight text-foreground">
          {headline}
        </p>
        <p className="mt-0.5 numeric text-sm font-semibold text-accent">
          {formatDelta(callout.net)} net
          <span className="ml-2 font-sans text-xs font-medium text-muted">
            last {windowDays} days
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">Net SR with each squad, last {windowDays} days.</p>
      </div>

      <motion.ul
        className={cn(
          "mt-1 divide-y divide-border",
          gated && "pointer-events-none select-none blur-[6px]",
        )}
        variants={reduce ? undefined : container}
        initial={reduce ? undefined : "hidden"}
        whileInView={reduce ? undefined : "show"}
        viewport={{ once: true, margin: "-40px" }}
        aria-hidden={gated}
      >
        {rows.map((row, i) => {
          const best = i === 0 && row.net > 0;
          const negative = row.net < 0;
          const width = Math.abs(row.net) * scale;
          return (
            <motion.li
              key={row.id}
              className="flex items-center gap-3 py-2.5"
              variants={reduce ? undefined : rowIn}
            >
              <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
                <Image
                  src={avatarOrDefault(row.avatarUrl)}
                  alt=""
                  width={24}
                  height={24}
                  className="size-full object-cover"
                />
              </span>
              <span className="w-20 shrink-0 truncate text-sm text-foreground">
                {row.displayName}
              </span>
              <span
                className="relative h-2 flex-1"
                role="img"
                aria-label={`${row.displayName}, ${formatDelta(row.net)} net SR`}
              >
                <span
                  className="absolute inset-y-0 w-px bg-border"
                  style={{ left: `${ZERO_PCT}%` }}
                />
                <motion.span
                  className={cn(
                    "absolute inset-y-0 rounded-[3px]",
                    negative
                      ? "origin-right bg-negative"
                      : best
                        ? "origin-left bg-accent"
                        : "origin-left bg-accent/55",
                  )}
                  style={
                    negative
                      ? { right: `${100 - ZERO_PCT}%`, width: `${width}%` }
                      : { left: `${ZERO_PCT}%`, width: `${width}%` }
                  }
                  variants={reduce ? undefined : barIn}
                />
              </span>
              <span
                className={cn(
                  "numeric w-12 shrink-0 text-right text-sm font-semibold",
                  negative ? "text-negative" : "text-accent",
                )}
              >
                {formatDelta(row.net)}
              </span>
              {best && row.posRate != null ? (
                <span className="hidden shrink-0 text-[11px] text-muted sm:inline">
                  {Math.round(row.posRate * 100)}% pos
                </span>
              ) : null}
            </motion.li>
          );
        })}
      </motion.ul>

      <p className="text-xs text-muted">{insight}</p>
    </ProTeaserCard>
  );
}
