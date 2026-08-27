"use client";

import { useState } from "react";
import Image from "next/image";
import { CaretDown, CaretUp, PencilSimple } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import {
  ProfileEditModal,
  type ProfileEditDraft,
} from "@/components/profile/profile-edit-modal";
import { ElovateStaffBadge } from "@/components/profile/elovate-staff-badge";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { ReputationChip } from "@/components/profile/reputation-chip";
import { SiteTooltip } from "@/components/ui/tooltip";
import { formatDelta, formatSr } from "@/lib/format";
import type { ProfileHeaderId } from "@/lib/profile/headers";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import type { ProfileView } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

export function ProfileHero({
  profile,
  srDelta,
  pageThemeId,
  canEdit,
  onPageThemeChange,
}: {
  profile: ProfileView;
  srDelta: number | null;
  pageThemeId: ProfilePageThemeId;
  canEdit: boolean;
  onPageThemeChange: (id: ProfilePageThemeId) => void;
}) {
  const up = srDelta != null && srDelta > 0;
  const down = srDelta != null && srDelta < 0;
  const isStaff = profile.grantedHeaderIds.includes("elovate-staff");
  const reduce = useReducedMotion();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [equipped, setEquipped] = useState<ProfileHeaderId>(profile.equippedHeaderId);
  const [editOpen, setEditOpen] = useState(false);

  function applyEdits(saved: ProfileEditDraft) {
    setDisplayName(saved.displayName);
    setAvatarUrl(saved.avatarUrl);
    setEquipped(saved.equippedHeaderId);
    onPageThemeChange(saved.pageThemeId);
  }

  return (
    <section>
      <div className="relative">
        <motion.div
          layout={!reduce}
          transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <ProfileBanner headerId={equipped} />
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
        onSave={applyEdits}
        onClose={() => setEditOpen(false)}
      />
      ) : null}

      <div className="relative z-10 -mt-10 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-5 gap-y-3 pb-6 pl-12 pr-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] md:-mt-12 md:pl-28 md:pr-10 lg:pl-18">
        <div className="relative size-32 shrink-0 overflow-hidden rounded-full ring-2 ring-accent md:size-36">
          {avatarUrl.startsWith("data:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={144}
              height={144}
              priority
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center bg-surface text-2xl font-semibold text-muted">
              {displayName.trim().slice(0, 2).toUpperCase() || "?"}
            </span>
          )}
        </div>

        <div className="min-w-0 pt-18 ">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {displayName}
            </h1>
            {isStaff ? <ElovateStaffBadge /> : null}
            <ReputationChip votes={profile.votes} themeId={pageThemeId} />
          </div>
          <p className="mt-1 text-sm text-muted">{profile.handle}</p>
        </div>

        <div className="col-span-2 pt-18 text-right sm:col-span-1 sm:col-start-3">
          <p className="flex items-center justify-end gap-1.5">
            <span className="numeric accent-glow text-4xl font-semibold tracking-tight text-accent md:text-5xl">
              {formatSr(profile.currentSr)}
            </span>
            {up && srDelta != null ? (
              <SiteTooltip label={`${formatDelta(srDelta)} SR`} align="end">
                <span
                  tabIndex={0}
                  aria-label={`Up ${formatDelta(srDelta)} SR`}
                  className="rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <CaretUp weight="bold" className="size-5 text-accent" aria-hidden />
                </span>
              </SiteTooltip>
            ) : null}
            {down && srDelta != null ? (
              <SiteTooltip label={`${formatDelta(srDelta)} SR`} align="end">
                <span
                  tabIndex={0}
                  aria-label={`Down ${formatDelta(Math.abs(srDelta))} SR`}
                  className="rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <CaretDown weight="bold" className="size-5 text-negative" aria-hidden />
                </span>
              </SiteTooltip>
            ) : null}
          </p>
          <p className="mt-1 text-[10px] font-medium tracking-[0.18em] text-muted uppercase">
            Current SR
          </p>
        </div>
      </div>
    </section>
  );
}
