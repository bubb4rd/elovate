import { MpComingSoonHero } from "@/components/mp-coming-soon-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { listSeasons } from "@/lib/data/queries";

export function MpComingSoon() {
  const seasons = listSeasons();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <MpComingSoonHero />
      <SiteFooter />
    </div>
  );
}
