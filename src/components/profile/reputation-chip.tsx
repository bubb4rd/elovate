"use client";

import { useState } from "react";
import { CaretUpDown, Shield } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { ReputationModal } from "@/components/profile/reputation-modal";
import { formatDelta } from "@/lib/format";
import { scoreReputation } from "@/lib/profile/reputation";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import type { ReputationVoteValue, ReputationVotes } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

export function ReputationChip({
  profileId,
  profileSlug,
  votes: initialVotes,
  viewerVote: initialViewerVote,
  canChangeVote: initialCanChangeVote,
  isSignedIn,
  isOwnProfile,
  themeId,
}: {
  profileId: string | null;
  profileSlug: string;
  votes: ReputationVotes;
  viewerVote: ReputationVoteValue | null;
  canChangeVote: boolean;
  isSignedIn: boolean;
  isOwnProfile: boolean;
  themeId: ProfilePageThemeId;
}) {
  const [open, setOpen] = useState(false);
  const [votes, setVotes] = useState(initialVotes);
  const [viewerVote, setViewerVote] = useState(initialViewerVote);
  const [canChangeVote, setCanChangeVote] = useState(initialCanChangeVote);
  const score = scoreReputation(votes);
  const reduce = useReducedMotion();

  return (
    <>
      <motion.button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        whileHover={reduce ? undefined : { y: -1, scale: 1.02 }}
        whileTap={reduce ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5",
          "text-[11px] font-medium tracking-[0.14em] text-foreground uppercase",
          "transition-[border-color,box-shadow] duration-200 hover:border-accent/50 hover:shadow-[0_0_16px_color-mix(in_oklab,var(--accent)_18%,transparent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        )}
      >
        <Shield
          weight="fill"
          className="size-3.5 text-muted transition-colors duration-200 group-hover:text-accent"
        />
        <span>
          Reputation
          <span className="numeric ml-1.5 text-sm font-semibold tracking-normal normal-case">
            {formatDelta(score.raw)}
          </span>
        </span>
        <CaretUpDown
          weight="bold"
          className="size-3 text-muted transition-transform duration-200 group-hover:translate-y-px group-hover:text-foreground"
        />
      </motion.button>
      <ReputationModal
        open={open}
        profileId={profileId}
        profileSlug={profileSlug}
        votes={votes}
        viewerVote={viewerVote}
        canChangeVote={canChangeVote}
        isSignedIn={isSignedIn}
        isOwnProfile={isOwnProfile}
        themeId={themeId}
        onClose={() => setOpen(false)}
        onVoted={(next) => {
          setVotes({ ups: next.ups, downs: next.downs });
          setViewerVote(next.viewerVote);
          setCanChangeVote(next.canChangeVote);
        }}
      />
    </>
  );
}
