"use client";

import { zIndex } from "@/lib/z-index";
import { cn } from "@/lib/utils";

export function SiteTooltip({
  label,
  children,
  className,
  align = "start",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const alignClass =
    align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";

  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full mt-1.5 whitespace-nowrap rounded-[6px] border border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium tracking-normal text-muted opacity-0 shadow-sm transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          alignClass,
        )}
        style={{ zIndex: zIndex.overlay }}
      >
        {label}
      </span>
    </span>
  );
}
