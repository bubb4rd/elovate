"use client";

import { List, SignIn, UserPlus, UsersThree, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BoardPodiumIcon, ClimbSessionIcon } from "@/components/icons";
import { loginHref, registerHref } from "@/lib/auth/paths";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

export function MobileNavMenu({
  boardHref,
  calcHref,
  tool,
  loginNext = "/",
  signedIn,
}: {
  boardHref: string;
  calcHref: string;
  tool?: "board" | "calc" | "friends";
  loginNext?: string;
  signedIn: boolean;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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

  return (
    <div ref={rootRef} className="relative md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-[6px] text-muted",
          "hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          open && "bg-surface text-foreground",
        )}
      >
        {open ? (
          <X weight="bold" className="size-4" />
        ) : (
          <List weight="bold" className="size-4" />
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Site"
          className="absolute top-full right-0 mt-1.5 w-52 overflow-hidden rounded-[6px] border border-border bg-surface-elevated py-1 shadow-sm"
          style={{ zIndex: zIndex.overlay }}
        >
          <MenuLink
            href={boardHref}
            active={tool === "board"}
            icon={<BoardPodiumIcon className="size-3.5" />}
            onSelect={() => setOpen(false)}
          >
            Board
          </MenuLink>
          <MenuLink
            href={calcHref}
            active={tool === "calc"}
            icon={<ClimbSessionIcon className="size-3.5" />}
            onSelect={() => setOpen(false)}
          >
            Climb
          </MenuLink>
          <MenuLink
            href="/friends"
            active={tool === "friends"}
            icon={<UsersThree weight="bold" className="size-3.5" />}
            onSelect={() => setOpen(false)}
          >
            Friends
          </MenuLink>
          {signedIn ? null : (
            <>
              <div className="my-1 border-t border-border" />
              <MenuLink
                href={registerHref(loginNext)}
                icon={<UserPlus weight="bold" className="size-3.5" />}
                onSelect={() => setOpen(false)}
              >
                Register
              </MenuLink>
              <MenuLink
                href={loginHref(loginNext)}
                icon={<SignIn weight="bold" className="size-3.5" />}
                onSelect={() => setOpen(false)}
              >
                Sign in
              </MenuLink>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  active = false,
  onSelect,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  active?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 text-xs font-medium tracking-wide focus-visible:bg-surface focus-visible:outline-none",
        active
          ? "text-accent"
          : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
