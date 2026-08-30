"use client";

import { Export, Fire, GameController } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ClimbMark } from "@/components/icons";
import { MatchHistory } from "@/components/profile/match-history";
import { SessionShareDialog } from "@/components/session-share-dialog";
import { loginHref, registerHref } from "@/lib/auth/paths";
import { formatDelta, formatLocalTime, formatSr } from "@/lib/format";
import {
  allSummaries,
  wzMatchToProfileMatch,
  type HistoryMatch,
  type SessionSummary,
} from "@/lib/history";
import { useHistory } from "@/lib/history/use-history";
import { cn } from "@/lib/utils";

function netClass(net: number) {
  if (net > 0) return "accent-glow text-accent";
  if (net < 0) return "text-negative";
  return "text-zinc-500";
}

function formatSessionEditorial(iso: string): {
  month: string;
  day: string;
  time: string;
} {
  const date = new Date(iso);
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toUpperCase(),
    day: String(date.getDate()),
    time: formatLocalTime(iso),
  };
}

function formatAvgDelta(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0";
  const formatted = Number.isInteger(rounded)
    ? formatSr(rounded)
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(rounded);
  return rounded > 0 ? `+${formatted}` : formatted;
}

function SessionMetaChip({
  icon,
  children,
  className,
  label,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-[4px] border border-border bg-surface px-2.5 py-1.5 text-xs text-muted",
        className,
      )}
      aria-label={label}
    >
      {icon}
      <span className="numeric text-sm font-medium text-foreground">{children}</span>
    </span>
  );
}

function SessionEditorialDate({ iso }: { iso: string }) {
  const { month, day, time } = formatSessionEditorial(iso);

  return (
    <time
      dateTime={iso}
      className="inline-flex min-w-0 items-baseline gap-2 text-foreground"
    >
      <span className="inline-flex items-baseline gap-1">
        <span className="text-2xl font-medium tracking-[0.22em] text-muted">{month}</span>
        <span className="text-2xl font-light leading-none tracking-tight tabular-nums">
          {day}
        </span>
      </span>
      <span className="text-sm font-light italic text-muted/90">{time}</span>
    </time>
  );
}

function SessionStreak({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[#f97316]"
      title={`${streak}-game win streak`}
      aria-label={`${streak}-game win streak`}
    >
      <Fire
        weight="fill"
        className="size-3.5 shrink-0 drop-shadow-[0_0_8px_color-mix(in_oklab,#f97316_40%,transparent)]"
      />
      <span className="numeric text-xs font-semibold leading-none">{streak}</span>
    </span>
  );
}

function MpMatchRow({ match }: { match: HistoryMatch }) {
  if (match.mode !== "mp") return null;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="inline-flex shrink-0 rounded-[4px] border border-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
        {match.net >= 0 ? "Win" : "Loss"}
      </span>
      <span className="numeric text-sm font-semibold text-accent" title="SR per win">
        {formatDelta(match.srPerWin)}
      </span>
      <span className={cn("numeric text-sm font-semibold", netClass(match.net))}>
        {formatDelta(match.net)}
      </span>
      <p className="numeric min-w-0 flex-1 truncate text-[11px] text-muted">
        {formatLocalTime(match.createdAt)}
      </p>
    </li>
  );
}

function SessionBand({
  summary,
  onShare,
}: {
  summary: SessionSummary;
  onShare: () => void;
}) {
  return (
    <div className="sticky top-16 z-10 flex items-center gap-3 border-b border-border bg-background/95 py-3 backdrop-blur">
      <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-x-2 md:gap-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:contents">
          <SessionEditorialDate iso={summary.session.startedAt} />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:contents">
          <SessionMetaChip
            icon={<GameController weight="fill" className="size-4 shrink-0 text-muted" aria-hidden />}
            label={`${summary.games} games`}
          >
            {summary.games}
          </SessionMetaChip>
          <SessionMetaChip
            icon={
              <span className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                SR
              </span>
            }
          >
            {formatSr(summary.session.startSr)} → {formatSr(summary.endSr)}
          </SessionMetaChip>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1.5">
          <SessionStreak streak={summary.streak} />
          <p className={cn("numeric text-base font-semibold leading-none", netClass(summary.net))}>
            {formatDelta(summary.net)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Share session"
          onClick={onShare}
          className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Export weight="bold" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function SessionLog({
  summary,
  onShare,
}: {
  summary: SessionSummary;
  onShare: () => void;
}) {
  const newestFirst = [...summary.matches].reverse();
  const wzMatches = newestFirst
    .map(wzMatchToProfileMatch)
    .filter((match): match is NonNullable<typeof match> => match != null);

  return (
    <section
      aria-label={`Session at ${formatLocalTime(summary.session.startedAt)}`}
      className="border-b border-border pb-8 last:border-b-0 last:pb-0"
    >
      <SessionBand summary={summary} onShare={onShare} />
      {summary.session.mode === "wz" ? (
        <MatchHistory
          matches={wzMatches}
          limit={wzMatches.length}
          embedded
        />
      ) : (
        <ol className="[&>li:not(:last-child)]:border-b [&>li:not(:last-child)]:border-border">
          {newestFirst.map((match) => (
            <MpMatchRow key={match.id} match={match} />
          ))}
        </ol>
      )}
    </section>
  );
}

function EmptyState({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="max-w-md text-base leading-relaxed text-muted md:text-lg">
          Your full climb log, grouped by session. Sign in to see matches you&apos;ve
          backed up to your account, or log a match in Climb on this device.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={registerHref("/history")}
            className="inline-flex h-11 items-center justify-center rounded-[6px] bg-accent px-5 text-sm font-medium text-accent-fg shadow-sm transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
          >
            Create account
          </Link>
          <Link
            href={loginHref("/history")}
            className="inline-flex h-11 items-center justify-center rounded-[6px] px-4 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Sign in
          </Link>
          <Link
            href="/wz/calc"
            className="inline-flex h-11 items-center justify-center rounded-[6px] px-4 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Open Climb
          </Link>
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted">
      No matches logged yet.{" "}
      <Link
        href="/wz/calc"
        className="font-medium text-accent transition-colors hover:text-accent/80"
      >
        Log your first match in Climb →
      </Link>
    </p>
  );
}

export function HistorySessionList({ signedIn }: { signedIn: boolean }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { doc } = useHistory("wz");
  const summaries = allSummaries(doc);
  const [sharing, setSharing] = useState<SessionSummary | null>(null);
  const games = summaries.reduce((sum, summary) => sum + summary.games, 0);
  const net = summaries.reduce((sum, summary) => sum + summary.net, 0);
  const avgNet = games > 0 ? net / games : 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <div className="min-w-0">
          <h1 className="accent-glow theme-heading text-4xl font-semibold tracking-tight md:text-5xl">
            History
          </h1>
          {mounted && summaries.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Your climb sessions and matches. Only you can see this page.
            </p>
          ) : null}
        </div>
        {mounted && summaries.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <SessionMetaChip
              icon={<ClimbMark className="size-4 shrink-0 text-muted" aria-hidden />}
              label={`${summaries.length} sessions`}
            >
              {summaries.length}
            </SessionMetaChip>
            <SessionMetaChip
              icon={<GameController weight="fill" className="size-4 shrink-0 text-muted" aria-hidden />}
              label={`${games} games`}
            >
              {games}
            </SessionMetaChip>
            <SessionMetaChip
              icon={
                <span className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Net
                </span>
              }
            >
              <span className={netClass(net)}>{formatDelta(net)}</span>
            </SessionMetaChip>
            <SessionMetaChip
              icon={
                <span className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Avg
                </span>
              }
            >
              <span className={netClass(avgNet)}>{formatAvgDelta(avgNet)}</span>
            </SessionMetaChip>
          </div>
        ) : null}
      </div>

      {!mounted ? (
        <p className="text-sm text-muted">Loading history…</p>
      ) : summaries.length === 0 ? (
        <EmptyState signedIn={signedIn} />
      ) : (
        <>
          {!signedIn ? (
            <p className="mb-6 text-center text-sm text-muted">
              These matches are on this device.{" "}
              <Link
                href={loginHref("/history")}
                className="font-medium text-accent transition-colors hover:text-accent/80"
              >
                Sign in to back them up
              </Link>
              .
            </p>
          ) : null}
          <div className="flex flex-col">
            {summaries.map((summary) => (
              <SessionLog
                key={summary.session.id}
                summary={summary}
                onShare={() => setSharing(summary)}
              />
            ))}
          </div>
        </>
      )}

      {sharing ? (
        <SessionShareDialog summary={sharing} onClose={() => setSharing(null)} />
      ) : null}
    </div>
  );
}
