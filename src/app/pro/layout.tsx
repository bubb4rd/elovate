import { Crown } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { ProNav } from "@/components/premium/pro-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getViewerProfile } from "@/lib/auth/viewer";
import { getBoardCutoff } from "@/lib/data/board-source";
import { liveWzHistoryFor } from "@/lib/data/live-history";
import {
  getActiveSeason,
  getBoardMetrics,
  getLiveWzBoard,
  listSeasons,
} from "@/lib/data/queries";
import { IRIDESCENT_SR } from "@/lib/ranked";

export const metadata: Metadata = {
  title: "Pro",
};

export default async function ProLayout({ children }: LayoutProps<"/pro">) {
  // `/pro` is the public pricing page; `/pro/*` feature pages hard-gate via
  // requireProPage(). This cache()d call only gates the live board work + the
  // feature tab bar (which non-subscribers have nowhere to go in).
  const viewer = await getViewerProfile();
  const ready = viewer != null && viewer.onboardingComplete;

  const season = getActiveSeason();
  const seasons = listSeasons();

  let cutoffSr = IRIDESCENT_SR;
  let live: Awaited<ReturnType<typeof getLiveWzBoard>> | null = null;

  if (ready) {
    const seedMetrics = getBoardMetrics("wz", season.id);
    live = await getLiveWzBoard();
    const history = await liveWzHistoryFor(live, season.id);
    const { metrics } = await getBoardCutoff({
      mode: "wz",
      seasonId: season.id,
      live,
      seed: seedMetrics,
      history,
    });
    cutoffSr = metrics?.cutoffSr ?? IRIDESCENT_SR;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav
        seasons={seasons}
        loginNext="/pro"
        cutoffSr={cutoffSr}
        nextUpdateAt={live?.nextUpdateAt}
      />
      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 py-10">
        <header className="mb-6 flex items-center gap-2.5">
          <Crown
            weight="fill"
            className={viewer?.isPro ? "size-5 text-accent" : "size-5 text-muted"}
            aria-hidden
          />
          <h1 className="text-lg font-semibold tracking-tight">elovate Pro</h1>
        </header>
        {viewer?.isPro && <ProNav />}
        <div className="mt-8 min-w-0">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
