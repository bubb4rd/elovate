import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { listSeasons } from "@/lib/data/queries";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={listSeasons()} />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-4">
        <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
        <p className="mt-2 text-muted">That player, season, or board does not exist.</p>
        <Link href="/wz" className="mt-6 text-accent hover:underline">
          Top 250 board
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
