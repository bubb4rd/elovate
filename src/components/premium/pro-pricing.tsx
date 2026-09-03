"use client";

import { Check, Crown, Lock } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { registerHref } from "@/lib/auth/paths";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type PlanId = "monthly" | "annual" | "season";

const PLANS: {
  id: PlanId;
  label: string;
  price: string;
  cadence: string;
  chip?: string;
}[] = [
  { id: "monthly", label: "Monthly", price: "$5", cadence: "/ mo" },
  { id: "annual", label: "Annual", price: "$48", cadence: "/ yr", chip: "Save 20%" },
  { id: "season", label: "Season pass", price: "$8", cadence: "one-time" },
];

const FREE_FEATURES = [
  "Live Top 250 board & cutoff tracker",
  "SR calculator",
  "Public profile, reputation, friends",
  "Current-session climb tracking",
  "Your 500 most recent matches",
  "Session share cards",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Teammate breakdown",
  "Placement efficiency",
  "Trend & goal projection",
  "SR-to-T250 personal tracker",
  "Unlimited history, every season",
  "Pro-only profile themes + Pro badge",
  "elovate Desktop Priority Access",
];

function Feature({
  children,
  pro,
}: {
  children: React.ReactNode;
  pro?: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5 text-md">
      <Check
        weight="bold"
        className={cn("mt-0.5 size-4 shrink-0", pro ? "text-accent" : "text-muted")}
      />
      <span className="text-foreground">{children}</span>
    </li>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function ProPricing({ signedIn }: { signedIn: boolean }) {
  const [plan, setPlan] = useState<PlanId>("annual");
  const active = PLANS.find((p) => p.id === plan)!;
  const reduce = useReducedMotion();

  return (
    <div className="space-y-8">
      <p className="max-w-prose text-md text-muted">
        Select the features that match your playstyle and reach your peak.
      </p>

      <div className="inline-flex w-max max-w-full flex-wrap items-center gap-1 rounded-[8px] border border-border bg-surface p-1">
        {PLANS.map((p) => {
          const isActive = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              aria-pressed={isActive}
              className={cn(
                "relative flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium tracking-wide transition-colors",
                isActive ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="plan-pill"
                  className="absolute inset-0 rounded-[6px] bg-surface-elevated"
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <span className="relative z-10">{p.label}</span>
              {p.chip && (
                <span className="relative z-10 rounded-[4px] bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  {p.chip}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2"
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        {/* Free */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col rounded-[12px] border border-border bg-surface/40 p-5"
        >
          <p className="text-lg font-semibold tracking-wide text-muted">Free</p>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="numeric text-4xl font-semibold tracking-tight text-foreground">
              $0
            </span>
            <span className="pb-1 text-xs text-muted">forever</span>
          </div>
          <ul className="mt-5 flex-1 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <Feature key={f}>{f}</Feature>
            ))}
          </ul>
          {signedIn ? (
            <div className="mt-6 rounded-[8px] border border-border px-4 py-2.5 text-center text-xs font-medium tracking-wide text-muted">
              Your current plan
            </div>
          ) : (
            <Link
              href={registerHref("/pro")}
              className="mt-6 rounded-[8px] border border-border px-4 py-2.5 text-center text-xs font-medium tracking-wide text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Create free account
            </Link>
          )}
        </motion.div>

        {/* Pro */}
        <motion.div
          variants={cardVariants}
          className="relative flex flex-col rounded-[12px] border border-accent/40 bg-accent/[0.04] p-5"
        >
          <span className="absolute -top-2.5 right-4 rounded-[4px] bg-accent px-2 py-0.5 text-md font-semibold uppercase tracking-[0.1em] text-accent-fg">
            Recommended
          </span>
          <p className="flex items-center gap-1.5 text-lg font-semibold tracking-wide text-accent">
            <Crown weight="fill" className="size-4" />
            Pro
          </p>
          <div className="mt-2 flex h-11 items-end gap-1.5 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={plan}
                className="flex items-end gap-1.5"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{ duration: reduce ? 0 : 0.26, ease: EASE }}
              >
                <span className="numeric text-4xl font-semibold tracking-tight text-foreground">
                  {active.price}
                </span>
                <span className="pb-1 text-xs text-muted">{active.cadence}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <ul className="mt-5 flex-1 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <Feature key={f} pro>
                {f}
              </Feature>
            ))}
          </ul>
          <button
            type="button"
            disabled
            className={cn(
              "mt-6 flex items-center justify-center gap-2 rounded-[8px] px-4 py-2.5",
              "bg-accent text-xs font-semibold tracking-wide text-accent-fg",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Lock weight="bold" className="size-3.5" />
            Get elovate Pro
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
