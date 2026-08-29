"use client";

import Image from "next/image";
import Link from "next/link";
import { formatSr } from "@/lib/format";
import type { FriendLeaderboardRow } from "@/lib/friends";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function FriendLeaderboard({
  rows,
}: {
  rows: FriendLeaderboardRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="border-b border-border py-10 text-center">
        <p className="text-sm text-muted">
          No friends yet. Add friends from player profiles to start your board.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 overflow-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-base lg:min-w-0">
        <caption className="sr-only">Friends ranked by skill rating</caption>
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-border">
            <th
              scope="col"
              className="px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted"
            >
              Rank
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-muted"
            >
              Player
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-right text-sm font-semibold uppercase tracking-[0.08em] text-muted"
            >
              SR
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.profileId}
              className={cn(
                "border-b border-border/60 transition-colors duration-150 hover:bg-accent/10",
                row.isViewer && "bg-accent/10",
              )}
            >
              <td className="px-4 py-2.5">
                <span className="numeric">{row.rank}</span>
              </td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/players/${row.slug}`}
                  className="inline-flex items-center gap-2.5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-[9px] font-semibold text-muted">
                    {row.avatarUrl ? (
                      <Image
                        src={row.avatarUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="size-full object-cover"
                      />
                    ) : (
                      initials(row.displayName)
                    )}
                  </span>
                  <span className="min-w-0 truncate font-medium">
                    {row.displayName}
                    {row.isViewer ? (
                      <span className="ml-2 text-xs font-normal text-accent">
                        You
                      </span>
                    ) : null}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-2.5 text-right">
                <span className="numeric">{formatSr(row.currentSr)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
