import type { ReactNode } from "react";

/**
 * Public `/pro` "Pro features showcase" — a thin presentational shell (PREM-03).
 *
 * No feature knowledge, no registry, no data. Each Pro workstream drops its own
 * sibling `<ProFeatureCard>` in as a child; nothing here needs to change when
 * PREM-01 / PREM-11 add theirs.
 */
export function ProFeatureShowcase({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">
          What Pro looks like
        </h2>
        <p className="max-w-prose text-sm text-muted">
          Real features, sample data. This is what you get with an active
          subscription.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function ProFeatureCard({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted">{blurb}</p>
        </div>
        <span className="shrink-0 rounded-[4px] border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          Sample data
        </span>
      </div>
      {children}
    </div>
  );
}
