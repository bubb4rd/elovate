"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { Mode } from "@/lib/data/types";

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "wz", label: "WZ" },
  { value: "mp", label: "MP" },
];

export function ModeSelect({
  mode = "wz",
  tool,
}: {
  mode?: Mode;
  tool?: "board" | "calc";
}) {
  const router = useRouter();
  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[0];

  return (
    <span className="relative inline-flex items-center rounded-[6px] text-xs font-medium tracking-wide text-muted focus-within:ring-2 focus-within:ring-accent">
      <span className="pointer-events-none inline-flex items-center gap-1">
        {current.label}
        <CaretDown weight="bold" className="size-3 shrink-0" />
      </span>
      <select
        value={mode}
        onChange={(e) => {
          const next = e.target.value as Mode;
          router.push(tool === "calc" ? `/${next}/calc` : `/${next}`);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
        aria-label="Select mode"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}
