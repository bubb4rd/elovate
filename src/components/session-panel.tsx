"use client";

import {
  ArrowCounterClockwise,
  CaretDown,
  Export,
  Fire,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { formatDelta, formatLocalDay, formatLocalTime, formatSr } from "@/lib/format";
import {
  canUndoLast,
  openSummary,
  pastSummaries,
  type HistoryDocument,
  type HistoryMatch,
  type SessionSummary,
} from "@/lib/history";
import { ClimbSessionIcon } from "@/components/icons";
import { SessionShareDialog } from "@/components/session-share-dialog";
import { WZ_PLACEMENTS } from "@/lib/ranked";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

const EASE = [0.16, 1, 0.3, 1] as const;
const TICKET_MOBILE_LIFT =
  "max-md:bottom-[calc(15.25rem+max(0.75rem,env(safe-area-inset-bottom)))]";
const TICKET_DESKTOP_OFFSET =
  "md:right-[calc(1.75rem+min(20rem,calc(100vw-2rem)))]";

function netClass(net: number) {
  if (net > 0) return "accent-glow text-accent";
  if (net < 0) return "text-negative";
  return "text-zinc-500";
}

function SessionStreak({ streak, size }: { streak: number; size: "lg" | "sm" }) {
  if (streak < 2) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[#f97316]"
      title={`${streak}-game win streak`}
      aria-label={`${streak}-game win streak`}
    >
      <Fire
        weight="fill"
        className={cn(
          "shrink-0 drop-shadow-[0_0_8px_color-mix(in_oklab,#f97316_40%,transparent)]",
          size === "lg" ? "size-4" : "size-3",
        )}
      />
      <span
        className={cn(
          "numeric font-semibold leading-none tracking-tight",
          size === "lg" ? "text-base" : "text-[11px]",
        )}
      >
        {streak}
      </span>
    </span>
  );
}

function placementLabel(match: HistoryMatch): string {
  if (match.mode === "wz") {
    return WZ_PLACEMENTS.find((item) => item.id === match.placement)?.label ?? match.placement;
  }
  return "Win";
}

function MatchRow({
  match,
  onUndo,
}: {
  match: HistoryMatch;
  onUndo?: () => void;
}) {
  const detail =
    match.mode === "wz"
      ? `${match.squadElims} sq / ${match.yourElims} you`
      : formatDelta(match.srPerWin);

  return (
    <li className="group/row relative flex items-center gap-2 py-1.5">
      <span className="shrink-0 rounded-[4px] border border-white/12 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200">
        {placementLabel(match)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[11px] text-zinc-400">
          <span className="truncate">{detail}</span>
          {match.teammates.length > 0 ? (
            <span
              className="inline-flex shrink-0 items-center"
              title={match.teammates.map((teammate) => teammate.displayName).join(", ")}
            >
              {match.teammates.slice(0, 3).map((teammate, index) => (
                <span
                  key={`${teammate.displayName}-${index}`}
                  className={cn(
                    "relative flex size-4 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[7px] font-semibold text-zinc-300",
                    index > 0 && "-ml-1",
                  )}
                >
                  {teammate.displayName.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </span>
          ) : null}
        </p>
        <p className="numeric mt-0.5 text-[10px] text-zinc-600">{formatLocalTime(match.createdAt)}</p>
      </div>
      <p className={cn("numeric shrink-0 text-[13px] font-medium", netClass(match.net))}>
        {formatDelta(match.net)}
      </p>
      {onUndo ? (
        <button
          type="button"
          onClick={onUndo}
          aria-label="Undo last match"
          className="absolute -right-0.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[4px] bg-[#121214] text-zinc-400 opacity-0 shadow-[-8px_0_12px_#121214] transition-opacity hover:text-zinc-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent group-hover/row:opacity-100"
        >
          <ArrowCounterClockwise weight="bold" className="size-3.5" />
        </button>
      ) : null}
    </li>
  );
}

function SessionStats({
  summary,
  compact = false,
}: {
  summary: SessionSummary;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="mt-1 flex items-baseline gap-2">
        <span
          className={cn(
            "inline-flex items-baseline gap-1 numeric text-sm font-semibold leading-none",
            netClass(summary.net),
          )}
        >
          {formatDelta(summary.net)}
          <span className="text-[11px] font-medium tracking-normal text-zinc-400">
            SR
          </span>
          <SessionStreak streak={summary.streak} size="sm" />
        </span>
        <span className="numeric text-[10px] text-zinc-500">
          {summary.games} game{summary.games === 1 ? "" : "s"}
        </span>
      </p>
    );
  }

  return (
    <div className="mt-2.5">
      <p
        className={cn(
          "inline-flex items-baseline gap-1.5 numeric text-2xl font-semibold leading-none tracking-tight",
          netClass(summary.net),
        )}
      >
        {formatDelta(summary.net)}
        <span className="text-sm font-medium tracking-normal text-zinc-400">
          SR
        </span>
        <SessionStreak streak={summary.streak} size="lg" />
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span className="numeric rounded-[4px] border border-white/10 bg-white/4 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {summary.games} game{summary.games === 1 ? "" : "s"}
        </span>
        <span className="numeric rounded-[4px] border border-white/10 bg-white/4 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {formatSr(summary.session.startSr)} → {formatSr(summary.endSr)}
        </span>
      </div>
    </div>
  );
}

function PastSessionRow({
  summary,
  open,
  onOpenChange,
  onShare,
  onDelete,
}: {
  summary: SessionSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const matches = [...summary.matches].reverse();
  return (
    <details
      className="group/past"
      open={open}
      onToggle={(e) => onOpenChange((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1.5 [&::-webkit-details-marker]:hidden">
        <CaretDown
          weight="bold"
          className="size-2.5 shrink-0 text-zinc-600 transition-transform group-open/past:rotate-180"
        />
        <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-300">
          {formatLocalDay(summary.session.startedAt)}
          <span className="numeric text-zinc-500">
            {" "}
            · {summary.games} game{summary.games === 1 ? "" : "s"}
          </span>
        </span>
        <span className={cn("numeric shrink-0 text-[12px]", netClass(summary.net))}>
          {formatDelta(summary.net)}
        </span>
        <button
          type="button"
          aria-label="Share session"
          disabled={summary.games === 0}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onShare();
          }}
          className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-40"
        >
          <Export weight="bold" className="size-3" />
        </button>
        <button
          type="button"
          aria-label="Delete session"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:text-negative"
        >
          <X weight="bold" className="size-3" />
        </button>
      </summary>
      <ul className="pb-1 pl-4">
        {matches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ul>
    </details>
  );
}

function DockShell({
  ticketOpen,
  mode,
  children,
  className,
}: {
  ticketOpen: boolean;
  mode: "fab" | "panel";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed",
        "transition-[right,bottom,inset] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        mode === "fab" ? "right-3 md:right-4" : "inset-x-3 md:inset-x-auto md:w-[min(20rem,calc(100vw-2rem))]",
        ticketOpen
          ? cn(
              TICKET_MOBILE_LIFT,
              mode === "fab"
                ? "md:bottom-[calc(15.25rem+1rem)]"
                : cn("md:bottom-4", TICKET_DESKTOP_OFFSET),
            )
          : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-4 md:right-4",
        className,
      )}
      style={{ zIndex: zIndex.overlay }}
    >
      {children}
    </div>
  );
}

export function SessionPanel({
  doc,
  currentSr,
  ticketOpen,
  saveFailed,
  onRetrySync,
  onUndo,
  onEnd,
  onDelete,
}: {
  doc: HistoryDocument;
  currentSr: number;
  ticketOpen: boolean;
  saveFailed: boolean;
  onRetrySync?: () => Promise<boolean>;
  onUndo: () => void;
  onEnd: () => void;
  onDelete: (sessionId: string) => void;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [pastSectionOpen, setPastSectionOpen] = useState(false);
  const [expandedPastId, setExpandedPastId] = useState<string | null>(null);
  const [sharing, setSharing] = useState<SessionSummary | null>(null);
  const [retrying, setRetrying] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const current = openSummary(doc);
  const past = pastSummaries(doc);
  const canUndo = canUndoLast(doc, currentSr);
  const currentMatches = current ? [...current.matches].reverse() : [];
  const browsingPast = pastSectionOpen || expandedPastId != null;
  const hasLiveSession = Boolean(current && current.games > 0);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!mounted) return null;

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.75 };
  const fade = reduce ? { duration: 0 } : { duration: 0.2, ease: EASE };

  return createPortal(
    <>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <DockShell
            key="panel"
            mode="panel"
            ticketOpen={ticketOpen}
          >
            <motion.aside
              aria-label="Climb session"
              initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              transition={spring}
              className="pointer-events-auto relative max-h-[min(22rem,52dvh)] overflow-hidden rounded-[6px] border border-white/12 bg-[#121214] text-zinc-100 shadow-[0_18px_50px_rgb(0_0_0/0.45)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[radial-gradient(circle_at_8px_0,#0a0a0b_6px,transparent_6.5px)] bg-size-[16px_12px] bg-repeat-x"
              />
              <div
                className={cn(
                  "relative px-3.5 pt-5",
                  browsingPast ? "pb-2" : "pb-2.5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium tracking-wide text-zinc-400">
                    <ClimbSessionIcon className="size-3.5 accent-glow" />
                    <span className="accent-glow theme-heading">
                      Climb
                    </span>{" "}
                    Session
                  </p>
                  <div className="flex items-center gap-1.5">
                    {current && current.games > 0 ? (
                      <button
                        type="button"
                        aria-label="Share session"
                        onClick={() => setSharing(current)}
                        className="flex size-5 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:text-zinc-100"
                      >
                        <Export weight="bold" className="size-3" />
                      </button>
                    ) : null}
                    {current && !browsingPast ? (
                      <button
                        type="button"
                        onClick={onEnd}
                        className="rounded-[4px] border border-white/12 px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-100"
                      >
                        End
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Close session"
                      onClick={() => setOpen(false)}
                      className="flex size-5 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <X weight="bold" className="size-3.5" />
                    </button>
                  </div>
                </div>
                {current ? (
                  <SessionStats summary={current} compact={browsingPast} />
                ) : (
                  <p className="mt-2 text-[12px] text-zinc-500">Add SR to start a session</p>
                )}
              </div>

              {current && !browsingPast ? (
                <ul className="relative max-h-28 overflow-y-auto border-t border-dashed border-white/15 px-3.5 py-1">
                  {currentMatches.map((match, index) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      onUndo={index === 0 && canUndo ? onUndo : undefined}
                    />
                  ))}
                </ul>
              ) : null}

              {past.length > 0 ? (
                <details
                  className="group relative border-t border-dashed border-white/15"
                  open={pastSectionOpen}
                  onToggle={(e) => {
                    const nextOpen = (e.currentTarget as HTMLDetailsElement).open;
                    setPastSectionOpen(nextOpen);
                    if (!nextOpen) setExpandedPastId(null);
                  }}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2 text-[11px] text-zinc-400 [&::-webkit-details-marker]:hidden">
                    <CaretDown
                      weight="bold"
                      className="size-3 shrink-0 transition-transform group-open:rotate-180"
                    />
                    Past sessions
                    <span className="numeric ml-auto text-zinc-500">{past.length}</span>
                  </summary>
                  <ul
                    className={cn(
                      "overflow-y-auto px-3.5 pb-2",
                      browsingPast ? "max-h-[min(14rem,36dvh)]" : "max-h-28",
                    )}
                  >
                    {past.map((summary) => (
                      <li key={summary.session.id}>
                        <PastSessionRow
                          summary={summary}
                          open={expandedPastId === summary.session.id}
                          onOpenChange={(nextOpen) =>
                            setExpandedPastId(nextOpen ? summary.session.id : null)
                          }
                          onShare={() => setSharing(summary)}
                          onDelete={() => {
                            if (expandedPastId === summary.session.id) {
                              setExpandedPastId(null);
                            }
                            if (sharing?.session.id === summary.session.id) {
                              setSharing(null);
                            }
                            onDelete(summary.session.id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              <Link
                href="/history"
                className="relative flex items-center justify-center border-t border-dashed border-white/15 px-3.5 py-2 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent"
              >
                View all history
              </Link>

              {saveFailed ? (
                <div className="border-t border-dashed border-negative/30 bg-negative/5 px-3.5 py-2.5">
                  <p className="text-[11px] font-medium text-negative">
                    Couldn&apos;t sync climb history
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                    Saved on this device. Sign in and retry to back up to your account.
                  </p>
                  {onRetrySync ? (
                    <button
                      type="button"
                      disabled={retrying}
                      onClick={() => {
                        setRetrying(true);
                        void onRetrySync().finally(() => setRetrying(false));
                      }}
                      className="mt-2 rounded-[4px] border border-white/12 px-2 py-0.5 text-[10px] font-medium text-zinc-200 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      {retrying ? "Retrying…" : "Retry sync"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </motion.aside>
          </DockShell>
        ) : (
          <DockShell
            key="fab"
            mode="fab"
            ticketOpen={ticketOpen}
          >
            <motion.button
              type="button"
              aria-label={
                hasLiveSession
                  ? `Open climb session, ${formatDelta(current!.net)} across ${current!.games} games`
                  : "Open climb session"
              }
              aria-expanded={false}
              onClick={() => setOpen(true)}
              initial={reduce ? false : { opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={fade}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className={cn(
                "pointer-events-auto relative flex size-14 items-center justify-center rounded-full",
                "border border-white/12 bg-[#121214] text-zinc-100",
                "shadow-[0_12px_36px_rgb(0_0_0/0.5)]",
                "transition-colors hover:border-accent/40 hover:bg-[#18181b]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                "active:scale-[0.98]",
              )}
            >
              <ClimbSessionIcon className="size-6 accent-glow" />
              {hasLiveSession ? (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1",
                    "border border-[#121214] bg-accent text-[10px] font-semibold text-accent-fg",
                    "numeric leading-none",
                  )}
                >
                  {current!.games > 9 ? "9+" : current!.games}
                </span>
              ) : null}
              {saveFailed ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute size-2.5 rounded-full bg-negative ring-2 ring-[#121214]",
                    hasLiveSession ? "top-0.5 left-0.5" : "top-0.5 right-0.5",
                  )}
                />
              ) : null}
            </motion.button>
          </DockShell>
        )}
      </AnimatePresence>
      {sharing ? (
        <SessionShareDialog summary={sharing} onClose={() => setSharing(null)} />
      ) : null}
    </>,
    document.body,
  );
}
