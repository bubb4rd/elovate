"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One `/pro` showcase card: a title + one-line blurb and a visual slot.
 * `layout="split"` sets the visual beside the copy for the wide bottom-row
 * cards; the default stacks it underneath.
 *
 * Fades/rises in the first time it scrolls into view (staggered by `index`) and
 * lifts its border + surface on hover. All of it is skipped under
 * `prefers-reduced-motion`.
 */
export function ProFeatureCard({
  title,
  blurb,
  children,
  layout = "stack",
  index = 0,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
  layout?: "stack" | "split";
  index?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.06 }}
      className={cn(
        "flex flex-col gap-4 rounded-[14px] border border-border bg-surface/40 p-5",
        "transition-colors duration-300 hover:border-accent/40 hover:bg-surface/70",
        layout === "split" && "sm:flex-row sm:items-center sm:gap-6",
      )}
    >
      <div className={cn("space-y-1", layout === "split" && "sm:flex-1")}>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted">{blurb}</p>
      </div>
      <div
        className={cn(
          layout === "split"
            ? "flex justify-center sm:flex-1"
            : "space-y-3",
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}
