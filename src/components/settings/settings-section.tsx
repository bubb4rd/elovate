"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {title || description ? (
        <div className="min-w-0">
          {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : null}
          {description ? <p className="mt-0.5 text-muted">{description}</p> : null}
        </div>
      ) : null}
      <section className="rounded-[6px] border border-border bg-surface">
        <div className="divide-y divide-border">{children}</div>
      </section>
    </div>
  );
}

export function SettingsRow({
  label,
  hint,
  layout = "inline",
  children,
}: {
  label: string;
  hint?: string;
  layout?: "inline" | "stack";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "px-4 py-3 md:px-5",
        layout === "inline"
          ? "flex min-h-[52px] items-center justify-between gap-4"
          : "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </div>
      <div className={layout === "inline" ? "shrink-0" : "w-full sm:w-auto sm:shrink-0"}>
        {children}
      </div>
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
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
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

export function SettingsStatus({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  if (!message && !error) return null;
  return (
    <div className="space-y-1">
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {error ? <p className="text-sm text-negative">{error}</p> : null}
    </div>
  );
}

export function SettingsToolbar({
  dirty,
  saving,
  onCancel,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!dirty || saving}
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button type="button" size="sm" disabled={!dirty || saving} onClick={onSave}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
