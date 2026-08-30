"use client";

import { MapPin } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { formatChipTime } from "@/lib/format";
import {
  detectLocalTimeZone,
  readTimeZoneCookie,
  UTC_TIME_ZONE,
  writeTimeZoneCookie,
} from "@/lib/time-preference";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

const ease = [0.16, 1, 0.3, 1] as const;

export function SnapshotTimeChip({ iso }: { iso: string }) {
  const reduce = useReducedMotion();
  const [timeZone, setTimeZone] = useState(UTC_TIME_ZONE);
  const [ready, setReady] = useState(false);
  const local = timeZone !== UTC_TIME_ZONE;
  const parts = formatChipTime(iso, timeZone);
  const pinLabel = local ? "Use UTC" : "Pin local time";
  const motionOn = ready && !reduce;

  useEffect(() => {
    const stored = readTimeZoneCookie();
    if (stored && stored !== UTC_TIME_ZONE) setTimeZone(stored);
    setReady(true);
  }, []);

  function toggleLocal() {
    if (local) {
      writeTimeZoneCookie(UTC_TIME_ZONE);
      setTimeZone(UTC_TIME_ZONE);
      return;
    }
    const next = detectLocalTimeZone();
    writeTimeZoneCookie(next);
    setTimeZone(next);
  }

  return (
    <motion.div
      className={cn(
        "group relative inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1",
        "transition-[border-color,box-shadow,background-color] duration-200",
        "hover:border-accent/45 hover:bg-surface-elevated hover:shadow-[0_0_18px_color-mix(in_oklab,var(--accent)_16%,transparent)]",
      )}
      whileHover={motionOn ? { y: -1 } : undefined}
      transition={{ duration: 0.2, ease }}
    >
      <time
        dateTime={iso}
        className="numeric flex items-baseline gap-1.5 text-[11px] font-medium tracking-wide text-foreground"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${timeZone}-date`}
            className="text-muted"
            initial={motionOn ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOn ? { opacity: 0, y: -4 } : undefined}
            transition={{ duration: 0.18, ease }}
          >
            {parts.date}
          </motion.span>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${timeZone}-time`}
            className="text-sm font-semibold tracking-tight"
            initial={motionOn ? { opacity: 0, y: 5 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOn ? { opacity: 0, y: -5 } : undefined}
            transition={{ duration: 0.2, ease }}
          >
            {parts.time}
          </motion.span>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${timeZone}-zone`}
            className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase"
            initial={motionOn ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={motionOn ? { opacity: 0 } : undefined}
            transition={{ duration: 0.16, ease }}
          >
            {parts.zone}
          </motion.span>
        </AnimatePresence>
      </time>
      <span className="group/pin relative inline-flex">
        <motion.button
          type="button"
          aria-label={pinLabel}
          aria-pressed={local}
          title={pinLabel}
          onClick={toggleLocal}
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-muted",
            "transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            local && "text-accent",
          )}
          whileHover={motionOn ? { scale: 1.12 } : undefined}
          whileTap={motionOn ? { scale: 0.9 } : undefined}
          transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
        >
          <motion.span
            className="inline-flex"
            animate={
              motionOn
                ? { y: local ? -1 : 0, scale: local ? 1.08 : 1 }
                : { y: 0, scale: 1 }
            }
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
          >
            <MapPin
              weight={local ? "fill" : "bold"}
              className="size-3.5"
            />
          </motion.span>
        </motion.button>
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium tracking-normal text-muted opacity-0 shadow-sm transition-opacity duration-150",
            "group-hover/pin:opacity-100 group-focus-within/pin:opacity-100",
          )}
          style={{ zIndex: zIndex.overlay }}
        >
          {local ? "Using local time" : "Use local time"}
        </span>
      </span>
    </motion.div>
  );
}
