import Link from "next/link";
import { SnapshotTimeChip } from "@/components/snapshot-time-chip";
import { cn } from "@/lib/utils";

export function SiteFooter({
  capturedAt,
  calcHref = "/wz/calc",
  className,
}: {
  capturedAt?: string;
  calcHref?: string;
  className?: string;
}) {
  return (
    <footer className="shrink-0 overflow-visible border-t border-border">
      <div
        className={cn(
          "mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between",
          className,
        )}
      >
        {capturedAt ? <SnapshotTimeChip iso={capturedAt} /> : null}
        <nav className="flex flex-wrap justify-center gap-4 md:ml-auto md:justify-end">
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
