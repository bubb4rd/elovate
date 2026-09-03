import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  PlacementEfficiencyPreview,
  SrToT250Preview,
  TeammateBreakdownPreview,
  UnlimitedHistoryPreview,
} from "./pro-feature-previews";
import { TrendProjectionDemoCard } from "./trend-demo-card";

/**
 * Public `/pro` "Pro features" section — a centered eyebrow + headline over an
 * asymmetric card grid (three across, then two wide), each card carrying a real
 * feature blurb and a sample-data visual.
 *
 * PREM-03 owns the shell and its own Trend card; the other launch features are
 * decorative previews from `pro-feature-previews.tsx` until each ships its own
 * demo. Cards use only elovate tokens, so the section follows the viewer's
 * profile theme like the rest of `/pro`.
 */
export function ProFeatureShowcase() {
  return (
    <section className="space-y-8">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <span className="inline-block rounded-full border border-border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Pro features
        </span>
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Understand your climb, project your goal
        </h2>
        <p className="text-balance text-sm text-muted">
          Real features, sample data &mdash; this is what an active subscription
          unlocks.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <TeammateBreakdownPreview />
          <TrendProjectionDemoCard />
          <PlacementEfficiencyPreview />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SrToT250Preview />
          <UnlimitedHistoryPreview />
        </div>
      </div>
    </section>
  );
}

/**
 * One showcase card: an eyebrow row (title + "Sample" tag), a one-line blurb,
 * and a visual slot. `layout="split"` puts the visual beside the copy for the
 * wide bottom-row cards; the default stacks it underneath.
 */
export function ProFeatureCard({
  title,
  blurb,
  children,
  layout = "stack",
}: {
  title: string;
  blurb: string;
  children: ReactNode;
  layout?: "stack" | "split";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[14px] border border-border bg-surface/40 p-5",
        layout === "split" && "sm:flex-row sm:items-center sm:gap-6",
      )}
    >
      <div className={cn("space-y-1", layout === "split" && "sm:flex-1")}>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <span className="rounded-[4px] border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
            Sample
          </span>
        </div>
        <p className="text-sm text-muted">{blurb}</p>
      </div>
      <div
        className={cn(
          layout === "split" && "flex justify-center sm:flex-1",
        )}
      >
        {children}
      </div>
    </div>
  );
}
