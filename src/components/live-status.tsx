"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { zIndex } from "@/lib/z-index";
import { cn } from "@/lib/utils";

export type BoardFreshnessStatus = "live" | "frozen";

function remainingMs(nextUpdateAt: string): number {
  return Date.parse(nextUpdateAt) - Date.now();
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LiveStatus({
  nextUpdateAt,
  status = "live",
}: {
  nextUpdateAt: string;
  status?: BoardFreshnessStatus;
}) {
  const router = useRouter();
  const refreshedFor = useRef<string | null>(null);
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const frozen = status === "frozen";

  useEffect(() => {
    if (frozen) return;

    const tick = () => {
      const left = remainingMs(nextUpdateAt);
      setMsLeft(left);
      if (left > 0) {
        setUpdating(false);
        return;
      }
      setUpdating(true);
      if (refreshedFor.current === nextUpdateAt) return;
      refreshedFor.current = nextUpdateAt;
      router.refresh();
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [frozen, nextUpdateAt, router]);

  const expired = !frozen && msLeft !== null && msLeft <= 0;
  const label = frozen
    ? "Standings frozen until ranked resumes"
    : msLeft === null
      ? "Next update in --:--"
      : expired || updating
        ? "Updating…"
        : `Next update in ${formatCountdown(msLeft)}`;

  const badge = frozen ? "Frozen" : "Live";

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em] focus-visible:outline-none focus-visible:ring-2",
          frozen
            ? "border-border bg-surface text-muted focus-visible:ring-border"
            : "border-accent/40 bg-accent/10 text-accent focus-visible:ring-accent",
        )}
        aria-label={`${badge}. ${label}`}
      >
        <span
          className={cn("live-dot", frozen && "live-dot-frozen")}
          aria-hidden
        />
        {badge}
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full left-0 mt-1.5 whitespace-nowrap rounded-[6px] border border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium tracking-normal opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          expired ? "text-foreground" : "text-muted",
        )}
        style={{ zIndex: zIndex.overlay }}
      >
        <span className={cn(!frozen && "numeric")} aria-live="polite">
          {label}
        </span>
      </span>
    </span>
  );
}
