import Link from "next/link";
import { cn } from "@/lib/utils";

export function SiteFooter({
  freshness,
  calcHref = "/wz/calc",
  className,
}: {
  freshness?: string;
  calcHref?: string;
  className?: string;
}) {
  return (
    <footer className="shrink-0 border-t border-border">
      <div
        className={cn(
          "mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between",
          className,
        )}
      >
        <p>
          Not affiliated with Activision, Treyarch, or Raven.
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
