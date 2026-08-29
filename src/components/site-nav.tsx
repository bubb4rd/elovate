import Image from "next/image";
import Link from "next/link";
import icon from "@/app/icon.png";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ModeSelect } from "@/components/mode-select";
import { NavCutoff } from "@/components/nav-cutoff";
import { NavSession } from "@/components/nav-session";
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
  loginNext,
}: {
  mode?: Mode;
  seasons: Season[];
  seasonId?: string;
  tool?: "board" | "calc" | "friends";
  cutoffSr?: number;
  nextUpdateAt?: string;
  boardStatus?: BoardFreshnessStatus;
  loginNext?: string;
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
      className="sticky top-0 shrink-0 bg-background/95 backdrop-blur"
      style={{ zIndex: zIndex.nav }}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-x-3 px-4 md:gap-x-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {cutoffSr != null ? (
            <NavCutoff
              cutoffSr={cutoffSr}
              nextUpdateAt={nextUpdateAt}
              boardStatus={boardStatus}
              align="start"
              href="/"
              className="md:hidden"
            />
          ) : null}
          <Link
            href="/"
            aria-label="elovate"
            className={cn(
              "items-center gap-1.5 text-base font-semibold tracking-tight text-foreground",
              cutoffSr != null ? "hidden md:inline-flex" : "inline-flex",
            )}
          >
            <Image
              src={icon}
              alt=""
              width={16}
              height={16}
              className="size-4 shrink-0 rounded-[3px]"
              priority
            />
            <BrandWordmark />
          </Link>
          <ModeSelect mode={liveMode} tool={tool === "calc" ? "calc" : "board"} />
        </div>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <ToolLink href={boardHref} active={tool === "board"}>
            Board
          </ToolLink>
          <span className="text-border/80" aria-hidden>
            |
          </span>
          <ToolLink href={calcHref} active={tool === "calc"}>
            Climb
          </ToolLink>
          <span className="text-border/80" aria-hidden>
            |
          </span>
          <ToolLink href="/friends" active={tool === "friends"}>
            Friends
          </ToolLink>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {cutoffSr != null ? (
            <NavCutoff
              cutoffSr={cutoffSr}
              nextUpdateAt={nextUpdateAt}
              boardStatus={boardStatus}
              className="hidden md:flex"
            />
          ) : null}
          <NavSession
            loginNext={loginNext ?? (mode ? `/${mode}` : "/")}
            boardHref={boardHref}
            calcHref={calcHref}
            tool={tool}
          />
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
