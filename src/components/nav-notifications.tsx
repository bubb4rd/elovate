"use client";

import { Bell, Check, CheckCircle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatRelativeShort } from "@/lib/format";
import {
  fetchPendingFriendRequests,
  respondFriendRequest,
  subscribeFriendRequests,
  type PendingFriendRequest,
} from "@/lib/friends";
import {
  acceptMatchInvite,
  denyMatchInvite,
  fetchPendingInvites,
  subscribeMatchInvites,
  type PendingMatchInvite,
} from "@/lib/history";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

const EASE = [0.16, 1, 0.3, 1] as const;
const ACCEPT_HOLD_MS = 720;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function InviteRow({
  invite,
  busy,
  accepted,
  reduce,
  onAccept,
  onDeny,
  onClose,
}: {
  invite: PendingMatchInvite;
  busy: boolean;
  accepted: boolean;
  reduce: boolean | null;
  onAccept: () => void;
  onDeny: () => void;
  onClose: () => void;
}) {
  const name = invite.inviter.displayName;
  const slug = invite.inviter.slug;
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.7 };
  const fade = reduce ? { duration: 0 } : { duration: 0.22, ease: EASE };

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        accepted && "bg-accent/10",
      )}
    >
      <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
        <Image
          src={avatarOrDefault(invite.inviter.avatarUrl)}
          alt=""
          width={28}
          height={28}
          className="size-full object-cover"
        />
      </span>
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {accepted ? (
            <motion.div
              key="accepted"
              role="status"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <p className="text-xs font-medium leading-snug text-foreground">
                Added to your climb
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {invite.summary}
                <span className="text-muted/80"> · {formatRelativeShort(invite.createdAt)}</span>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={false}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={fade}
            >
              <p className="text-xs leading-snug text-foreground">
                {slug ? (
                  <Link
                    href={`/players/${slug}`}
                    onClick={onClose}
                    className="font-medium hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {name}
                  </Link>
                ) : (
                  <span className="font-medium">{name}</span>
                )}
                {" tagged you in a match"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {invite.summary}
                <span className="text-muted/80"> · {formatRelativeShort(invite.createdAt)}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex h-7 shrink-0 items-center gap-0.5">
        <AnimatePresence mode="wait" initial={false}>
          {accepted ? (
            <motion.span
              key="done"
              initial={reduce ? false : { opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.86 }}
              transition={spring}
              className="flex size-7 items-center justify-center text-accent"
              aria-hidden
            >
              <CheckCircle weight="fill" className="size-4" />
            </motion.span>
          ) : (
            <motion.div
              key="actions"
              className="flex items-center gap-0.5"
              initial={false}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              transition={fade}
            >
              <button
                type="button"
                disabled={busy}
                aria-label={`Accept invite from ${name}`}
                onClick={onAccept}
                className="flex size-7 items-center justify-center rounded-[6px] text-accent hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                <Check weight="bold" className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`Decline invite from ${name}`}
                onClick={onDeny}
                className="flex size-7 items-center justify-center rounded-[6px] text-muted hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                <X weight="bold" className="size-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FriendRequestRow({
  request,
  busy,
  accepted,
  reduce,
  onAccept,
  onDeny,
  onClose,
}: {
  request: PendingFriendRequest;
  busy: boolean;
  accepted: boolean;
  reduce: boolean | null;
  onAccept: () => void;
  onDeny: () => void;
  onClose: () => void;
}) {
  const name = request.requester.displayName;
  const slug = request.requester.slug;
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.7 };
  const fade = reduce ? { duration: 0 } : { duration: 0.22, ease: EASE };

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        accepted && "bg-accent/10",
      )}
    >
      <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
        <Image
          src={avatarOrDefault(request.requester.avatarUrl)}
          alt=""
          width={28}
          height={28}
          className="size-full object-cover"
        />
      </span>
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {accepted ? (
            <motion.div
              key="accepted"
              role="status"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <p className="text-xs font-medium leading-snug text-foreground">
                You are now friends
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {name}
                <span className="text-muted/80"> · {formatRelativeShort(request.createdAt)}</span>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={false}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={fade}
            >
              <p className="text-xs leading-snug text-foreground">
                <Link
                  href={`/players/${slug}`}
                  onClick={onClose}
                  className="font-medium hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  @{slug}
                </Link>
                {" sent you a friend request"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {name}
                <span className="text-muted/80"> · {formatRelativeShort(request.createdAt)}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex h-7 shrink-0 items-center gap-0.5">
        <AnimatePresence mode="wait" initial={false}>
          {accepted ? (
            <motion.span
              key="done"
              initial={reduce ? false : { opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.86 }}
              transition={spring}
              className="flex size-7 items-center justify-center text-accent"
              aria-hidden
            >
              <CheckCircle weight="fill" className="size-4" />
            </motion.span>
          ) : (
            <motion.div
              key="actions"
              className="flex items-center gap-0.5"
              initial={false}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              transition={fade}
            >
              <button
                type="button"
                disabled={busy}
                aria-label={`Accept friend request from ${name}`}
                onClick={onAccept}
                className="flex size-7 items-center justify-center rounded-[6px] text-accent hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                <Check weight="bold" className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`Decline friend request from ${name}`}
                onClick={onDeny}
                className="flex size-7 items-center justify-center rounded-[6px] text-muted hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                <X weight="bold" className="size-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function NavNotifications() {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const settlingRef = useRef<string | null>(null);
  const aliveRef = useRef(true);
  const countRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<PendingMatchInvite[]>([]);
  const [friendRequests, setFriendRequests] = useState<PendingFriendRequest[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [listGone, setListGone] = useState(true);
  const reduce = useReducedMotion();
  const count = invites.length + friendRequests.length;
  countRef.current = count;

  const refresh = useCallback(() => {
    void Promise.all([fetchPendingInvites(), fetchPendingFriendRequests()]).then(
      ([nextInvites, nextFriends]) => {
        if (settlingRef.current) return;
        setInvites(nextInvites);
        setFriendRequests(nextFriends);
      },
    );
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    refresh();
    const unsubInvites = subscribeMatchInvites(refresh);
    const unsubFriends = subscribeFriendRequests(refresh);
    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      unsubInvites();
      unsubFriends();
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (count > 0) setListGone(false);
  }, [count]);

  useEffect(() => {
    if (!open) return;
    refresh();

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
  }, [open, refresh]);

  async function respondInvite(id: string, action: "accept" | "deny") {
    setPendingId(id);
    const ok = action === "accept" ? await acceptMatchInvite(id) : await denyMatchInvite(id);
    if (!ok) {
      refresh();
      if (aliveRef.current) setPendingId(null);
      return;
    }

    if (action === "accept") {
      settlingRef.current = id;
      setAcceptedId(id);
      await wait(reduce ? 0 : ACCEPT_HOLD_MS);
      settlingRef.current = null;
      if (!aliveRef.current) return;
      setInvites((current) => current.filter((invite) => invite.id !== id));
      setAcceptedId(null);
      setPendingId(null);
      refresh();
      return;
    }

    if (!aliveRef.current) return;
    setInvites((current) => current.filter((invite) => invite.id !== id));
    setPendingId(null);
  }

  async function respondFriend(id: string, accept: boolean) {
    setPendingId(id);
    const result = await respondFriendRequest(id, accept);
    if (!result.ok) {
      refresh();
      if (aliveRef.current) setPendingId(null);
      return;
    }

    if (accept) {
      settlingRef.current = id;
      setAcceptedId(id);
      await wait(reduce ? 0 : ACCEPT_HOLD_MS);
      settlingRef.current = null;
      if (!aliveRef.current) return;
      setFriendRequests((current) => current.filter((req) => req.id !== id));
      setAcceptedId(null);
      setPendingId(null);
      refresh();
      return;
    }

    if (!aliveRef.current) return;
    setFriendRequests((current) => current.filter((req) => req.id !== id));
    setPendingId(null);
  }

  const showList = count > 0 || !listGone;
  const itemTransition = reduce
    ? { duration: 0.12 }
    : { duration: 0.32, ease: EASE, layout: { duration: 0.32, ease: EASE } };

  const ariaLabel =
    count > 0 ? `Notifications, ${count} pending` : "Notifications";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-[6px]",
          "hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          open && "bg-surface",
        )}
      >
        <Bell weight={count > 0 ? "fill" : "bold"} className="size-4 text-muted" />
        <AnimatePresence>
          {count > 0 ? (
            <motion.span
              key="badge"
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE }}
              className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-semibold text-accent-fg"
            >
              {count > 9 ? "9+" : count}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      {open ? (
        <div
          id={menuId}
          role="region"
          aria-label="Notifications"
          className="absolute top-full right-0 mt-1.5 w-80 overflow-hidden rounded-[6px] border border-border bg-surface-elevated py-1 shadow-sm"
          style={{ zIndex: zIndex.overlay }}
        >
          <AnimatePresence initial={false} mode="wait">
            {showList ? (
              <motion.div
                key="list"
                initial={false}
                exit={reduce ? { opacity: 0 } : { opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}
              >
                <AnimatePresence
                  initial={false}
                  onExitComplete={() => {
                    if (countRef.current === 0) setListGone(true);
                  }}
                >
                  {friendRequests.length > 0 ? (
                    <motion.p
                      key="friends-label"
                      layout
                      className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase"
                    >
                      Friend requests
                    </motion.p>
                  ) : null}
                  {friendRequests.map((request) => {
                    const busy = pendingId === request.id;
                    return (
                      <motion.div
                        key={`friend-${request.id}`}
                        layout
                        initial={false}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={itemTransition}
                        className="overflow-hidden border-b border-border"
                      >
                        <FriendRequestRow
                          request={request}
                          busy={busy}
                          accepted={acceptedId === request.id}
                          reduce={reduce}
                          onAccept={() => {
                            void respondFriend(request.id, true);
                          }}
                          onDeny={() => {
                            void respondFriend(request.id, false);
                          }}
                          onClose={() => setOpen(false)}
                        />
                      </motion.div>
                    );
                  })}
                  {invites.length > 0 ? (
                    <motion.p
                      key="invites-label"
                      layout
                      className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase"
                    >
                      Match invites
                    </motion.p>
                  ) : null}
                  {invites.map((invite) => {
                    const busy = pendingId === invite.id;
                    return (
                      <motion.div
                        key={`invite-${invite.id}`}
                        layout
                        initial={false}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={itemTransition}
                        className="overflow-hidden border-b border-border last:border-b-0"
                      >
                        <InviteRow
                          invite={invite}
                          busy={busy}
                          accepted={acceptedId === invite.id}
                          reduce={reduce}
                          onAccept={() => {
                            void respondInvite(invite.id, "accept");
                          }}
                          onDeny={() => {
                            void respondInvite(invite.id, "deny");
                          }}
                          onClose={() => setOpen(false)}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
                className="px-3 py-4 text-center text-xs text-muted"
              >
                No friend requests or match invites
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}
