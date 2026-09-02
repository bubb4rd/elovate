"use client";

import { Check, Crown, Lock, Minus } from "@phosphor-icons/react";
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

/** A cell value: `true` = included, `false` = not included, string = qualified. */
type Cell = boolean | string;

const ROWS: { label: string; free: Cell; pro: Cell; live?: boolean }[] = [
  { label: "Live Top 250 board & cutoff tracker", free: true, pro: true },
  { label: "SR calculator", free: true, pro: true },
  { label: "Public profile, reputation, friends", free: true, pro: true },
  { label: "Climb session tracking", free: "This session", pro: "All sessions" },
  { label: "Match history", free: "500 · monthly", pro: "Unlimited" },
  { label: "Teammate breakdown", free: false, pro: true, live: true },
  { label: "Placement efficiency", free: false, pro: true },
  { label: "Trend & goal projection", free: false, pro: true },
  { label: "SR-to-T250 personal tracker", free: false, pro: true },
  { label: "Profile themes", free: "10", pro: "+ Pro-only" },
  { label: "Pro badge", free: false, pro: true },
  { label: "elovate Desktop beta", free: "Waitlist", pro: "Priority" },
];

function CellValue({ value, pro }: { value: Cell; pro?: boolean }) {
  if (value === true) {
    return (
      <Check
        weight="bold"
        className={cn("mx-auto size-4", pro ? "text-accent" : "text-foreground")}
        aria-label="Included"
      />
    );
  }
  if (value === false) {
    return (
      <Minus className="mx-auto size-4 text-muted/50" aria-label="Not included" />
    );
  }
  return (
    <span
      className={cn(
        "text-xs leading-tight",
        pro ? "text-foreground" : "text-muted",
      )}
    >
      {value}
    </span>
  );
}

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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Compare plans
              </th>
              <th className="w-28 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Free
              </th>
              <th className="w-32 rounded-t-[8px] bg-accent/10 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                <span className="inline-flex items-center gap-1">
                  <Crown weight="fill" className="size-3.5" />
                  Pro
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3 text-sm text-foreground">
                  {row.label}
                  {row.live && (
                    <span className="ml-2 rounded-[4px] border border-accent/30 px-1 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-accent">
                      Live
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center align-middle">
                  <CellValue value={row.free} />
                </td>
                <td
                  className={cn(
                    "bg-accent/10 px-3 py-2.5 text-center align-middle",
                    i === ROWS.length - 1 && "rounded-b-[8px]",
                  )}
                >
                  <CellValue value={row.pro} pro />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
