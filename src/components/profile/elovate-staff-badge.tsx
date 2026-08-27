"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ClimbSessionIcon } from "@/components/icons";
import { ElovateWordmark } from "@/components/elovate-wordmark";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

const STAFF_LABEL = "elovate Staff";

export function ElovateStaffBadge() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const titleId = `${panelId}-title`;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={STAFF_LABEL}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex rounded-[4px] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",
          open && "ring-2 ring-accent/35",
        )}
      >
        <ClimbSessionIcon className="size-5 shrink-0" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="absolute top-full left-0 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-[6px] border border-border bg-surface-elevated p-3.5 shadow-[0_8px_30px_rgb(0_0_0/0.28)]"
          style={{ zIndex: zIndex.overlay }}
        >
          <p id={titleId} className="text-sm font-semibold text-foreground">
            {STAFF_LABEL}
          </p>
          <div className="mt-2.5 flex items-start gap-2.5">
            <ClimbSessionIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="text-[13px] leading-snug text-muted">
              This account belongs to an official{" "}
              <ElovateWordmark inline className="text-foreground" /> team member.
            </p>
          </div>
        </div>
      ) : null}
    </span>
  );
}
