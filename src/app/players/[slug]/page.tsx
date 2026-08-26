import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { listSeasons } from "@/lib/data/queries";
import { getProfile } from "@/lib/profile/queries";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = getProfile(slug);
  return { title: profile?.displayName ?? "Player" };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();
  const seasons = listSeasons();
  const active = seasons.find((season) => season.isActive);
  const firstSr = profile.series[0]?.cutoffSr;
  const lastSr = profile.series[profile.series.length - 1]?.cutoffSr;
  const srDelta =
    firstSr != null && lastSr != null ? lastSr - firstSr : null;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav mode={profile.mode} seasons={seasons} seasonId={active?.id} />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
        <ProfilePageContent profile={profile} srDelta={srDelta} />
      </main>
      <SiteFooter />
    </div>
  );
}
