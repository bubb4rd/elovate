"use client";

import { cn } from "@/lib/utils";

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[6px] border border-border bg-surface", className)}>
      <div className="border-b border-border px-4 py-4 md:px-5">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-border bg-background",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-4 rounded-full bg-background shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
