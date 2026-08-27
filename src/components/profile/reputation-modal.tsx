"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ThumbsDown, ThumbsUp, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ClimbSessionIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { loginHref } from "@/lib/auth/paths";
import { formatDelta } from "@/lib/format";
import { scoreReputation } from "@/lib/profile/reputation";
import { profilePageTheme, type ProfilePageThemeId } from "@/lib/profile/themes";
import type { ReputationVoteValue, ReputationVotes } from "@/lib/profile/types";
import { castReputationVote } from "@/lib/profile/vote";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";
import type { CSSProperties } from "react";

type ReputationState = ReputationVotes & {
  viewerVote: ReputationVoteValue | null;
  canChangeVote: boolean;
};

export function ReputationModal({
  open,
  profileId,
  profileSlug,
  votes,
  viewerVote,
  canChangeVote,
  isSignedIn,
  isOwnProfile,
  themeId,
  onClose,
  onVoted,
}: {
  open: boolean;
  profileId: string | null;
  profileSlug: string;
  votes: ReputationVotes;
  viewerVote: ReputationVoteValue | null;
  canChangeVote: boolean;
  isSignedIn: boolean;
  isOwnProfile: boolean;
  themeId: ProfilePageThemeId;
  onClose: () => void;
  onVoted: (next: ReputationState) => void;
}) {
  const titleId = useId();
  const score = scoreReputation(votes);
  const theme = profilePageTheme(themeId);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reduce = useReducedMotion();
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.85 };

  const voteable = Boolean(profileId) && !isOwnProfile;
  const signInHref = loginHref(`/players/${profileSlug}`);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function cast(vote: ReputationVoteValue) {
    if (!profileId || pending) return;
    if (viewerVote === vote) return;
    if (viewerVote != null && !canChangeVote) {
      setError("You can change this vote again tomorrow.");
      return;
    }

    const previous: ReputationState = {
      ups: votes.ups,
      downs: votes.downs,
      viewerVote,
      canChangeVote,
    };
    onVoted(applyOptimistic(votes, viewerVote, vote));
    setError(null);
    setPending(true);

    void castReputationVote({ profileId, vote }).then((result) => {
      setPending(false);
      if ("error" in result) {
        onVoted(previous);
        setError(result.error);
        return;
      }
      onVoted(result);
    });
  }

  if (!mounted) return null;

  let footer = "Sign in to vote";
  if (!voteable && isOwnProfile) footer = "You can't vote on your own profile.";
  else if (!voteable) footer = "Voting isn't available for this profile.";
  else if (!isSignedIn) footer = "";
  else if (viewerVote != null && !canChangeVote) footer = "Change again tomorrow.";
  else if (viewerVote != null) footer = "You can flip once per day.";
  else footer = "One vote per day · plus or minus.";

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
                <dd className="numeric mt-1.5 text-2xl font-semibold">
                  {score.positivePct == null ? "—" : `${score.positivePct}%`}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex gap-2">
              {!isSignedIn && voteable ? (
                <>
                  <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
                    <Link href={signInHref}>
                      <ThumbsUp weight="bold" className="size-3.5" />
                      Up
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
                    <Link href={signInHref}>
                      <ThumbsDown weight="bold" className="size-3.5" />
                      Down
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <VoteButton
                    polarity={1}
                    active={viewerVote === 1}
                    disabled={
                      pending ||
                      !voteable ||
                      !isSignedIn ||
                      (viewerVote === 1) ||
                      (viewerVote != null && !canChangeVote)
                    }
                    onClick={() => cast(1)}
                  />
                  <VoteButton
                    polarity={-1}
                    active={viewerVote === -1}
                    disabled={
                      pending ||
                      !voteable ||
                      !isSignedIn ||
                      (viewerVote === -1) ||
                      (viewerVote != null && !canChangeVote)
                    }
                    onClick={() => cast(-1)}
                  />
                </>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-zinc-500">
              {!isSignedIn && voteable ? (
                <Link href={signInHref} className="underline-offset-2 hover:underline">
                  Sign in to vote
                </Link>
              ) : (
                error ?? footer
              )}
            </p>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function VoteButton({
  polarity,
  active,
  disabled,
  onClick,
}: {
  polarity: ReputationVoteValue;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = polarity === 1 ? ThumbsUp : ThumbsDown;
  const label = polarity === 1 ? "Up" : "Down";
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 gap-1.5",
        active && "border-accent/60 bg-accent/15 text-accent",
      )}
    >
      <Icon weight="bold" className="size-3.5" />
      {label}
    </Button>
  );
}

function applyOptimistic(
  votes: ReputationVotes,
  previous: ReputationVoteValue | null,
  next: ReputationVoteValue,
): ReputationState {
  let ups = votes.ups;
  let downs = votes.downs;
  if (previous === 1) ups = Math.max(0, ups - 1);
  if (previous === -1) downs = Math.max(0, downs - 1);
  if (next === 1) ups += 1;
  else downs += 1;
  return { ups, downs, viewerVote: next, canChangeVote: false };
}
