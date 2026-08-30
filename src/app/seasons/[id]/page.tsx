import { CutoffChart } from "@/components/cutoff-chart";
import { MetricStrip } from "@/components/metric-strip";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import {
  getBoardMetrics,
  getCutoffSeries,
  getSeason,
  listSeasons,
} from "@/lib/data/queries";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const season = getSeason(id);
  return { title: season?.name ?? "Season" };
}

export default async function SeasonArchive({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const season = getSeason(id);
  if (!season) notFound();
  const seasons = listSeasons();
  const wz = getBoardMetrics("wz", season.id);
  const wzSeries = getCutoffSeries("wz", season.id);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} seasonId={season.id} />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
        <h1 className="text-xl font-semibold tracking-tight">{season.name}</h1>
        <p className="mt-2 text-sm text-muted">Frozen cutoff curves for both ranked modes.</p>

        <h2 className="mt-10 text-lg font-semibold">Warzone</h2>
        {wz ? <MetricStrip metrics={wz} /> : <p className="py-4">No snapshot for this season yet.</p>}
        <CutoffChart series={wzSeries} height={220} />
        <p className="mt-2 mb-8">
          <Link href={`/wz/s/${season.id}`} className="text-sm text-accent hover:underline">
            Warzone board
          </Link>
        </p>

        <h2 className="text-lg font-semibold">Multiplayer</h2>
        <p className="py-4 text-muted">elovate Multiplayer coming soon.</p>
      </main>
      <SiteFooter capturedAt={wz?.capturedAt} />
    </div>
  );
}
