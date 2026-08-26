import { cn } from "@/lib/utils";

export function ProfileBlob({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border border-border bg-surface-elevated p-4",
        className,
      )}
    >
      {title ? <h2 className="text-sm font-medium text-foreground">{title}</h2> : null}
      <div className={cn("min-h-0 flex-1", title && "mt-3")}>{children}</div>
    </section>
  );
}
