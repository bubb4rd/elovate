"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { CaretDown, CaretUp, MagnifyingGlass, Microphone, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDelta, formatSr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardRow } from "@/lib/data/types";

const ROW_GRID =
  "grid grid-cols-[3.25rem_minmax(0,1fr)_4.25rem_4.25rem] md:grid-cols-[4.5rem_minmax(0,1fr)_5.5rem_5.5rem]";

function RankCell({ rank, deltaRank }: { rank: number; deltaRank: number | null }) {
  if (deltaRank === null || deltaRank === 0) {
    return <span className="numeric">{rank}</span>;
  }

  const improved = deltaRank > 0;
  const Icon = improved ? CaretUp : CaretDown;
  const magnitude = Math.abs(deltaRank);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="numeric">{rank}</span>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 numeric text-sm",
          improved ? "text-accent" : "text-negative",
        )}
      >
        <Icon size={14} weight="bold" aria-hidden />
        {magnitude}
        <span className="sr-only">
          {improved ? `up ${magnitude} ranks` : `down ${magnitude} ranks`}
        </span>
      </span>
    </span>
  );
}

export function BoardTable({
  rows,
  linkPlayers = true,
}: {
  rows: BoardRow[];
  linkPlayers?: boolean;
}) {
  const [query, setQuery] = useState("");

  const columns = useMemo<ColumnDef<BoardRow>[]>(
    () => [
      {
        accessorKey: "rank",
        header: "Rank",
        cell: ({ row }) => (
          <RankCell rank={row.original.rank} deltaRank={row.original.deltaRank} />
        ),
      },
      {
        id: "player",
        accessorFn: (row) => row.player.displayName,
        header: "Player",
        cell: ({ row }) =>
          linkPlayers ? (
            <Link
              href={`/players/${row.original.player.slug}`}
              className="hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {row.original.player.displayName}
            </Link>
          ) : (
            <span>{row.original.player.displayName}</span>
          ),
      },
      {
        accessorKey: "sr",
        header: "SR",
        cell: ({ getValue }) => (
          <span className="numeric">{formatSr(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: "deltaSr",
        header: "Δ SR",
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          return (
            <span
              className={cn(
                "numeric",
                v === null ? "text-muted" : v >= 0 ? "text-accent" : "text-negative",
              )}
            >
              {formatDelta(v)}
            </span>
          );
        },
      },
    ],
    [linkPlayers],
  );

  /* eslint-disable react-hooks/incompatible-library -- TanStack Table v8 */
  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter: query },
    onGlobalFilterChange: setQuery,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-col lg:h-full lg:overflow-hidden">
      <div className="flex shrink-0 items-center gap-2.5 pb-3">
        <label className="relative min-w-0 flex-1" htmlFor="player-search">
          <span className="sr-only">Player Name</span>
          <input
            id="player-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Player Name"
            autoComplete="off"
            className="h-10 w-full border-0 border-b border-border bg-transparent py-2 pr-10 pl-0 text-base text-foreground placeholder:text-muted/80 focus-visible:border-border focus-visible:outline-none md:text-sm"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-0 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={16} weight="bold" aria-hidden />
            </button>
          ) : (
            <MagnifyingGlass
              size={18}
              weight="regular"
              className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-muted"
              aria-hidden
            />
          )}
        </label>
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
          aria-label="Voice search"
        >
          <Microphone size={18} weight="fill" aria-hidden />
        </button>
      </div>
      <div role="table" aria-label="Top 250 ranked players" className="flex min-h-0 flex-col lg:flex-1">
        {table.getHeaderGroups().map((hg) => (
          <div key={hg.id} role="rowgroup" className="shrink-0">
            <div
              role="row"
              className={cn(ROW_GRID, "border-b border-border")}
            >
              {hg.headers.map((header) => (
                <div
                  key={header.id}
                  role="columnheader"
                  className="px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted md:px-4"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div role="rowgroup" className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden">
          {table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              role="row"
              className={cn(
                ROW_GRID,
                "border-b border-border/60 transition-colors duration-150 hover:bg-accent/10",
                row.original.isCutoff && "border-l-2 border-l-accent bg-accent/10",
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <div
                  key={cell.id}
                  role="cell"
                  className={cn(
                    "min-w-0 px-3 py-2.5 md:px-4",
                    cell.column.id === "player" && "truncate",
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
