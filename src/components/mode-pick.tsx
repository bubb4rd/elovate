import Link from "next/link";
import { formatDelta, formatSr } from "@/lib/format";
import type { BoardMetrics } from "@/lib/data/types";

export function ModePick({
  mp: _mp,
  wz,
}: {
  mp: BoardMetrics | null;
  wz: BoardMetrics | null;
}) {
  return (
    <section className="grid grid-cols-1 gap-0 border-t border-border md:grid-cols-2">
      <ModeCell href="/mp" title="Multiplayer" comingSoon />
      <ModeCell href="/wz" title="Warzone" metrics={wz} edge />
    </section>
  );
}

function ModeCell({
  href,
  title,
  metrics,
  edge,
  comingSoon,
}: {
  href: string;
  title: string;
  metrics?: BoardMetrics | null;
  edge?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block px-4 py-10 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:px-8 ${
        edge ? "md:border-l md:border-border" : ""
      }`}
    >
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {comingSoon ? (
        <p className="mt-4 text-muted">Coming soon.</p>
      ) : metrics ? (
        <p className="mt-4 numeric text-3xl font-semibold tracking-tight accent-glow text-accent">
          {formatSr(metrics.cutoffSr)}
        </p>
      ) : (
        <p className="mt-4 text-muted">No snapshot for this season yet.</p>
      )}
      <p className="mt-2 text-sm text-muted">
        {!comingSoon && metrics
          ? metrics.avgPerDay7d == null
            ? "avg / day (7d) pending"
            : `${formatDelta(Math.round(metrics.avgPerDay7d))} avg / day (7d)`
          : ""}
      </p>
    </Link>
  );
}
