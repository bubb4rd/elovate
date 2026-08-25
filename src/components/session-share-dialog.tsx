"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SessionShareCard } from "@/components/session-share-card";
import {
  SESSION_SHARE_HEIGHT,
  SESSION_SHARE_RADIUS,
  SESSION_SHARE_WIDTH,
  shareFilename,
} from "@/lib/history/share";
import {
  canShareFiles,
  captureShareCard,
  copyShareBlob,
  downloadShareBlob,
  preloadShareAssets,
  shareShareBlob,
} from "@/lib/history/share-image";
import type { SessionSummary } from "@/lib/history";
import { zIndex } from "@/lib/z-index";

export function SessionShareDialog({
  summary,
  onClose,
}: {
  summary: SessionSummary;
  onClose: () => void;
}) {
  const titleId = useId();
  const captureRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nativeShare = canShareFiles();

  useEffect(() => {
    void preloadShareAssets();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(action: "download" | "copy" | "share") {
    const node = captureRef.current;
    if (!node || busy) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const blob = await captureShareCard(node);
      const filename = shareFilename(summary);
      if (action === "download") {
        downloadShareBlob(blob, filename);
        setStatus("Saved");
      } else if (action === "copy") {
        await copyShareBlob(blob);
        setStatus("Copied");
      } else {
        await shareShareBlob(blob, filename);
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(
        action === "copy"
          ? "Couldn't copy the image. Try download instead."
          : action === "share"
            ? "Couldn't share the image. Try download instead."
            : "Couldn't save the image. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 flex items-end justify-center p-3 sm:items-center"
      style={{ zIndex: zIndex.modal }}
    >
      <button
        type="button"
        aria-label="Close share"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[632px] rounded-[6px] border border-white/12 bg-[#121214] p-3.5 text-zinc-100 shadow-[0_18px_50px_rgb(0_0_0/0.45)]"
      >
        <div
          aria-hidden
          className="pointer-events-none fixed top-0"
          style={{
            left: -10000,
            width: SESSION_SHARE_WIDTH,
            height: SESSION_SHARE_HEIGHT,
          }}
        >
          <SessionShareCard ref={captureRef} summary={summary} />
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-sm font-medium tracking-wide text-zinc-300">
            Share session
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[4px] border border-white/12 px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-100"
          >
            Close
          </button>
        </div>
        <div className="@container w-full">
          <div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: `${SESSION_SHARE_WIDTH} / ${SESSION_SHARE_HEIGHT}`,
              borderRadius: SESSION_SHARE_RADIUS,
            }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ transform: `scale(calc(100cqi / ${SESSION_SHARE_WIDTH}))` }}
            >
              <SessionShareCard summary={summary} />
            </div>
          </div>
        </div>
        {error ? <p className="mt-3 text-[12px] text-[#e8a0a0]">{error}</p> : null}
        {status && !error ? (
          <p className="mt-3 text-[12px] text-zinc-500">{status}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run("copy")}
          >
            {busy ? "Working…" : "Copy image"}
          </Button>
          {nativeShare ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run("share")}
            >
              {busy ? "Working…" : "Share"}
            </Button>
          ) : null}
          <Button type="button" size="sm" disabled={busy} onClick={() => void run("download")}>
            {busy ? "Working…" : "Download PNG"}
          </Button>
        </div>
      </div>
    </div>
  );
}
