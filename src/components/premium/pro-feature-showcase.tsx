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
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Understand your climb, project your goal
        </h2>
        <p className="text-balance text-sm text-muted">
          The real Pro features shown with sample data. An active subscription
          unlocks them on your own climb.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <TeammateBreakdownPreview index={0} />
          <UnlimitedHistoryPreview index={1} />
          <PlacementEfficiencyPreview index={2} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SrToT250Preview index={3} />
          <TrendProjectionDemoCard index={4} />
        </div>
      </div>
    </section>
  );
}
