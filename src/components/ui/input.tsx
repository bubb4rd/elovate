import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[6px] border border-border bg-background px-3.5 text-base text-foreground placeholder:text-muted/80 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
