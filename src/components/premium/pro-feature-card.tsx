"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Shared chrome for a `/pro` feature teaser: a quiet 6px cell (`--border`, no
 * accent stroke) that fades/rises in the first time it scrolls into view,
 * staggered by grid `index`. Skipped under `prefers-reduced-motion`.
 *
 * `bleed` drops the inner padding so a chart object can run to the edges; the
 * default keeps a padded column for list / bar tiles. Each tile owns its own
 * layout family inside.
 */
export function ProTeaserCard({
  children,
  index = 0,
  bleed = false,
}: {
  children: ReactNode;
  index?: number;
  bleed?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.06 }}
      className={cn(
        "flex flex-col overflow-hidden rounded-[6px] border border-border bg-surface-elevated",
        !bleed && "gap-3 p-4 sm:p-5",
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * The tile's feature name, rendered as a quiet caption with a `preview` marker
 * (the tiles carry labeled sample data, not the viewer's own).
 */
export function TeaserCaption({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-medium text-muted">
      {children}
      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted/70">
        preview
      </span>
    </p>
  );
}
