"use client";

import { Image as ImageIcon, UploadSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ParsedSrBreakdown } from "@/lib/ocr";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;

type UploadStatus = "idle" | "ready" | "uploading" | "error";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Use a PNG, JPEG, or WebP screenshot.";
  }
  if (file.size > MAX_BYTES) {
    return "Keep the screenshot under 8 MB.";
  }
  return null;
}

function messageForStatus(status: number, bodyError?: string): string {
  if (bodyError?.trim()) {
    if (status === 400 || status === 422 || status === 429 || status === 502 || status === 503) {
      return bodyError.trim();
    }
  }
  if (status === 429) return "Too many scans — try again in a minute";
  if (status === 503) return "Scan unavailable right now";
  if (status === 502) return "Couldn’t read the screenshot. Try again.";
  if (status === 422) return "Couldn’t find an SR breakdown in this image";
  if (status === 400) return "No image uploaded";
  return "Upload failed. Try again.";
}

async function uploadSrScreenshot(
  file: File,
  expectedFee?: number,
): Promise<ParsedSrBreakdown> {
  const body = new FormData();
  body.set("image", file);
  if (expectedFee != null) body.set("expectedFee", String(expectedFee));

  let res: Response;
  try {
    res = await fetch("/api/ocr/sr-breakdown", { method: "POST", body });
  } catch {
    throw new Error("Upload failed. Try again.");
  }

  let payload: { error?: string } & Partial<ParsedSrBreakdown> = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    throw new Error(messageForStatus(res.status, payload.error));
  }

  if (
    typeof payload.net !== "number" ||
    typeof payload.placementSr !== "number" ||
    typeof payload.elimSr !== "number" ||
    typeof payload.fee !== "number"
  ) {
    throw new Error("Couldn’t find an SR breakdown in this image");
  }

  return payload as ParsedSrBreakdown;
}

export function SrScreenshotUpload({
  expectedFee,
  onParsed,
}: {
  expectedFee?: number;
  onParsed: (result: ParsedSrBreakdown) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const clearPreview = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const reset = useCallback(() => {
    clearPreview();
    setFile(null);
    setStatus("idle");
    setErrorMessage(undefined);
    setDragOver(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [clearPreview]);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const applyFile = useCallback(
    (next: File | undefined | null) => {
      if (!next) return;
      const error = validateFile(next);
      clearPreview();
      if (error) {
        setFile(null);
        setStatus("error");
        setErrorMessage(error);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      const url = URL.createObjectURL(next);
      previewRef.current = url;
      setPreviewUrl(url);
      setFile(next);
      setStatus("ready");
      setErrorMessage(undefined);
    },
    [clearPreview],
  );

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const pasted = item.getAsFile();
        if (!pasted) return;
        event.preventDefault();
        applyFile(pasted);
        return;
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [applyFile]);

  const uploading = status === "uploading";
  const canUpload = status === "ready" && file != null;
  const canCancel = file != null || status === "error";
  const stacked = canUpload;

  function onCancel() {
    if (uploading) return;
    if (!canCancel) return;
    reset();
  }

  async function onUpload() {
    if (!file || status !== "ready") return;
    setStatus("uploading");
    setErrorMessage(undefined);
    try {
      const result = await uploadSrScreenshot(file, expectedFee);
      onParsed(result);
      reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed. Try again.");
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        disabled={uploading}
        aria-label="SR breakdown screenshot"
        onChange={(event) => applyFile(event.target.files?.[0])}
      />
      <button
        type="button"
        aria-controls={inputId}
        aria-label={
          file
            ? `Selected ${file.name}. Click to choose a different screenshot.`
            : "Drop a screenshot of your SR breakdown, or click to browse"
        }
        aria-describedby={errorMessage ? `${inputId}-error` : undefined}
        aria-busy={uploading}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
          if (!uploading) applyFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-[6px] border border-dashed px-4 py-8 text-center transition-[background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60",
          dragOver
            ? "border-accent bg-surface-elevated"
            : "border-border bg-surface hover:border-border/80",
        )}
      >
        {previewUrl && file ? (
          <span className="flex w-full max-w-sm flex-col items-center gap-3">
            {/* blob preview; next/image does not accept object URLs */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="max-h-40 w-auto rounded-[6px] border border-border object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">{file.name}</span>
              <span className="mt-1 block text-[11px] text-muted">{formatBytes(file.size)}</span>
            </span>
          </span>
        ) : (
          <>
            {dragOver ? (
              <UploadSimple className="size-8 text-accent" weight="regular" aria-hidden />
            ) : (
              <ImageIcon className="size-8 text-muted" weight="regular" aria-hidden />
            )}
            <span className="mt-3 text-sm text-foreground">Drop a screenshot of your SR breakdown</span>
            <span className="mt-1 text-[11px] text-muted">or click to browse · paste also works</span>
          </>
        )}
      </button>
      {errorMessage ? (
        <p id={`${inputId}-error`} className="text-[11px] text-muted">
          {errorMessage}
        </p>
      ) : null}
      <div className={cn("flex gap-2", stacked ? "flex-col sm:flex-row" : "flex-wrap")}>
        <Button
          type="button"
          className={cn(stacked && "w-full sm:flex-1")}
          disabled={!canUpload || uploading}
          onClick={onUpload}
        >
          {uploading ? "Reading screenshot…" : "Upload"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(stacked && "w-full sm:w-auto")}
          disabled={!canCancel || uploading}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
