"use client";

import { Check, X } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatRelativeShort } from "@/lib/format";
import {
  respondFriendRequest,
  type PendingFriendRequest,
} from "@/lib/friends";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

export function FriendRequestsPanel({
  requests,
  onChanged,
}: {
  requests: PendingFriendRequest[];
  onChanged: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  async function respond(id: string, accept: boolean) {
    setPendingId(id);
    const result = await respondFriendRequest(id, accept);
    setPendingId(null);
    if (result.ok) onChanged();
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
        Friend requests
      </h2>
      <ul className="divide-y divide-border border-y border-border">
        {requests.map((request) => {
          const busy = pendingId === request.id;
          const name = request.requester.displayName;
          return (
            <li
              key={request.id}
              className="flex items-center gap-3 py-3"
            >
              <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
                <Image
                  src={avatarOrDefault(request.requester.avatarUrl)}
                  alt=""
                  width={32}
                  height={32}
                  className="size-full object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  <Link
                    href={`/players/${request.requester.slug}`}
                    className="font-medium hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {name}
                  </Link>
                  <span className="text-muted"> wants to be friends</span>
                </p>
                <p className="text-[11px] text-muted">
                  {formatRelativeShort(request.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Accept friend request from ${name}`}
                  onClick={() => {
                    void respond(request.id, true);
                  }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-[6px] text-accent hover:bg-surface",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
                  )}
                >
                  <Check weight="bold" className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Decline friend request from ${name}`}
                  onClick={() => {
                    void respond(request.id, false);
                  }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-[6px] text-muted hover:bg-surface hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
                  )}
                >
                  <X weight="bold" className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
