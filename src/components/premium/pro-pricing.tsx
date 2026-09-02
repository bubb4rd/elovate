"use client";

import { Check, Lock } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type PlanId = "monthly" | "annual" | "season";

const PLANS: {
  id: PlanId;
  label: string;
  price: string;
  cadence: string;
  note?: string;
}[] = [
  { id: "monthly", label: "Monthly", price: "$5", cadence: "/ mo" },
  { id: "annual", label: "Annual", price: "$30", cadence: "/ yr", note: "Save 50%" },
  {
    id: "season",
    label: "Season pass",
    price: "$8",
    cadence: "one-time",
    note: "Covers this WZ season",
  },
];

const INCLUDED: { label: string; live?: boolean }[] = [
  { label: "Teammate breakdown — who actually earns you SR", live: true },
  { label: "Placement efficiency — elims vs. finishes" },
  { label: "Trend & goal projection — your date to T250" },
  { label: "SR-to-T250 personal tracker" },
  { label: "Unlimited match history, every season" },
  { label: "Pro-only profile themes" },
  { label: "Pro badge on your profile and board row" },
  { label: "elovate Desktop beta — skip the line" },
];

export function ProPricing() {
  const [plan, setPlan] = useState<PlanId>("annual");
  const active = PLANS.find((p) => p.id === plan)!;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Know exactly who to queue with, whether you&rsquo;re actually climbing,
        and when you&rsquo;ll hit Top 250 — built on the climb data elovate
        already tracks for you.
      </p>

      <div>
        <div className="inline-flex rounded-[8px] border border-border bg-surface p-1">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              aria-pressed={plan === p.id}
              className={cn(
                "rounded-[6px] px-3 py-1.5 text-xs font-medium tracking-wide transition-colors",
                plan === p.id
                  ? "bg-surface-elevated text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-end gap-2">
          <span className="numeric text-4xl font-semibold tracking-tight text-foreground">
            {active.price}
          </span>
          <span className="pb-1 text-sm text-muted">{active.cadence}</span>
          {active.note && (
            <span className="mb-1.5 ml-1 rounded-[4px] bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-accent">
              {active.note}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-[10px] border border-border bg-surface/50 p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Everything in Pro
        </p>
        <ul className="space-y-2.5">
          {INCLUDED.map((f) => (
            <li key={f.label} className="flex items-start gap-2.5 text-sm">
              <Check
                weight="bold"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  f.live ? "text-accent" : "text-muted",
                )}
              />
              <span className={f.live ? "text-foreground" : "text-muted"}>
                {f.label}
                {f.live && (
                  <span className="ml-2 rounded-[4px] border border-accent/30 px-1 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-accent">
                    Live
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-3",
            "bg-accent text-sm font-semibold tracking-wide text-accent-fg",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Lock weight="bold" className="size-4" />
          Get elovate Pro
        </button>
        <p className="text-center text-xs text-muted">
          Checkout opens after the September launch.
        </p>
      </div>
    </div>
  );
}
