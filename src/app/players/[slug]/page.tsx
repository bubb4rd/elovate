import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getViewerProfile } from "@/lib/auth/viewer";
import { listSeasons } from "@/lib/data/queries";
import { getProfile } from "@/lib/profile/queries";
import { IRIDESCENT_SR } from "@/lib/ranked";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  return { title: profile?.displayName ?? "Player" };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getViewerProfile();
  const profile = await getProfile(slug, viewer?.id);
  if (!profile) notFound();
  if (profile.isPrivate && profile.id !== viewer?.id) notFound();
  const seasons = listSeasons();
  const active = seasons.find((season) => season.isActive);
  const firstSr = profile.series[0]?.cutoffSr;
  const lastSr = profile.series[profile.series.length - 1]?.cutoffSr;
  const srDelta =
    firstSr != null && lastSr != null ? lastSr - firstSr : null;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav
        mode={profile.mode}
        seasons={seasons}
        seasonId={active?.id}
        cutoffSr={profile.cutoffSr ?? IRIDESCENT_SR}
      />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
        <ProfilePageContent
          key={`${profile.source}-${profile.slug}`}
          profile={profile}
          srDelta={srDelta}
          canEdit={Boolean(viewer && profile.id && viewer.id === profile.id)}
          isSignedIn={Boolean(viewer)}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
