"use client";

import { useRouter } from "next/navigation";
import type { Mode, Season } from "@/lib/data/types";

export function SeasonSelect({
  mode,
  seasonId,
  seasons,
}: {
  mode: Mode;
  seasonId: string;
  seasons: Season[];
}) {
  const router = useRouter();
  const active = seasons.find((s) => s.isActive);

  return (
    <label className="ml-2 hidden items-center gap-2 text-xs text-muted sm:flex">
      <span>Season</span>
      <select
        value={seasonId}
        onChange={(e) => {
          const id = e.target.value;
          if (active && id === active.id) router.push(`/${mode}`);
          else router.push(`/${mode}/s/${id}`);
        }}
        className="h-8 rounded-[6px] border border-border bg-surface px-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:text-sm"
        aria-label="Select season"
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.isActive ? " (live)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
