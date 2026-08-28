"use client";

import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

export function MatchSubmitReceipt({
  status,
  onNewMatch,
}: {
  status: "success" | "error";
  onNewMatch: () => void;
}) {
  const reduce = useReducedMotion();
  const ok = status === "success";
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.7 };

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={ok ? "Match submitted" : "Match save failed"}
      className="rounded-[6px] border border-border bg-surface px-3.5 py-4"
    >
      <div className="flex items-start gap-3">
        <motion.span
          initial={reduce ? false : { opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background"
        >
          {ok ? (
            <CheckCircle weight="fill" className="size-5 text-accent" aria-hidden />
          ) : (
            <WarningCircle weight="fill" className="size-5 text-negative" aria-hidden />
          )}
        </motion.span>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 flex-1"
        >
          <p className="text-sm font-medium text-foreground">
            {ok ? "Match submitted" : "Couldn’t submit"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {ok
              ? "Logged to your climb history."
              : "The match didn’t save. You can try again on the next game."}
          </p>
          <Button type="button" size="sm" className="mt-3" onClick={onNewMatch}>
            New match
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
