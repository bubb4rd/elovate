"use client";

import { Check } from "@phosphor-icons/react";
import {
  PROFILE_PAGE_THEMES,
  type ProfilePageThemeId,
} from "@/lib/profile/themes";
import { cn } from "@/lib/utils";

export function ProfileThemePicker({
  selectedThemeId,
  onSelect,
  disabled = false,
}: {
  selectedThemeId: ProfilePageThemeId;
  onSelect: (id: ProfilePageThemeId) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {PROFILE_PAGE_THEMES.map((theme) => {
        const selected = selectedThemeId === theme.id;
        return (
          <li key={theme.id}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${theme.label} page theme${selected ? ", selected" : ""}`}
              onClick={() => onSelect(theme.id)}
              className={cn(
                "group flex w-full flex-col items-center gap-1.5 rounded-[6px] p-1.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]",
                "transition-transform duration-150 active:scale-[0.97] disabled:opacity-50",
              )}
            >
              <span
                className={cn(
                  "relative block h-8 w-full overflow-hidden rounded-[4px] ring-1 ring-white/10",
                  selected && "ring-2 ring-accent ring-offset-1 ring-offset-[#121214]",
                )}
                style={{ background: theme.gradient }}
              >
                {selected ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Check weight="bold" className="size-3.5 text-white" aria-hidden />
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide",
                  selected ? "text-accent" : "text-zinc-500 group-hover:text-zinc-300",
                )}
              >
                {theme.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
