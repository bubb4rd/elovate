"use client";

import { animate, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";

function snap(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function TickerNumeral({
  value,
  skip = false,
  format = formatSr,
  step = 1,
  className,
}: {
  value: number;
  skip?: boolean;
  format?: (value: number) => string;
  step?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const displayed = useRef(value);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const from = displayed.current;
    if (skip || reduce || from === value) {
      displayed.current = value;
      node.textContent = format(value);
      return;
    }

    const controls = animate(from, value, {
      duration: Math.min(0.8, 0.28 + Math.abs(value - from) / 1400),
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (next) => {
        displayed.current = snap(next, step);
        node.textContent = format(displayed.current);
      },
    });

    return () => controls.stop();
  }, [format, reduce, skip, step, value]);

  return (
    <span ref={ref} className={cn("numeric", className)}>
      {format(displayed.current)}
    </span>
  );
}
