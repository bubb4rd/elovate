"use client";

import { Bell, Check, CheckCircle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
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

const EASE = [0.16, 1, 0.3, 1] as const;
const ACCEPT_HOLD_MS = 720;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

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

export function NavNotifications() {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const settlingRef = useRef<string | null>(null);
  const aliveRef = useRef(true);
  const countRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<PendingMatchInvite[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [listGone, setListGone] = useState(true);
  const reduce = useReducedMotion();
  const count = invites.length;
  countRef.current = count;

  const refresh = useCallback(() => {
    void fetchPendingInvites().then((next) => {
      if (settlingRef.current) return;
      setInvites(next);
    });
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
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
    if (invites.length > 0) setListGone(false);
  }, [invites.length]);

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

  const showList = count > 0 || !listGone;
  const itemTransition = reduce
    ? { duration: 0.12 }
    : { duration: 0.32, ease: EASE, layout: { duration: 0.32, ease: EASE } };

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
          aria-label="Match invites"
          className="absolute top-full right-0 mt-1.5 w-80 overflow-hidden rounded-[6px] border border-border bg-surface-elevated py-1 shadow-sm"
          style={{ zIndex: zIndex.overlay }}
        >
          <AnimatePresence initial={false} mode="wait">
            {showList ? (
              <motion.ul
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
                  {invites.map((invite) => {
                    const busy = pendingId === invite.id;
                    return (
                      <motion.li
                        key={invite.id}
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
                            void respond(invite.id, "accept");
                          }}
                          onDeny={() => {
                            void respond(invite.id, "deny");
                          }}
                          onClose={() => setOpen(false)}
                        />
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            ) : (
              <motion.p
                key="empty"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
                className="px-3 py-4 text-center text-xs text-muted"
              >
                No match invites
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}
