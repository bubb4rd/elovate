import { DesktopComingSoonHero } from "@/components/desktop/desktop-coming-soon-hero";
import { DesktopWaitlistSection } from "@/components/desktop/desktop-waitlist-section";
import { DesktopWhatsComing } from "@/components/desktop/desktop-whats-coming";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { listSeasons } from "@/lib/data/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Desktop",
  description: "elovate Desktop is coming soon. Join the waitlist for updates and beta access.",
};

export default async function DesktopPage() {
  const seasons = listSeasons();
  const supabase = await createServerSupabaseClient();
  let initialEmail: string | null = null;
  let userId: string | null = null;

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    initialEmail = data.user?.email ?? null;
    userId = data.user?.id ?? null;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <main className="flex-1">
        <DesktopComingSoonHero />
        <DesktopWhatsComing />
        <DesktopWaitlistSection initialEmail={initialEmail} userId={userId} />
      </main>
      <SiteFooter />
    </div>
  );
}
