"use client";

import { Star, Ticket } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TickerNumeral } from "@/components/ticker-numeral";
import { formatDelta } from "@/lib/format";
import { WZ_PLACEMENT_MAX } from "@/lib/ranked";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

export function SrTicket({
  open,
  placementSr,
  fee,
  yourSr,
  squadSr,
  elimSr,
  net,
  capped = false,
}: {
  open: boolean;
  placementSr: number;
  fee: number;
  yourSr: number;
  squadSr: number;
  elimSr: number;
  net: number;
  capped?: boolean;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.8 };
  const placementMaxed = placementSr >= WZ_PLACEMENT_MAX;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:inset-x-auto md:right-4 md:bottom-4 md:w-[min(20rem,calc(100vw-2rem))]"
      style={{ zIndex: zIndex.overlay }}
    >
      <AnimatePresence>
        {open ? (
          <motion.aside
            role="status"
            aria-live="polite"
            aria-label="SR ticket"
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={spring}
            className="relative overflow-hidden rounded-[6px] border border-white/12 bg-[#121214] text-zinc-100 shadow-[0_18px_50px_rgb(0_0_0/0.45)]"
          >
            <GoldStarDef />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[radial-gradient(circle_at_8px_0,var(--background)_6px,transparent_6.5px)] bg-size-[16px_12px] bg-repeat-x"
            />
            <div className="relative px-4 pt-5 pb-3">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
                  <Ticket weight="fill" className="size-3.5 text-accent" />
                  SR ticket
                </p>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  <MaxStar label="Max" />
                  <span aria-hidden>=</span>
                  <span className="accent-glow bg-linear-to-r from-geebung-600 via-geebung-400 to-geebung-500 bg-clip-text text-transparent dark:from-geebung-200 dark:via-geebung-400 dark:to-geebung-300">
                    Max
                  </span>
                </p>
              </div>

              <motion.dl
                className="mt-3 space-y-2"
                initial={reduce ? false : "hidden"}
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: { staggerChildren: reduce ? 0 : 0.04, delayChildren: reduce ? 0 : 0.06 },
                  },
                }}
              >
                <TicketRow
                  label="Deployment fee"
                  value={-fee}
                  tone={fee > 0 ? "neg" : "muted"}
                  free={fee === 0}
                  reduce={reduce}
                />
                <TicketRow
                  label="Placement"
                  value={placementSr}
                  tone="plain"
                  reduce={reduce}
                  maxed={placementMaxed}
                  maxLabel="Max placement"
                />
                <TicketRow
                  label="Eliminations"
                  value={elimSr}
                  tone="plain"
                  reduce={reduce}
                  maxed={capped}
                  maxLabel="Max 150 combined"
                />
                <motion.div variants={reduce ? undefined : rowVariants} className="relative space-y-2 pl-2.5">
                  <span
                    aria-hidden
                    className="absolute top-0 bottom-0 left-0 w-px bg-white/15"
                  />
                  <TicketRow
                    label="Your eliminations"
                    value={yourSr}
                    tone="plain"
                    reduce={reduce}
                    nested
                  />
                  <TicketRow
                    label="Squad elims"
                    value={squadSr}
                    tone="plain"
                    reduce={reduce}
                    nested
                  />
                </motion.div>
                <motion.div
                  variants={rowVariants}
                  className="mt-1 flex items-end justify-between gap-3 border-t border-dashed border-white/15 pt-2.5"
                >
                  <dt className="text-xs font-medium text-zinc-300">Total</dt>
                  <dd
                    className={cn(
                      "numeric inline-flex items-baseline gap-1.5 text-2xl font-semibold leading-none tracking-tight",
                      net > 0 && "accent-glow text-accent",
                      net < 0 && "text-negative",
                      net === 0 && "text-zinc-400",
                    )}
                  >
                    <TickerNumeral value={net} format={formatDelta} />
                    <span className="text-sm font-medium tracking-normal text-zinc-400">
                      SR
                    </span>
                  </dd>
                </motion.div>
              </motion.dl>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } },
};

function GoldStarDef() {
  return (
    <svg aria-hidden className="absolute size-0 overflow-hidden">
      <defs>
        <linearGradient id="sr-ticket-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcf8c5" />
          <stop offset="45%" stopColor="#f2c81d" />
          <stop offset="100%" stopColor="#ca8d0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MaxStar({ label }: { label: string }) {
  return (
    <span className="accent-glow inline-flex items-center" title={label}>
      <Star
        weight="fill"
        aria-hidden
        className="size-3 [&_path]:fill-[url(#sr-ticket-gold)]"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function TicketRow({
  label,
  value,
  tone,
  free = false,
  maxed = false,
  maxLabel = "Max",
  nested = false,
  reduce,
}: {
  label: string;
  value: number;
  tone: "plain" | "neg" | "muted";
  free?: boolean;
  maxed?: boolean;
  maxLabel?: string;
  nested?: boolean;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      variants={nested || reduce ? undefined : rowVariants}
      className="flex items-baseline justify-between gap-3"
    >
      <dt className="flex min-w-0 items-center gap-1.5 text-[12px] text-zinc-400">
        <span>{label}</span>
        {maxed ? <MaxStar label={maxLabel} /> : null}
      </dt>
      <dd
        className={cn(
          "numeric shrink-0 text-sm leading-none",
          tone === "neg" && "text-[#ff7a7a]",
          tone === "muted" && "text-zinc-500",
          tone === "plain" && "text-zinc-100",
          maxed && "accent-glow text-accent",
        )}
      >
        {free ? "Free" : <TickerNumeral value={value} format={formatDelta} />}
      </dd>
    </motion.div>
  );
}
