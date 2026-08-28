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
        {freshness ? <p className="numeric">{freshness}</p> : null}
        <nav className="flex flex-wrap gap-4">
          <Link href="/wz" className="hover:text-foreground">
            Warzone
          </Link>
          <Link href="/mp" className="hover:text-foreground">
            Multiplayer
          </Link>
          <Link href={calcHref} className="hover:text-foreground">
            Climb
          </Link>
          <Link href="/desktop" className="hover:text-foreground">
            Desktop
          </Link>
        </nav>
      </div>
    </footer>
  );
}
