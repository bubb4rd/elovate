"use client";

import {
  CaretDown,
  ClockCounterClockwise,
  GearSix,
  List,
  SignIn,
  SignOut,
  User,
  UserPlus,
  UsersThree,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BoardPodiumIcon, ClimbMark, ClimbSessionIcon } from "@/components/icons";
import type { ViewerProfile } from "@/lib/auth/viewer";
import { loginHref, registerHref } from "@/lib/auth/paths";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

export function NavAccount({
  viewer,
  loginNext = "/",
  boardHref,
  calcHref,
  tool,
}: {
  viewer: ViewerProfile | null;
  loginNext?: string;
  boardHref: string;
  calcHref: string;
  tool?: "board" | "calc" | "friends";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
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

  useEffect(() => {
    if (!open) return;

    function place() {
      placeMenu();
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  function placeMenu() {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }

  function toggleMenu() {
    if (!open) placeMenu();
    setOpen((value) => !value);
  }

  function closeMenu() {
    window.setTimeout(() => setOpen(false), 0);
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setSigningOut(true);
    setOpen(false);
    await supabase.auth.signOut();
    setSigningOut(false);
    router.refresh();
  }

  const profileHref =
    viewer?.onboardingComplete && viewer.slug
      ? `/players/${viewer.slug}`
      : "/onboarding";
  const label = viewer?.displayName || viewer?.slug || "Profile";

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={viewer ? "Account" : "Site"}
      className={cn(
        "fixed isolate w-52 overflow-hidden rounded-[6px] border border-border bg-surface-elevated py-1 shadow-sm",
        !viewer && "md:hidden",
      )}
      style={{ top: menuPos.top, right: menuPos.right, zIndex: zIndex.overlay }}
    >
      {viewer ? (
        <div className="border-b border-border px-3 py-2 sm:hidden">
          <p className="truncate text-xs font-medium tracking-wide">{label}</p>
        </div>
      ) : null}
      <div className="md:hidden">
        <MenuLink
          href={boardHref}
          active={tool === "board"}
          icon={<BoardPodiumIcon className="size-3.5" />}
          onSelect={closeMenu}
        >
          Board
        </MenuLink>
        <MenuLink
          href={calcHref}
          active={tool === "calc"}
          icon={
            tool === "calc" ? (
              <ClimbSessionIcon className="size-3.5" />
            ) : (
              <ClimbMark className="size-3.5" />
            )
          }
          onSelect={closeMenu}
        >
          Climb
        </MenuLink>
        <MenuLink
          href="/friends"
          active={tool === "friends"}
          icon={<UsersThree weight="bold" className="size-3.5" />}
          onSelect={closeMenu}
        >
          Friends
        </MenuLink>
        <div className="my-1 border-t border-border" />
      </div>
      {viewer ? (
        <>
          <MenuLink
            href={profileHref}
            icon={<User weight="bold" className="size-3.5" />}
            onSelect={closeMenu}
          >
            Profile
          </MenuLink>
          <MenuLink
            href="/history"
            active={pathname === "/history"}
            icon={<ClockCounterClockwise weight="bold" className="size-3.5" />}
            onSelect={closeMenu}
          >
            History
          </MenuLink>
          <MenuLink
            href="/settings"
            active={pathname.startsWith("/settings")}
            icon={<GearSix weight="bold" className="size-3.5" />}
            onSelect={closeMenu}
          >
            Settings
          </MenuLink>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => {
              void signOut();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium tracking-wide text-muted hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:outline-none disabled:opacity-50"
          >
            <SignOut weight="bold" className="size-3.5" />
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </>
      ) : (
        <>
          <MenuLink
            href={registerHref(loginNext)}
            icon={<UserPlus weight="bold" className="size-3.5" />}
            onSelect={closeMenu}
          >
            Register
          </MenuLink>
          <MenuLink
            href={loginHref(loginNext)}
            icon={<SignIn weight="bold" className="size-3.5" />}
            onSelect={closeMenu}
          >
            Sign in
          </MenuLink>
        </>
      )}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative">
      {viewer ? (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={toggleMenu}
          className={cn(
            "flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-left",
            "hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            open && "bg-surface",
          )}
        >
          <span className="relative flex size-7 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
            <Image
              src={avatarOrDefault(viewer.avatarUrl)}
              alt=""
              width={28}
              height={28}
              className="size-full object-cover"
            />
          </span>
          <span className="hidden max-w-[10rem] truncate text-xs font-medium tracking-wide sm:inline">
            {label}
          </span>
          <CaretDown
            weight="bold"
            className={cn(
              "hidden size-3 shrink-0 text-muted transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] sm:block",
              open && "rotate-180",
            )}
          />
        </button>
      ) : (
        <>
          <div className="hidden items-center gap-1 md:flex">
            <Link
              href={registerHref(loginNext)}
              className="rounded-[6px] px-2.5 py-1.5 text-xs font-medium tracking-wide text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Register
            </Link>
            <Link
              href={loginHref(loginNext)}
              className="rounded-[6px] border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium tracking-wide text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Sign in
            </Link>
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={toggleMenu}
            className={cn(
              "flex size-8 items-center justify-center rounded-[6px] text-muted md:hidden",
              "hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              open && "bg-surface text-foreground",
            )}
          >
            <List weight="bold" className="size-4" />
          </button>
        </>
      )}
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
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
      aria-current={active ? "page" : undefined}
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
