"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { CutoffChart } from "@/components/cutoff-chart";
import { formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CutoffPoint } from "@/lib/data/types";

const ease = [0.16, 1, 0.3, 1] as const;

export function HomeCutoffObject({
  series,
  change24h,
}: {
  series: CutoffPoint[];
  change24h: number | null;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (change24h === null) {
      node.textContent = "—";
      return;
    }
    if (reduce) {
      node.textContent = formatDelta(change24h);
      return;
    }
    const controls = animate(0, change24h, {
      type: "spring",
      stiffness: 80,
      damping: 22,
      mass: 1,
      onUpdate: (v) => {
        node.textContent = formatDelta(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [change24h, reduce]);

  const deltaClass =
    change24h === null
      ? "text-muted"
      : change24h >= 0
        ? "accent-glow text-accent"
        : "text-negative";

  return (
    <div className="mt-8">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease }}
      >
        <p
          className={cn(
            "numeric text-4xl font-semibold tracking-tight leading-none md:text-5xl",
            deltaClass,
          )}
        >
          <span ref={ref}>{change24h === null ? "—" : formatDelta(change24h)}</span>
          <span className="ml-2 text-lg font-medium tracking-normal text-muted md:text-xl">
            24h
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">cutoff gain</p>
      </motion.div>
      <motion.div
        className="mt-4"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.28, ease }}
      >
        <CutoffChart series={series} height={300} showRank1={false} object />
      </motion.div>
    </div>
  );
}
