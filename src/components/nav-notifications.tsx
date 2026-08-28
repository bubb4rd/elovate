"use client";

import { Bell, Check, X } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatRelativeShort } from "@/lib/format";
import {
  acceptMatchInvite,
  denyMatchInvite,
  fetchPendingInvites,
  subscribeMatchInvites,
  type PendingMatchInvite,
} from "@/lib/history";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function NavNotifications() {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<PendingMatchInvite[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void fetchPendingInvites().then(setInvites);
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeMatchInvites(refresh);
    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function respond(id: string, action: "accept" | "deny") {
    setPendingId(id);
    const ok = action === "accept" ? await acceptMatchInvite(id) : await denyMatchInvite(id);
    if (ok) setInvites((current) => current.filter((invite) => invite.id !== id));
    else refresh();
    setPendingId(null);
  }

  const count = invites.length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={count > 0 ? `Match invites, ${count} pending` : "Match invites"}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-[6px]",
          "hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          open && "bg-surface",
        )}
      >
        <Bell weight={count > 0 ? "fill" : "bold"} className="size-4 text-muted" />
        {count > 0 ? (
          <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-semibold text-accent-fg">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="region"
          aria-label="Match invites"
          className="absolute top-full right-0 mt-1.5 w-80 overflow-hidden rounded-[6px] border border-border bg-surface-elevated py-1 shadow-sm"
          style={{ zIndex: zIndex.overlay }}
        >
          {count === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted">No match invites</p>
          ) : (
            <ul>
              {invites.map((invite) => {
                const busy = pendingId === invite.id;
                const name = invite.inviter.displayName;
                return (
                  <li
                    key={invite.id}
                    className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0"
                  >
                    <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-[9px] font-semibold text-muted">
                      {invite.inviter.avatarUrl ? (
                        <Image
                          src={invite.inviter.avatarUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="size-full object-cover"
                        />
                      ) : (
                        initials(name)
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug text-foreground">
                        <span className="font-medium">{name}</span>
                        {" tagged you in a match"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {invite.summary}
                        <span className="text-muted/80"> · {formatRelativeShort(invite.createdAt)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Accept invite from ${name}`}
                        onClick={() => {
                          void respond(invite.id, "accept");
                        }}
                        className="flex size-7 items-center justify-center rounded-[6px] text-accent hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                      >
                        <Check weight="bold" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Decline invite from ${name}`}
                        onClick={() => {
                          void respond(invite.id, "deny");
                        }}
                        className="flex size-7 items-center justify-center rounded-[6px] text-muted hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                      >
                        <X weight="bold" className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
