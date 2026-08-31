"use client";

import { CaretDown, Funnel, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HISTORY_DATE_OPTIONS,
  HISTORY_OUTCOME_OPTIONS,
  clearHistoryFilterChip,
  emptyHistoryFilter,
  historyFilterActive,
  historyFilterChips,
  teammateKey,
  type HistoryDateRange,
  type HistoryFilterState,
  type HistoryOutcome,
  type HistoryTeammate,
} from "@/lib/history";
import { WZ_PLACEMENTS, type WzPlacementId } from "@/lib/ranked";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

const QUERY_DEBOUNCE_MS = 200;

function FilterOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-[6px] px-2 py-1 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected
          ? "border border-accent/40 bg-accent/10 text-foreground"
          : "border border-transparent text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

export function HistoryFilterBar({
  value,
  onChange,
  teammates,
  matchCount,
  totalCount,
}: {
  value: HistoryFilterState;
  onChange: (next: HistoryFilterState) => void;
  teammates: HistoryTeammate[];
  matchCount: number;
  totalCount: number;
}) {
  const searchId = useId();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState(value.query);
  const [prevQuery, setPrevQuery] = useState(value.query);
  const [open, setOpen] = useState(false);

  // Adjust the draft during render when the committed query changes upstream
  // (e.g. a chip removed the search filter) instead of syncing it in an effect.
  if (value.query !== prevQuery) {
    setPrevQuery(value.query);
    setDraft(value.query);
  }

  const chips = historyFilterChips(value);
  const active = historyFilterActive(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = draft.trim();
      if (next === value.query.trim()) return;
      onChange({ ...value, query: next });
    }, QUERY_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
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

  function commitQuery(next: string) {
    const query = next.trim();
    setDraft(query);
    if (query !== value.query.trim()) onChange({ ...value, query });
  }

  function applyFilter(next: HistoryFilterState) {
    setDraft(next.query);
    onChange(next);
  }

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitQuery(draft);
    }
  }

  function toggleOutcome(id: HistoryOutcome) {
    onChange({ ...value, outcome: value.outcome === id ? null : id });
  }

  function toggleDate(id: HistoryDateRange) {
    onChange({ ...value, date: value.date === id ? null : id });
  }

  function togglePlacement(id: WzPlacementId) {
    onChange({ ...value, placement: value.placement === id ? null : id });
  }

  function toggleTeammate(teammate: HistoryTeammate) {
    const selected =
      value.teammate != null && teammateKey(value.teammate) === teammateKey(teammate);
    onChange({ ...value, teammate: selected ? null : teammate });
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <label className="sr-only" htmlFor={searchId}>
            Search teammates
          </label>
          <MagnifyingGlass
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            id={searchId}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search teammates"
            autoComplete="off"
            enterKeyHint="search"
            className={cn("h-10 pl-9", draft ? "pr-9" : undefined)}
          />
          {draft ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => commitQuery("")}
              className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-[6px] text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X weight="bold" className="size-3.5" />
            </button>
          ) : null}
        </div>
        <div className="relative shrink-0" ref={rootRef}>
          <Button
            type="button"
            variant="outline"
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="dialog"
            onClick={() => setOpen((current) => !current)}
            className="gap-1.5 px-3 shadow-none"
          >
            <Funnel weight="bold" className="size-3.5" aria-hidden />
            Filters
            <CaretDown
              weight="bold"
              className={cn("size-3 text-muted transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </Button>
          {open ? (
            <div
              id={panelId}
              role="dialog"
              aria-label="Session filters"
              className="absolute right-0 top-[calc(100%+6px)] w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[6px] border border-border bg-surface-elevated shadow-sm"
              style={{ zIndex: zIndex.overlay }}
            >
              <div className="max-h-[min(24rem,70dvh)] divide-y divide-border overflow-y-auto">
                <FilterGroup label="Outcome">
                  {HISTORY_OUTCOME_OPTIONS.map((option) => (
                    <FilterOption
                      key={option.id}
                      selected={value.outcome === option.id}
                      onClick={() => toggleOutcome(option.id)}
                    >
                      {option.label}
                    </FilterOption>
                  ))}
                </FilterGroup>
                <FilterGroup label="Date">
                  {HISTORY_DATE_OPTIONS.map((option) => (
                    <FilterOption
                      key={option.id}
                      selected={value.date === option.id}
                      onClick={() => toggleDate(option.id)}
                    >
                      {option.label}
                    </FilterOption>
                  ))}
                </FilterGroup>
                <FilterGroup label="Placement">
                  {WZ_PLACEMENTS.map((option) => (
                    <FilterOption
                      key={option.id}
                      selected={value.placement === option.id}
                      onClick={() => togglePlacement(option.id)}
                    >
                      {option.label}
                    </FilterOption>
                  ))}
                </FilterGroup>
                {teammates.length > 0 ? (
                  <FilterGroup label="Teammate">
                    {teammates.map((teammate) => (
                      <FilterOption
                        key={teammateKey(teammate)}
                        selected={
                          value.teammate != null &&
                          teammateKey(value.teammate) === teammateKey(teammate)
                        }
                        onClick={() => toggleTeammate(teammate)}
                      >
                        {teammate.displayName}
                      </FilterOption>
                    ))}
                  </FilterGroup>
                ) : null}
                <div className="px-3 py-2.5">
                  <FilterOption
                    selected={value.streak}
                    onClick={() => onChange({ ...value, streak: !value.streak })}
                  >
                    2+ win streak
                  </FilterOption>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {active ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Applied filters">
            {chips.map((chip) => (
              <li key={chip.id}>
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-1 pr-1 pl-2.5 text-xs text-foreground">
                  <span className="truncate font-medium">{chip.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label} filter`}
                    onClick={() => applyFilter(clearHistoryFilterChip(value, chip.id))}
                    className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X weight="bold" className="size-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            {matchCount} of {totalCount} sessions
          </p>
          <button
            type="button"
            onClick={() => applyFilter(emptyHistoryFilter())}
            className="ml-auto text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
