"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { formatDelta, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CutoffNumeral({
  sr,
  change24h,
  label = "cutoff SR",
  size = "hero",
}: {
  sr: number;
  change24h: number | null;
  label?: string;
  size?: "hero" | "panel";
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = formatSr(sr);
      return;
    }
    const controls = animate(0, sr, {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = formatSr(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [sr, reduce]);

  const deltaClass =
    change24h === null
      ? "text-muted"
      : change24h >= 0
        ? "text-accent"
        : "text-negative";

  return (
    <div>
      <p
        className={cn(
          "numeric font-medium tracking-tight text-accent",
          size === "hero"
            ? "text-6xl leading-none md:text-7xl lg:text-8xl"
            : "text-4xl leading-none",
        )}
      >
        <span ref={ref}>{formatSr(sr)}</span>
      </p>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className={cn("numeric mt-1 text-sm", deltaClass)}>
        {change24h === null ? "no 24h sample" : `${formatDelta(change24h)} 24h`}
      </p>
    </div>
  );
}
