import { cn } from "@/lib/utils";

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      <span className="accent-glow text-accent">elo</span>vate
    </span>
  );
}
