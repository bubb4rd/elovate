import Link from "next/link";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ModeSelect } from "@/components/mode-select";
import { NavCutoff } from "@/components/nav-cutoff";
import { SeasonSelect } from "@/components/season-select";
import { ThemeToggle } from "@/components/theme-toggle";
import type { BoardFreshnessStatus } from "@/components/live-status";
import { zIndex } from "@/lib/z-index";
import { cn } from "@/lib/utils";
import type { Mode, Season } from "@/lib/data/types";

export function SiteNav({
  mode,
  seasons,
  seasonId,
  tool,
  cutoffSr,
  nextUpdateAt,
  boardStatus = "live",
}: {
  mode?: Mode;
  seasons: Season[];
  seasonId?: string;
  tool?: "board" | "calc";
  cutoffSr?: number;
  nextUpdateAt?: string;
  boardStatus?: BoardFreshnessStatus;
}) {
  const liveMode = mode ?? "wz";
  const activeSeason = seasons.find((s) => s.isActive);
  const onArchivedBoard = Boolean(
    mode && seasonId && activeSeason && seasonId !== activeSeason.id,
  );
  const boardHref = mode
    ? onArchivedBoard
      ? `/${mode}/s/${seasonId}`
      : `/${mode}`
    : "/wz";
  const calcHref = mode ? `/${mode}/calc` : "/wz/calc";

  return (
    <header
      className="sticky top-0 bg-background/95 backdrop-blur"
      style={{ zIndex: zIndex.nav }}
    >
      <div className="mx-auto flex min-h-16 max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:h-16 md:flex-nowrap md:py-0">
        <div className="flex shrink-0 items-baseline gap-2">
          <Link
            href="/"
            aria-label="elovate"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            <BrandWordmark />
          </Link>
          <ModeSelect mode={liveMode} tool={tool} />
        </div>
        {mode ? (
          <nav className="flex items-center gap-1 text-sm">
            <ToolLink href={boardHref} active={tool === "board" || tool == null}>
              Board
            </ToolLink>
            <span className="text-border/80" aria-hidden>
              |
            </span>
            <ToolLink href={calcHref} active={tool === "calc"}>
              Climb
            </ToolLink>
          </nav>
        ) : null}
        {mode && seasonId ? (
          <SeasonSelect mode={mode} seasonId={seasonId} seasons={seasons} />
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          {cutoffSr != null ? (
            <NavCutoff
              cutoffSr={cutoffSr}
              nextUpdateAt={nextUpdateAt}
              boardStatus={boardStatus}
            />
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function ToolLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[6px] px-2.5 py-1.5 text-xs font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active ? "text-accent" : "text-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
