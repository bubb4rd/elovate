"use client";

import { Check, Copy, ShareNetwork } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { SquadUsersIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export const INVITE_FRIEND_THRESHOLD = 5;

export function shouldShowFriendInvite(friendCount: number): boolean {
  return friendCount < INVITE_FRIEND_THRESHOLD;
}

function InviteFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="mt-10 flex flex-col items-center text-center"
    >
      <SquadUsersIcon className="size-12 text-muted" />
      <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
        Invite friends
      </h2>
      {children}
    </section>
  );
}

export function FriendInviteCallout({
  slug,
  displayName,
}: {
  slug: string;
  displayName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  if (!slug) {
    return (
      <InviteFrame label="Finish profile to invite friends">
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          Finish your profile so people can find you and add you.
        </p>
        <div className="mt-4">
          <Button asChild size="sm">
            <Link href="/onboarding">Finish profile</Link>
          </Button>
        </div>
      </InviteFrame>
    );
  }

  const inviteUrl =
    typeof window === "undefined"
      ? `/players/${slug}`
      : `${window.location.origin}/players/${slug}`;

  async function copyLink() {
    setShareError(null);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setShareError("Couldn't copy the link.");
    }
  }

  async function shareLink() {
    setShareError(null);
    try {
      await navigator.share({
        title: "elovate",
        text: displayName
          ? `Add ${displayName} on elovate`
          : "Add me on elovate",
        url: inviteUrl,
      });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setShareError("Couldn't share the link.");
    }
  }

  return (
    <InviteFrame label="Invite friends">
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        Share your profile so people can add you. A few more names fill out the
        board.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => void copyLink()}
        >
          {copied ? (
            <Check weight="bold" className="size-3.5" aria-hidden />
          ) : (
            <Copy weight="bold" className="size-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {canShare ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => void shareLink()}
          >
            <ShareNetwork weight="bold" className="size-3.5" aria-hidden />
            Share
          </Button>
        ) : null}
      </div>
      {shareError ? (
        <p className="mt-2 text-sm text-negative" role="status">
          {shareError}
        </p>
      ) : null}
    </InviteFrame>
  );
}
