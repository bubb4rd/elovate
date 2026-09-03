"use client";

import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { useCartesianScale } from "recharts";

/**
 * A hit callout for a teaser chart: a filled dot on a data point, a short leader
 * line, and a floating `.numeric` label portalled above the plot so it never
 * clips at small sizes. Retargeted from `LiveCutoffAnnotation` in
 * `src/components/cutoff-chart.tsx` — same leader weight, dot, and right-aligned
 * float against the plot edge.
 *
 * Rendered as a child of a recharts cartesian chart so `useCartesianScale` can
 * resolve the point.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function ChartHitAnnotation({
  x,
  y,
  label,
  portalNode,
  delay = 0,
  tone = "accent",
}: {
  /** Data-space x (ms) and y (SR) of the point to mark. */
  x: number;
  y: number;
  /** Short label, e.g. "Sep 21" or "18d". Rendered in `.numeric`. */
  label: string;
  portalNode: HTMLElement | null;
  /** Seconds to wait so the callout lands after the lines finish drawing. */
  delay?: number;
  /** `muted` for a "won't happen" marker; `accent` for the hit. */
  tone?: "accent" | "muted";
}) {
  const reduce = useReducedMotion();
  const coords = useCartesianScale({ x, y });
  const fade = reduce ? { duration: 0 } : { duration: 0.5, ease: EASE, delay };

  if (
    coords == null ||
    !Number.isFinite(coords.x) ||
    !Number.isFinite(coords.y)
  ) {
    return null;
  }

  const stroke = tone === "accent" ? "var(--accent)" : "var(--muted)";
  const labelTop = Math.max(4, coords.y - 58);
  const labelLeft = coords.x;
  const lineEndY = labelTop + 38;

  return (
    <>
      <motion.g
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={fade}
      >
        <line
          x1={coords.x}
          y1={coords.y}
          x2={labelLeft - 22}
          y2={lineEndY}
          stroke={stroke}
          strokeWidth={1.25}
          strokeOpacity={0.7}
        />
        <circle
          cx={coords.x}
          cy={coords.y}
          r={4.5}
          fill={stroke}
          stroke="var(--background)"
          strokeWidth={2}
        />
      </motion.g>
      {portalNode
        ? createPortal(
            <motion.div
              className="pointer-events-none absolute pr-2 text-right"
              style={{ top: labelTop, right: `calc(100% - ${labelLeft}px)` }}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={fade}
            >
              <p
                className={
                  tone === "accent"
                    ? "numeric accent-glow text-2xl font-semibold leading-none tracking-tight text-accent"
                    : "numeric text-xl font-semibold leading-none tracking-tight text-muted"
                }
              >
                {label}
              </p>
            </motion.div>,
            portalNode,
          )
        : null}
    </>
  );
}
