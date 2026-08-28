"use client";

import { CaretDown, GearSix, SignOut, User } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { ViewerProfile } from "@/lib/auth/viewer";
import { loginHref, registerHref } from "@/lib/auth/paths";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
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

export function NavAccount({
  viewer,
  loginNext = "/",
}: {
  viewer: ViewerProfile | null;
  loginNext?: string;
}) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setSigningOut(true);
    setOpen(false);
    await supabase.auth.signOut();
    setSigningOut(false);
    router.refresh();
  }

  if (!viewer) {
    return (
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
    );
  }

  const profileHref =
    viewer.onboardingComplete && viewer.slug
      ? `/players/${viewer.slug}`
      : "/onboarding";
  const label = viewer.displayName || viewer.slug || "Profile";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-left",
          "hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          open && "bg-surface",
        )}
      >
        <span className="relative flex size-7 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-[10px] font-semibold text-muted">
          {viewer.avatarUrl ? (
            <Image
              src={viewer.avatarUrl}
              alt=""
              width={28}
              height={28}
              className="size-full object-cover"
            />
          ) : (
            initials(label)
          )}
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

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 mt-1.5 w-48 overflow-hidden rounded-[6px] border border-border bg-surface-elevated py-1 shadow-sm"
          style={{ zIndex: zIndex.overlay }}
        >
          <div className="border-b border-border px-3 py-2 sm:hidden">
            <p className="truncate text-xs font-medium tracking-wide">{label}</p>
          </div>
          <MenuLink
            href={profileHref}
            icon={<User weight="bold" className="size-3.5" />}
            onSelect={() => setOpen(false)}
          >
            Profile
          </MenuLink>
          <MenuLink
            href="/settings"
            icon={<GearSix weight="bold" className="size-3.5" />}
            onSelect={() => setOpen(false)}
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
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onSelect,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium tracking-wide text-muted hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:outline-none"
    >
      {icon}
      {children}
    </Link>
  );
}
