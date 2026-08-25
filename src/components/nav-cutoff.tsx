"use client";

import { LiveStatus, type BoardFreshnessStatus } from "@/components/live-status";
import { TickerNumeral } from "@/components/ticker-numeral";

export function NavCutoff({
  cutoffSr,
  nextUpdateAt,
  boardStatus = "live",
}: {
  cutoffSr: number;
  nextUpdateAt?: string;
  boardStatus?: BoardFreshnessStatus;
}) {
  return (
    <div className="flex flex-col items-end leading-none">
      <TickerNumeral
        value={cutoffSr}
        className="accent-glow text-2xl font-semibold tracking-tight text-accent md:text-3xl"
      />
      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
        {nextUpdateAt ? (
          <LiveStatus nextUpdateAt={nextUpdateAt} status={boardStatus} />
        ) : null}
        <span>Cutoff</span>
      </div>
    </div>
  );
}
