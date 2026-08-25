import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { listSeasons } from "@/lib/data/queries";

export function MpComingSoon() {
  const seasons = listSeasons();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          elovate Multiplayer coming soon.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
