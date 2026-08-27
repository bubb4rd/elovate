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
    <div className="panel-elevated flex h-[min(22rem,48dvh)] min-h-0 min-w-0 flex-col overflow-hidden lg:h-full">
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-center gap-2.5">
          <label className="relative min-w-0 flex-1" htmlFor="player-search">
            <span className="sr-only">Player Name</span>
            <input
              id="player-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Player Name"
              autoComplete="off"
              className="h-11 w-full rounded-full border border-border bg-background py-2.5 pr-11 pl-4 text-sm text-foreground placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X size={16} weight="bold" aria-hidden />
              </button>
            ) : (
              <MagnifyingGlass
                size={18}
                weight="regular"
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
            )}
          </label>
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
            aria-label="Voice search"
          >
            <Microphone size={18} weight="fill" aria-hidden />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-base lg:min-w-0">
          <caption className="sr-only">Top 250 ranked players</caption>
          <thead className="sticky top-0 z-10 bg-surface-elevated">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/80 odd:bg-background/[0.16]",
                  row.original.isCutoff && "border-l-2 border-l-accent bg-accent/10",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
