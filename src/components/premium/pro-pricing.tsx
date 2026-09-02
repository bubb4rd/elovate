"use client";

import { CheckCircle, Crown, Lock } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { registerHref } from "@/lib/auth/paths";
import { cn } from "@/lib/utils";

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

const PRO_FEATURES: { label: string; live?: boolean }[] = [
  { label: "Teammate breakdown", live: true },
  { label: "Placement efficiency" },
  { label: "Trend & goal projection" },
  { label: "SR-to-T250 personal tracker" },
  { label: "Unlimited history, every season" },
  { label: "Pro-only profile themes + Pro badge" },
  { label: "elovate Desktop beta — priority access" },
];

function Feature({ children, live }: { children: React.ReactNode; live?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <CheckCircle
        weight="fill"
        className={cn("mt-0.5 size-4 shrink-0", live ? "text-accent" : "text-muted")}
      />
      <span className="text-foreground">
        {children}
        {live && (
          <span className="ml-2 rounded-[4px] border border-accent/30 px-1 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-accent">
            Live
          </span>
        )}
      </span>
    </li>
  );
}

export function ProPricing({ signedIn }: { signedIn: boolean }) {
  const [plan, setPlan] = useState<PlanId>("annual");
  const active = PLANS.find((p) => p.id === plan)!;

  return (
    <div className="space-y-8">
      <p className="max-w-prose text-md text-muted">
        Select the features that match your playstyle and reach your peak.
      </p>

      <div className="flex flex-wrap items-center gap-1.5 rounded-[8px] border border-border bg-surface p-1">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlan(p.id)}
            aria-pressed={plan === p.id}
            className={cn(
              "flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium tracking-wide transition-colors",
              plan === p.id
                ? "bg-surface-elevated text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {p.label}
            {p.chip && (
              <span className="rounded-[4px] bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                {p.chip}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-[12px] border border-border bg-surface/40 p-5">
          <p className="text-sm font-semibold tracking-wide text-muted">Free</p>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="numeric text-3xl font-semibold tracking-tight text-foreground">
              $0
            </span>
            <span className="pb-1 text-xs text-muted">forever</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Everything you need to track a climb.
          </p>
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
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-[12px] border border-accent/40 bg-accent/[0.04] p-5">
          <span className="absolute -top-2.5 right-4 rounded-[4px] bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-fg">
            Recommended
          </span>
          <p className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-accent">
            <Crown weight="fill" className="size-4" />
            Pro
          </p>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="numeric text-3xl font-semibold tracking-tight text-foreground">
              {active.price}
            </span>
            <span className="pb-1 text-xs text-muted">{active.cadence}</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Everything in Free, plus the analytics.
          </p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <Feature key={f.label} live={f.live}>
                {f.label}
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
          <p className="mt-2 text-center text-[11px] text-muted">
            Checkout opens after the September launch.
          </p>
        </div>
      </div>
    </div>
  );
}
