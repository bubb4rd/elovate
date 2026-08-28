"use client";

import { MagnifyingGlass, Plus, Users, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_TEAMMATES_PER_MATCH,
  recentTeammates,
  teammateKey,
  type HistoryDocument,
  type HistoryTeammate,
} from "@/lib/history";
import {
  filterRecentTeammates,
  guestTeammateFromQuery,
  isOwnTeammate,
  searchPublicProfiles,
} from "@/lib/profile/search";
import { cn } from "@/lib/utils";

const CHIP_EASE = [0.16, 1, 0.3, 1] as const;

export type TeammateViewer = {
  id?: string;
  slug: string;
  displayName: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function TeammateAvatar({
  teammate,
  className,
}: {
  teammate: HistoryTeammate;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-[9px] font-semibold text-muted",
        className,
      )}
    >
      {teammate.avatarUrl ? (
        <img src={teammate.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initials(teammate.displayName)
      )}
    </span>
  );
}

function Chip({
  teammate,
  onClick,
  onRemove,
  selected = false,
  disabled = false,
}: {
  teammate: HistoryTeammate;
  onClick?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const label = teammate.slug ? `${teammate.displayName} @${teammate.slug}` : teammate.displayName;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-1.5 py-1 text-xs",
        selected
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border bg-background text-foreground",
        disabled && "opacity-50",
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="inline-flex min-w-0 items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`Add ${label}`}
        >
          <TeammateAvatar teammate={teammate} />
          <span className="truncate font-medium">{teammate.displayName}</span>
        </button>
      ) : (
        <>
          <TeammateAvatar teammate={teammate} />
          <span className="truncate font-medium">{teammate.displayName}</span>
        </>
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${teammate.displayName}`}
          className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X weight="bold" className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function TeammatePicker({
  matchId,
  doc,
  viewer = null,
  onTeammatesChange,
  onDismiss,
}: {
  matchId: string;
  doc: HistoryDocument;
  viewer?: TeammateViewer | null;
  onTeammatesChange: (teammates: HistoryTeammate[]) => void;
  onDismiss: () => void;
}) {
  const searchId = useId();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<HistoryTeammate[]>([]);
  const [searching, setSearching] = useState(false);

  const chipMotion = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.55 };
  const fade = reduce
    ? { duration: 0 }
    : { duration: 0.18, ease: CHIP_EASE };

  const selected = useMemo(
    () => doc.matches.find((item) => item.id === matchId)?.teammates ?? [],
    [doc, matchId],
  );
  const selectedKeys = useMemo(
    () => new Set(selected.map(teammateKey)),
    [selected],
  );
  const recents = useMemo(
    () =>
      recentTeammates(doc).filter(
        (teammate) =>
          !selectedKeys.has(teammateKey(teammate)) && !isOwnTeammate(teammate, viewer),
      ),
    [doc, selectedKeys, viewer],
  );
  const recentHits = filterRecentTeammates(recents, query);
  const guest = guestTeammateFromQuery(query);
  const atCap = selected.length >= MAX_TEAMMATES_PER_MATCH;
  const showResults = query.trim().length > 0;
  const visibleProfiles = query.trim().length < 2 ? [] : profiles;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchPublicProfiles(q).then((hits) => {
        if (cancelled) return;
        setProfiles(
          hits.filter(
            (hit) => !selectedKeys.has(teammateKey(hit)) && !isOwnTeammate(hit, viewer),
          ),
        );
        setSearching(false);
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, selectedKeys, viewer]);

  const profileKeys = new Set(visibleProfiles.map(teammateKey));
  const recentKeys = new Set(recentHits.map(teammateKey));
  const showGuest =
    guest != null &&
    !atCap &&
    !isOwnTeammate(guest, viewer) &&
    !selectedKeys.has(teammateKey(guest)) &&
    !recentKeys.has(teammateKey(guest)) &&
    !profileKeys.has(teammateKey(guest));

  function add(teammate: HistoryTeammate) {
    if (atCap || selectedKeys.has(teammateKey(teammate)) || isOwnTeammate(teammate, viewer)) {
      return;
    }
    onTeammatesChange([...selected, teammate]);
    setQuery("");
  }

  function remove(teammate: HistoryTeammate) {
    const key = teammateKey(teammate);
    onTeammatesChange(selected.filter((item) => teammateKey(item) !== key));
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        setQuery("");
      }
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (atCap) return;
    const first = recentHits[0] ?? profiles[0];
    if (first) {
      add(first);
      return;
    }
    if (showGuest && guest) add(guest);
  }

  return (
    <section
      aria-label="Add teammates"
      className="rounded-[6px] border border-border bg-surface px-3.5 py-3"
    >
      <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Users weight="bold" className="size-3.5 text-muted" aria-hidden />
            Teammates
            <span className="text-xs font-normal text-muted">optional</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">Who played with you?</p>
        </div>

      <AnimatePresence initial={false}>
        {selected.length > 0 ? (
          <motion.ul
            key="selected"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={fade}
            className="mt-3 flex flex-wrap gap-1.5 overflow-hidden"
            aria-label="Selected teammates"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {selected.map((teammate) => (
                <motion.li
                  key={teammateKey(teammate)}
                  layout
                  initial={reduce ? false : { opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                  transition={chipMotion}
                >
                  <Chip teammate={teammate} selected onRemove={() => remove(teammate)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : null}
      </AnimatePresence>

      {recents.length > 0 && !showResults ? (
        <div className="mt-3">
          <p className="text-[10px] font-medium tracking-[0.12em] text-muted uppercase">Recent</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {recents.map((teammate) => (
                <motion.li
                  key={teammateKey(teammate)}
                  layout
                  initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                  transition={chipMotion}
                >
                  <Chip
                    teammate={teammate}
                    onClick={() => add(teammate)}
                    disabled={atCap}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      ) : null}

      <div className="relative mt-3">
        <label className="sr-only" htmlFor={searchId}>
          Search teammates
        </label>
        <MagnifyingGlass
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder={atCap ? "Squad full" : "Search or add a name"}
          autoComplete="off"
          disabled={atCap}
          className="h-9 pl-9"
        />
        {showResults ? (
          <ul
            className="absolute inset-x-0 top-[calc(100%+4px)] z-10 overflow-hidden rounded-[6px] border border-border bg-surface-elevated py-1 shadow-lg"
            role="listbox"
            aria-label="Teammate matches"
          >
            {recentHits.map((teammate) => (
              <li key={`recent-${teammateKey(teammate)}`}>
                <button
                  type="button"
                  role="option"
                  disabled={atCap}
                  onClick={() => add(teammate)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-50"
                >
                  <TeammateAvatar teammate={teammate} />
                  <span className="min-w-0 truncate font-medium">{teammate.displayName}</span>
                  <span className="ml-auto text-[10px] tracking-wide text-muted uppercase">
                    Recent
                  </span>
                </button>
              </li>
            ))}
            {visibleProfiles.map((teammate) => (
              <li key={`profile-${teammateKey(teammate)}`}>
                <button
                  type="button"
                  role="option"
                  disabled={atCap}
                  onClick={() => add(teammate)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-50"
                >
                  <TeammateAvatar teammate={teammate} />
                  <span className="min-w-0 truncate font-medium">{teammate.displayName}</span>
                  {teammate.slug ? (
                    <span className="truncate text-xs text-muted">@{teammate.slug}</span>
                  ) : null}
                </button>
              </li>
            ))}
            {showGuest && guest ? (
              <li>
                <button
                  type="button"
                  role="option"
                  onClick={() => add(guest)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
                >
                  <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-border text-muted">
                    <Plus weight="bold" className="size-3" />
                  </span>
                  <span>
                    Add “{guest.displayName}”
                    <span className="ml-1.5 text-xs text-muted">no account</span>
                  </span>
                </button>
              </li>
            ) : null}
            {recentHits.length === 0 && visibleProfiles.length === 0 && !showGuest ? (
              <li className="px-3 py-2 text-xs text-muted">
                {searching ? "Searching…" : "No matches"}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Skip
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={selected.length === 0}
          onClick={onDismiss}
        >
          Done
        </Button>
      </div>
    </section>
  );
}
