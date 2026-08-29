"use client";

import Link from "next/link";
import { LiveStatus, type BoardFreshnessStatus } from "@/components/live-status";
import { TickerNumeral } from "@/components/ticker-numeral";
import { cn } from "@/lib/utils";

export function NavCutoff({
  cutoffSr,
  nextUpdateAt,
  boardStatus = "live",
  align = "end",
  href,
  className,
}: {
  cutoffSr: number;
  nextUpdateAt?: string;
  boardStatus?: BoardFreshnessStatus;
  align?: "start" | "end";
  href?: string;
  className?: string;
}) {
  const body = (
    <>
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
    </>
  );

  const classes = cn(
    "flex flex-col leading-none",
    align === "start" ? "items-start" : "items-end",
    href &&
      "rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="Home, live cutoff">
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}
