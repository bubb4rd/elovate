import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centered muted icon + short label for a div whose data isn't available yet. */
export function EmptyState({
  icon,
  label,
  className,
  style,
}: {
  icon: ReactNode;
  label: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[5rem] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted",
        className,
      )}
      style={style}
    >
      <span aria-hidden>{icon}</span>
      <p>{label}</p>
    </div>
  );
}
