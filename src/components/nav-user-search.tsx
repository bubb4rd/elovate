"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import type { HistoryTeammate } from "@/lib/history";
import { searchPublicProfiles } from "@/lib/profile/search";
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

function ResultAvatar({ person }: { person: HistoryTeammate }) {
  return (
    <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-[9px] font-semibold text-muted">
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initials(person.displayName)
      )}
    </span>
  );
}

export function NavUserSearch() {
  const router = useRouter();
  const searchId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<HistoryTeammate[]>([]);
  const [searching, setSearching] = useState(false);

  const q = query.trim();
  const showResults = open && q.length > 0;
  const visibleProfiles =
    q.length < 2
      ? []
      : profiles.filter((person): person is HistoryTeammate & { slug: string } =>
          Boolean(person.slug),
        );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setProfiles([]);
    setSearching(false);
  }, []);

  function goTo(slug: string) {
    close();
    router.push(`/players/${slug}`);
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open || q.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchPublicProfiles(q, { excludeViewer: false }).then((hits) => {
        if (cancelled) return;
        setProfiles(hits.filter((hit) => Boolean(hit.slug)));
        setSearching(false);
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, q]);

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    const first = visibleProfiles[0];
    if (first?.slug) goTo(first.slug);
  }

  const field = (
    <div className="relative min-w-0 flex-1">
      <label className="sr-only" htmlFor={searchId}>
        Search users
      </label>
      <MagnifyingGlass
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <Input
        ref={inputRef}
        id={searchId}
        type="text"
        role="combobox"
        aria-expanded={showResults}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onSearchKeyDown}
        placeholder="Search users"
        autoComplete="off"
        enterKeyHint="search"
        className="h-8 pl-9 pr-8"
      />
      <button
        type="button"
        aria-label="Close search"
        onClick={close}
        className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X weight="bold" className="size-3.5" />
      </button>
      {showResults ? (
        <ul
          id={listId}
          className="absolute inset-x-0 top-[calc(100%+4px)] max-h-[min(16rem,50dvh)] overflow-y-auto rounded-[6px] border border-border bg-surface-elevated py-1 shadow-lg"
          style={{ zIndex: zIndex.overlay }}
          role="listbox"
          aria-label="User matches"
        >
          {visibleProfiles.map((person) => (
            <li key={person.slug}>
              <Link
                href={`/players/${person.slug}`}
                role="option"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
              >
                <ResultAvatar person={person} />
                <span className="min-w-0 truncate font-medium">{person.displayName}</span>
                <span className="truncate text-xs text-muted">@{person.slug}</span>
              </Link>
            </li>
          ))}
          {visibleProfiles.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">
              {q.length < 2
                ? "Type at least 2 characters"
                : searching
                  ? "Searching…"
                  : "No matches"}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );

  return (
    <div ref={rootRef} className="relative size-8 shrink-0">
      {open ? (
        <div
          className={cn(
            "fixed inset-x-0 top-0 flex h-16 items-center gap-2 bg-background/95 px-4 backdrop-blur",
            "md:absolute md:inset-x-auto md:right-0 md:top-1/2 md:h-auto md:w-56 md:-translate-y-1/2 md:bg-background md:p-0 md:backdrop-blur-none lg:w-64",
          )}
          style={{ zIndex: zIndex.overlay }}
        >
          {field}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Search users"
          onClick={() => setOpen(true)}
          className={cn(
            "flex size-8 items-center justify-center rounded-[6px] text-muted",
            "hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          )}
        >
          <MagnifyingGlass weight="bold" className="size-4" />
        </button>
      )}
    </div>
  );
}
