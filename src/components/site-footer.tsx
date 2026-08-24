import Link from "next/link";

export function SiteFooter({
  freshness,
  calcHref = "/wz/calc",
}: {
  freshness?: string;
  calcHref?: string;
}) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>
          Fan project. Not affiliated with Activision, Treyarch, or Raven.
        </p>
        <p className="numeric">{freshness ?? "Sample snapshots for this build."}</p>
        <nav className="flex gap-4">
          <Link href="/wz" className="hover:text-foreground">
            Warzone
          </Link>
          <Link href="/mp" className="hover:text-foreground">
            Multiplayer
          </Link>
          <Link href={calcHref} className="hover:text-foreground">
            Climb
          </Link>
        </nav>
      </div>
    </footer>
  );
}
