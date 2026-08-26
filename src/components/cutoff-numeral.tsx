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
  showChange = true,
}: {
  sr: number;
  change24h: number | null;
  label?: string;
  size?: "hero" | "panel";
  showChange?: boolean;
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
      type: "spring",
      stiffness: 80,
      damping: 22,
      mass: 1,
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
          "numeric font-semibold tracking-tight accent-glow text-accent",
          size === "hero"
            ? "text-6xl leading-none md:text-7xl lg:text-8xl"
            : "text-4xl leading-none",
        )}
      >
        <span ref={ref}>{formatSr(sr)}</span>
      </p>
      <p className="mt-3 text-sm text-muted">{label}</p>
      {showChange ? (
        <p className={cn("numeric mt-1 text-sm", deltaClass)}>
          {change24h === null ? "no 24h sample" : `${formatDelta(change24h)} 24h`}
        </p>
      ) : null}
    </div>
  );
}
