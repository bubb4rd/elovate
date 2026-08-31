"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsSection({
  title,
  description,
  icon,
  children,
  className,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {title || description ? (
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] border border-border bg-surface text-muted">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 pt-0.5">
            {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-muted">{description}</p> : null}
          </div>
        </div>
      ) : null}
      <section className="rounded-[6px] border border-border bg-surface">
        <div className="divide-y divide-border">{children}</div>
      </section>
    </div>
  );
}

export function SettingsRow({
  icon,
  label,
  hint,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center md:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-muted">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-medium">{label}</p>
          {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
        </div>
      </div>
      <div className="shrink-0 sm:self-center">{children}</div>
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
