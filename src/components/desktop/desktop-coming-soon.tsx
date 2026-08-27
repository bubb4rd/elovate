import { DesktopComingSoonHero } from "@/components/desktop/desktop-coming-soon-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { listSeasons } from "@/lib/data/queries";

export function DesktopComingSoon({
  initialEmail,
  userId,
}: {
  initialEmail: string | null;
  userId: string | null;
}) {
  const seasons = listSeasons();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <DesktopComingSoonHero initialEmail={initialEmail} userId={userId} />
      <SiteFooter />
    </div>
  );
}
