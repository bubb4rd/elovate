import { CutoffChart } from "@/components/cutoff-chart";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getPlayerHistory, listSeasons } from "@/lib/data/queries";
import { formatDay, formatSr } from "@/lib/format";
import type { CutoffPoint } from "@/lib/data/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = getPlayerHistory(slug);
  return { title: data?.player.displayName ?? "Player" };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getPlayerHistory(slug);
  if (!data) notFound();
  const { player, appearances } = data;
  const seasons = listSeasons();
  const latest = appearances[appearances.length - 1];

  const series: CutoffPoint[] = appearances.map((a, i) => ({
    capturedAt: a.capturedAt,
    cutoffSr: a.sr,
    rank1Sr: a.sr,
    deltaCutoff: i === 0 ? null : a.sr - appearances[i - 1].sr,
  }));

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav
        mode={latest?.mode}
        seasons={seasons}
        seasonId={latest?.season.id}
      />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
        <h1 className="text-xl font-semibold tracking-tight">{player.displayName}</h1>
        {latest ? (
          <p className="mt-2 numeric text-muted">
            Rank {latest.rank} / {formatSr(latest.sr)} SR / {latest.season.name}{" "}
            {latest.mode === "wz" ? "Warzone" : "Multiplayer"}
          </p>
        ) : (
          <p className="mt-2 text-muted">No snapshot for this season yet.</p>
        )}
        <div className="py-6">
          <CutoffChart
            series={series}
            showRank1={false}
            valueLabel="SR"
            height={220}
          />
        </div>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Snapshot history</caption>
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium text-muted" scope="col">
                  Date
                </th>
                <th className="px-3 py-2 font-medium text-muted" scope="col">
                  Mode
                </th>
                <th className="px-3 py-2 font-medium text-muted" scope="col">
                  Season
                </th>
                <th className="px-3 py-2 font-medium text-muted" scope="col">
                  Rank
                </th>
                <th className="px-3 py-2 font-medium text-muted" scope="col">
                  SR
                </th>
              </tr>
            </thead>
            <tbody>
              {[...appearances].reverse().map((a) => (
                <tr key={`${a.capturedAt}-${a.mode}`} className="border-b border-border">
                  <td className="numeric px-3 py-2">{formatDay(a.capturedAt)}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={a.season.isActive ? `/${a.mode}` : `/${a.mode}/s/${a.season.id}`}
                      className="hover:text-accent"
                    >
                      {a.mode === "wz" ? "Warzone" : "Multiplayer"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{a.season.name}</td>
                  <td className="numeric px-3 py-2">{a.rank}</td>
                  <td className="numeric px-3 py-2">{formatSr(a.sr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
