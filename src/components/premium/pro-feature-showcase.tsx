import { PlacementEfficiencyPreview } from "./placement-efficiency-preview";
import { SrToT250Preview } from "./sr-to-t250-preview";
import { TeammateBreakdownPreview } from "./teammate-breakdown-preview";
import { TrendProjectionDemoCard } from "./trend-demo-card";
import { UnlimitedHistoryPreview } from "./unlimited-history-preview";

/**
 * Public `/pro` "Pro features" section — a headline over a grid of teaser tiles.
 *
 * Each tile is a real mini of a Pro feature with labeled sample data, one
 * insight line, and a different layout family (ranked list / composition bar /
 * season strip / object charts). No accent card chrome; the section follows the
 * viewer's profile theme like the rest of `/pro`.
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
