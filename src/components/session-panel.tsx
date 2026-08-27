"use client";

import { ArrowCounterClockwise, CaretDown, Export, Fire, X } from "@phosphor-icons/react";
import { useState, useSyncExternalStore } from "react";
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

export function SessionPanel({
  doc,
  currentSr,
  ticketOpen,
  saveFailed,
  onUndo,
  onEnd,
  onDelete,
}: {
  doc: HistoryDocument;
  currentSr: number;
  ticketOpen: boolean;
  saveFailed: boolean;
  onUndo: () => void;
  onEnd: () => void;
  onDelete: (sessionId: string) => void;
}) {
  const [pastSectionOpen, setPastSectionOpen] = useState(false);
  const [expandedPastId, setExpandedPastId] = useState<string | null>(null);
  const [sharing, setSharing] = useState<SessionSummary | null>(null);
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

  if (!mounted) return null;

  return createPortal(
    <>
    <div
      className={cn(
        "pointer-events-none fixed inset-x-3 md:inset-x-auto md:w-[min(20rem,calc(100vw-2rem))]",
        "bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-4",
        "transition-[right,bottom] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        ticketOpen
          ? "max-md:bottom-[calc(15.25rem+max(0.75rem,env(safe-area-inset-bottom)))] md:right-[calc(1.75rem+min(20rem,calc(100vw-2rem)))]"
          : "md:right-4",
      )}
      style={{ zIndex: zIndex.overlay }}
    >
      <aside
        aria-label="Session"
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
              <span className="accent-glow bg-linear-to-r from-[#fcf8c5] via-[#f2c81d] to-[#ca8d0b] bg-clip-text text-transparent">
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
              const open = (e.currentTarget as HTMLDetailsElement).open;
              setPastSectionOpen(open);
              if (!open) setExpandedPastId(null);
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
                    onOpenChange={(open) =>
                      setExpandedPastId(open ? summary.session.id : null)
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

        {saveFailed ? (
          <p className="border-t border-dashed border-white/15 px-3.5 py-2 text-[11px] text-zinc-500">
            Couldn&apos;t save history on this device.
          </p>
        ) : null}
      </aside>
    </div>
    {sharing ? (
      <SessionShareDialog summary={sharing} onClose={() => setSharing(null)} />
    ) : null}
    </>,
    document.body,
  );
}
