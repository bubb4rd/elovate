"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ThumbsDown, ThumbsUp, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ClimbSessionIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatDelta } from "@/lib/format";
import { REPUTATION_FLOOR, scoreReputation } from "@/lib/profile/reputation";
import { profilePageTheme, type ProfilePageThemeId } from "@/lib/profile/themes";
import type { ReputationVotes } from "@/lib/profile/types";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";
import type { CSSProperties } from "react";

export function ReputationModal({
  open,
  votes,
  themeId,
  onClose,
}: {
  open: boolean;
  votes: ReputationVotes;
  themeId: ProfilePageThemeId;
  onClose: () => void;
}) {
  const titleId = useId();
  const score = scoreReputation(votes);
  const theme = profilePageTheme(themeId);
  const [mounted, setMounted] = useState(false);
  const votesNeeded = Math.max(0, REPUTATION_FLOOR - score.total);
  const reduce = useReducedMotion();
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.85 };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          key="reputation-modal"
          className="fixed inset-0 flex items-end justify-center p-3 sm:items-center"
          style={{ zIndex: zIndex.modal }}
        >
        <motion.button
          type="button"
          aria-label="Close reputation"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          transition={spring}
          className="profile-themed relative w-full max-w-sm rounded-[6px] border border-white/12 bg-[#121214] p-4 text-zinc-100 shadow-[0_18px_50px_rgb(0_0_0/0.45)]"
          style={
            {
              "--profile-accent": theme.accent,
              "--profile-accent-fg": theme.accentFg,
              "--profile-glow": theme.glow,
              "--profile-gradient": theme.gradient,
            } as CSSProperties
          }
        >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id={titleId}
            className="flex items-center gap-2 text-sm font-medium tracking-wide text-zinc-300"
          >
            <ClimbSessionIcon className="size-4" />
            Reputation
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <X weight="bold" className="size-3.5" />
          </button>
        </div>

        {score.unrated ? (
          <p className="text-sm text-zinc-400">
            Needs {votesNeeded} more {votesNeeded === 1 ? "vote" : "votes"} to show a score.
          </p>
        ) : (
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Score
              </dt>
              <dd
                className={cn(
                  "numeric mt-1.5 text-2xl font-semibold tracking-tight",
                  score.raw >= 0 ? "accent-glow text-accent" : "text-negative",
                )}
              >
                {formatDelta(score.raw)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Votes
              </dt>
              <dd className="numeric mt-1.5 text-2xl font-semibold">
                {score.ups}↑ {score.downs}↓
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Positive
              </dt>
              <dd className="numeric mt-1.5 text-2xl font-semibold">{score.positivePct}%</dd>
            </div>
          </dl>
        )}

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled className="flex-1 gap-1.5">
            <ThumbsUp weight="bold" className="size-3.5" />
            Up
          </Button>
          <Button type="button" variant="outline" size="sm" disabled className="flex-1 gap-1.5">
            <ThumbsDown weight="bold" className="size-3.5" />
            Down
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-500">Sign in to vote</p>
        </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
