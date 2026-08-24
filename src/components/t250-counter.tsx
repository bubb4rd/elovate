"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/data/types";

const FLIP_MS = 160;

function padDigits(value: number, slots: number): string {
  return String(Math.max(0, Math.round(value))).padStart(slots, "0");
}

function FlipTile({ char, reduce }: { char: string; reduce: boolean }) {
  const [from, setFrom] = useState(char);
  const [to, setTo] = useState(char);
  const [flipping, setFlipping] = useState(false);
  const [dir, setDir] = useState<"down" | "up">("down");
  const fromRef = useRef(char);
  const toRef = useRef(char);
  const busy = useRef(false);
  const pending = useRef<string | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  const finishFlip = () => {
    const landed = toRef.current;
    fromRef.current = landed;
    setFrom(landed);
    setFlipping(false);
    const queued = pending.current;
    pending.current = null;
    if (queued != null && queued !== landed) {
      startFlip(queued);
    } else {
      busy.current = false;
    }
  };

  const startFlip = (next: string) => {
    const current = fromRef.current;
    if (next === current) {
      busy.current = false;
      setFlipping(false);
      return;
    }
    busy.current = true;
    toRef.current = next;
    setTo(next);
    setDir(next > current ? "down" : "up");
    setFlipping(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(finishFlip, FLIP_MS);
  };

  useLayoutEffect(() => {
    if (reduce) {
      window.clearTimeout(timer.current);
      fromRef.current = char;
      toRef.current = char;
      pending.current = null;
      busy.current = false;
      setFrom(char);
      setTo(char);
      setFlipping(false);
      return;
    }
    if (char === fromRef.current && !busy.current) return;
    if (busy.current) {
      pending.current = char;
      return;
    }
    startFlip(char);
  }, [char, reduce]);

  return (
    <span
      className="relative block h-[26px] w-[18px] shrink-0 overflow-hidden rounded-[6px] bg-black [perspective:90px] [transform-style:preserve-3d]"
      aria-hidden
    >
      <span className="absolute inset-x-0 top-0 z-0 h-1/2 overflow-hidden">
        <Glyph value={flipping ? to : from} />
      </span>
      <span className="absolute inset-x-0 bottom-0 z-0 h-1/2 overflow-hidden">
        <Glyph value={from} offset />
      </span>

      {flipping && dir === "down" ? (
        <>
          <motion.span
            className="absolute inset-x-0 top-0 z-20 h-1/2 origin-bottom overflow-hidden bg-[#141416] [backface-visibility:hidden]"
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -90 }}
            transition={{ duration: FLIP_MS / 2000, ease: [0.4, 0, 1, 1] }}
          >
            <Glyph value={from} />
          </motion.span>
          <motion.span
            className="absolute inset-x-0 bottom-0 z-10 h-1/2 origin-top overflow-hidden bg-[#070708] [backface-visibility:hidden]"
            initial={{ rotateX: 90 }}
            animate={{ rotateX: 0 }}
            transition={{
              duration: FLIP_MS / 2000,
              delay: FLIP_MS / 2000,
              ease: [0, 0, 0.2, 1],
            }}
          >
            <Glyph value={to} offset />
          </motion.span>
        </>
      ) : null}

      {flipping && dir === "up" ? (
        <>
          <motion.span
            className="absolute inset-x-0 bottom-0 z-20 h-1/2 origin-top overflow-hidden bg-[#070708] [backface-visibility:hidden]"
            initial={{ rotateX: 0 }}
            animate={{ rotateX: 90 }}
            transition={{ duration: FLIP_MS / 2000, ease: [0.4, 0, 1, 1] }}
          >
            <Glyph value={from} offset />
          </motion.span>
          <motion.span
            className="absolute inset-x-0 top-0 z-10 h-1/2 origin-bottom overflow-hidden bg-[#141416] [backface-visibility:hidden]"
            initial={{ rotateX: -90 }}
            animate={{ rotateX: 0 }}
            transition={{
              duration: FLIP_MS / 2000,
              delay: FLIP_MS / 2000,
              ease: [0, 0, 0.2, 1],
            }}
          >
            <Glyph value={to} />
          </motion.span>
        </>
      ) : null}
    </span>
  );
}

function Glyph({ value, offset = false }: { value: string; offset?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[26px] w-full items-center justify-center font-sans text-[13px] font-semibold leading-none tabular-nums text-white",
        offset && "-translate-y-1/2",
      )}
    >
      {value}
    </span>
  );
}

export function T250Counter({
  cutoffSr,
  mode,
}: {
  cutoffSr: number;
  mode: Mode;
}) {
  const reduce = useReducedMotion();
  const slots = Math.max(5, String(cutoffSr).length);
  const [value, setValue] = useState(0);
  const displayed = useRef(0);
  const formatted = formatSr(cutoffSr);
  const modeLabel = mode === "wz" ? "Warzone" : "Multiplayer";

  useLayoutEffect(() => {
    const from = displayed.current;
    if (reduce) {
      displayed.current = cutoffSr;
      setValue(cutoffSr);
      return;
    }
    if (from === cutoffSr) {
      setValue(cutoffSr);
      return;
    }

    let lastEmit = 0;
    const controls = animate(from, cutoffSr, {
      duration: Math.min(1.05, 0.4 + Math.abs(cutoffSr - from) / 14000),
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (next) => {
        const rounded = Math.round(next);
        displayed.current = rounded;
        const now = performance.now();
        if (rounded !== cutoffSr && now - lastEmit < 80) return;
        lastEmit = now;
        setValue(rounded);
      },
      onComplete: () => {
        displayed.current = cutoffSr;
        setValue(cutoffSr);
      },
    });

    return () => controls.stop();
  }, [cutoffSr, reduce]);

  const board = padDigits(value, slots);

  return (
    <div
      className="flex h-9 shrink-0 items-center gap-2.5 rounded-full bg-[#0a0a0b] py-1 pr-1.5 pl-3 ring-1 ring-[#4a4a50]"
      role="img"
      aria-label={`${modeLabel} T250 cutoff ${formatted} SR`}
    >
      <span className="text-[13px] font-semibold tracking-wide text-geebung-400">T250</span>
      <span className="flex items-center gap-[3px]" aria-hidden>
        {[...board].map((char, i) => (
          <FlipTile key={i} char={char} reduce={Boolean(reduce)} />
        ))}
      </span>
    </div>
  );
}
