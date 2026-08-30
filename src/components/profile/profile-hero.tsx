"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { FriendRequestButton } from "@/components/friends/friend-request-button";
import {
  ProfileEditModal,
  type ProfileEditDraft,
} from "@/components/profile/profile-edit-modal";
import { ElovateStaffBadge } from "@/components/profile/elovate-staff-badge";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ReputationChip } from "@/components/profile/reputation-chip";
import type { FriendStatus } from "@/lib/friends";
import { avatarOrDefault } from "@/lib/profile/avatar";
import type { ProfileHeaderId } from "@/lib/profile/headers";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import type { ProfileView } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

export function ProfileHero({
  profile,
  pageThemeId,
  displayName,
  avatarUrl,
  equipped,
  canEdit,
  onSave,
}: {
  profile: ProfileView;
  pageThemeId: ProfilePageThemeId;
  displayName: string;
  avatarUrl: string;
  equipped: ProfileHeaderId;
  canEdit: boolean;
  onSave: (saved: ProfileEditDraft) => void;
}) {
  const reduce = useReducedMotion();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <section>
      <div className="relative z-0">
        <motion.div
          layout={!reduce}
          transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <ProfileBanner
            headerId={equipped}
            className="rounded-none md:rounded-2xl"
          />
        </motion.div>
        {canEdit ? (
          <motion.button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={editOpen}
            aria-label="Edit profile"
            whileTap={reduce ? undefined : { scale: 0.92 }}
            onClick={() => setEditOpen(true)}
            className={cn(
              "absolute top-3 right-3 z-20 flex size-9 items-center justify-center rounded-[6px]",
              "border border-black/15 bg-black/35 text-white backdrop-blur-sm",
              "transition-colors duration-200 hover:bg-black/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            )}
          >
            <PencilSimple weight="bold" className="size-4" />
          </motion.button>
        ) : null}
      </div>

      {canEdit && profile.id ? (
        <ProfileEditModal
          open={editOpen}
          userId={profile.id}
          slug={profile.slug}
          handle={profile.handle}
          ownedHeaderIds={profile.ownedHeaderIds}
          draft={{
            displayName,
            avatarUrl,
            equippedHeaderId: equipped,
            pageThemeId,
          }}
          onSave={onSave}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </section>
  );
}

export function ProfileIdentity({
  profile,
  pageThemeId,
  displayName,
  avatarUrl,
  canEdit,
  isSignedIn,
  friendStatus = "none",
  friendRequestId = null,
  className,
}: {
  profile: ProfileView;
  pageThemeId: ProfilePageThemeId;
  displayName: string;
  avatarUrl: string;
  canEdit: boolean;
  isSignedIn: boolean;
  friendStatus?: FriendStatus;
  friendRequestId?: string | null;
  className?: string;
}) {
  const isStaff = profile.grantedHeaderIds.includes("elovate-staff");

  return (
    <div className={cn("relative z-10", className)}>
      <div className="flex flex-row items-start gap-3 md:gap-5 md:pl-28 md:pr-10 lg:pl-18">
        <span className="profile-page-avatar relative z-10" aria-hidden={!avatarUrl}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarOrDefault(avatarUrl)}
            alt=""
            width={88}
            height={88}
            decoding="async"
            className="size-full rounded-full object-cover"
          />
        </span>

        <div className="min-w-0 flex-1 pt-16 md:pt-18">
          <div className="flex min-w-0 items-start justify-between gap-3 min-[1315px]:gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h1 className="text-xl font-bold tracking-tight md:text-3xl md:font-semibold">
                  {displayName}
                </h1>
                {isStaff ? <ElovateStaffBadge /> : null}
              </div>
              <p className="text-[15px] text-muted">{profile.handle}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
              <ReputationChip
                profileId={profile.id}
                profileSlug={profile.slug}
                votes={profile.votes}
                viewerVote={profile.viewerVote}
                canChangeVote={profile.canChangeVote}
                isSignedIn={isSignedIn}
                isOwnProfile={canEdit}
                themeId={pageThemeId}
              />
              {!canEdit && profile.id ? (
                <FriendRequestButton
                  targetProfileId={profile.id}
                  targetSlug={profile.slug}
                  initialStatus={friendStatus}
                  initialRequestId={friendRequestId}
                  isSignedIn={isSignedIn}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
