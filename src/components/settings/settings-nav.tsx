"use client";

import { Palette, User, LockSimple, Bell, Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

const ITEMS: {
  href: string;
  label: string;
  icon: Icon;
}[] = [
  {
    href: "/settings/appearance",
    label: "Appearance",
    icon: Palette,
  },
  {
    href: "/settings/account",
    label: "Account",
    icon: User,
  },
  {
    href: "/settings/privacy",
    label: "Privacy",
    icon: LockSimple,
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    icon: Bell,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [indicator, setIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;

    if (!element) return;

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const threshold = 2;

    setCanScrollLeft(element.scrollLeft > threshold);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - threshold);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) return;

    updateScrollState();

    element.addEventListener("scroll", updateScrollState, {
      passive: true,
    });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  useLayoutEffect(() => {
    const activeItem = ITEMS.find((item) => pathname === item.href);
    const nav = navRef.current;
    const activeLink = activeItem
      ? linkRefs.current[activeItem.href]
      : null;

    if (!nav || !activeLink) return;

    const updateIndicator = () => {
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();

      setIndicator({
        left: linkRect.left - navRect.left,
        width: linkRect.width,
        ready: true,
      });
    };

    updateIndicator();

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(nav);
    observer.observe(activeLink);

    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const activeItem = ITEMS.find((item) => pathname === item.href);
    const activeLink = activeItem
      ? linkRefs.current[activeItem.href]
      : null;

    activeLink?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [pathname]);

  return (
    <div className="relative -mx-4">
      <div
        ref={scrollRef}
        className="scrollbar-none overflow-x-auto overscroll-x-contain"
      >
        <nav
          ref={navRef}
          aria-label="Settings"
          className="relative flex w-max min-w-full gap-6 border-b border-border px-4"
        >
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            const ItemIcon = item.icon;

            return (
              <Link
                key={item.href}
                ref={(node) => {
                  linkRefs.current[item.href] = node;
                }}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap pb-2",
                  "opacity-75 transition-opacity duration-200",
                  "ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-100",
                  active && "opacity-100",
                )}
              >
                <ItemIcon weight="bold" className="size-4" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-[-1px] left-0 h-px",
              "bg-foreground transition-[transform,width,opacity] duration-300",
              "ease-[cubic-bezier(0.16,1,0.3,1)]",
              indicator.ready ? "opacity-100" : "opacity-0",
            )}
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
            }}
          />
        </nav>
      </div>

      {canScrollLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background via-background/75 to-transparent"
          style={{ zIndex: zIndex.nav }}
        />
      )}

      {canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background via-background/75 to-transparent"
          style={{ zIndex: zIndex.nav }}
        />
      )}
    </div>
  );
}