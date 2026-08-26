"use client";

import {
  Clock,
  CloudSlash,
  Image as ImageIcon,
  ImageBroken,
  UploadSimple,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import type { ParsedSrBreakdown } from "@/lib/ocr";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;
const EASE = [0.16, 1, 0.3, 1] as const;

type UploadStatus = "idle" | "ready" | "uploading" | "error";
type ScanErrorKind =
  | "unreadable"
  | "read_failed"
  | "invalid_file"
  | "rate_limit"
  | "unavailable";

class ScanError extends Error {
  readonly kind: ScanErrorKind;

  constructor(kind: ScanErrorKind, message: string) {
    super(message);
    this.name = "ScanError";
    this.kind = kind;
  }
}

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

function kindForStatus(status: number, bodyError?: string): ScanErrorKind {
  if (status === 429) return "rate_limit";
  if (status === 503) return "unavailable";
  if (status === 502) return "read_failed";
  if (status === 422) return "unreadable";
  if (status === 400) {
    const msg = bodyError?.trim() ?? "";
    if (msg.includes("8 MB") || /PNG|JPEG|WebP/i.test(msg)) return "invalid_file";
    return "unreadable";
  }
  return "read_failed";
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
    throw new ScanError("read_failed", "Upload failed. Try again.");
  }

  let payload: { error?: string } & Partial<ParsedSrBreakdown> = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    throw new ScanError(kindForStatus(res.status, payload.error), messageForStatus(res.status, payload.error));
  }

  if (
    typeof payload.net !== "number" ||
    typeof payload.placementSr !== "number" ||
    typeof payload.elimSr !== "number" ||
    typeof payload.fee !== "number"
  ) {
    throw new ScanError("unreadable", "Couldn’t find an SR breakdown in this image");
  }

  return {
    net: payload.net,
    placementSr: payload.placementSr,
    elimSr: payload.elimSr,
    fee: payload.fee,
    yourElimSr: payload.yourElimSr,
    squadElimSr: payload.squadElimSr,
    placementId: payload.placementId,
    confidence: payload.confidence ?? "medium",
    warnings: payload.warnings ?? [],
    fieldIssues: payload.fieldIssues ?? {},
  };
}

function errorTone(kind: ScanErrorKind): "warning" | "negative" | "muted" {
  if (kind === "read_failed") return "negative";
  if (kind === "rate_limit" || kind === "unavailable") return "muted";
  return "warning";
}

export function SrScreenshotUpload({
  expectedFee,
  onParsed,
  panelHeight,
}: {
  expectedFee?: number;
  onParsed: (result: ParsedSrBreakdown) => void;
  panelHeight?: number;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const reduce = useReducedMotion();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [errorKind, setErrorKind] = useState<ScanErrorKind | undefined>();

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
    setErrorKind(undefined);
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
        setErrorKind("invalid_file");
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
      setErrorKind(undefined);
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
  const canRetry = file != null && (status === "ready" || (status === "error" && errorKind !== "rate_limit"));
  const canCancel = file != null || status === "error";
  const stacked = file != null && status !== "error";

  function openPicker() {
    if (uploading) return;
    inputRef.current?.click();
  }

  function onCancel() {
    if (uploading) return;
    if (!canCancel) return;
    reset();
  }

  async function onUpload() {
    if (!file || (status !== "ready" && status !== "error")) return;
    if (status === "error" && errorKind === "rate_limit") return;
    setStatus("uploading");
    setErrorMessage(undefined);
    setErrorKind(undefined);
    try {
      const result = await uploadSrScreenshot(file, expectedFee);
      onParsed(result);
      reset();
    } catch (err) {
      const scan = err instanceof ScanError ? err : null;
      setStatus("error");
      setErrorKind(scan?.kind ?? "read_failed");
      setErrorMessage(scan?.message ?? (err instanceof Error ? err.message : "Upload failed. Try again."));
    }
  }

  function onPanelClick(event: MouseEvent<HTMLDivElement>) {
    if (uploading) return;
    if ((event.target as HTMLElement).closest("button")) return;
    openPicker();
  }

  const tone = errorKind ? errorTone(errorKind) : null;
  const surfaceKey =
    status === "error" && errorKind
      ? `error-${errorKind}`
      : status === "uploading"
        ? "reading"
        : status === "ready"
          ? "ready"
          : dragOver
            ? "drag"
            : "idle";

  const fade = reduce ? { duration: 0 } : { duration: 0.22, ease: EASE };

  return (
    <div
      className="flex flex-col gap-4 lg:h-[var(--rank-card-h,18rem)]"
      style={
        panelHeight != null
          ? ({ "--rank-card-h": `${Math.round(panelHeight)}px` } as CSSProperties)
          : undefined
      }
    >
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
      <div
        role={uploading || status === "error" ? undefined : "button"}
        tabIndex={uploading || status === "error" ? -1 : 0}
        aria-controls={inputId}
        aria-label={
          uploading
            ? "Reading screenshot"
            : status === "error"
              ? undefined
              : file
                ? `Selected ${file.name}. Click to choose a different screenshot.`
                : "Drop a screenshot of your SR breakdown, or click to browse"
        }
        aria-describedby={errorMessage ? `${inputId}-error` : undefined}
        aria-busy={uploading}
        onClick={onPanelClick}
        onKeyDown={(event) => {
          if (uploading || status === "error") return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
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
          "relative flex min-h-[18rem] flex-1 cursor-pointer flex-col overflow-hidden rounded-[6px] border border-dashed text-center transition-[background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:min-h-0",
          uploading && "pointer-events-none cursor-default",
          dragOver
            ? "border-accent bg-surface-elevated"
            : tone === "warning"
              ? "border-warning bg-surface"
              : tone === "negative"
                ? "border-negative bg-surface"
                : "border-border bg-surface hover:border-border/80",
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={surfaceKey}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={fade}
            className="absolute inset-0 flex flex-col items-center justify-center px-4 py-5"
          >
            {status === "uploading" ? (
              <ReadingSurface previewUrl={previewUrl} reduce={Boolean(reduce)} />
            ) : status === "error" && errorKind && errorMessage ? (
              <ErrorSurface
                id={`${inputId}-error`}
                kind={errorKind}
                message={errorMessage}
                canRetrySameFile={file != null}
                onChooseAnother={openPicker}
                onRetry={onUpload}
              />
            ) : previewUrl && file ? (
              <ReadySurface previewUrl={previewUrl} file={file} />
            ) : (
              <IdleSurface dragOver={dragOver} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={cn("flex shrink-0 gap-2", stacked ? "flex-col sm:flex-row" : "flex-wrap")}>
        <Button
          type="button"
          className={cn(stacked && "w-full sm:flex-1")}
          disabled={!canRetry || uploading}
          onClick={onUpload}
        >
          {status === "error" && file && errorKind !== "rate_limit" ? "Try again" : "Upload"}
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

function IdleSurface({ dragOver }: { dragOver: boolean }) {
  return (
    <>
      {dragOver ? (
        <UploadSimple className="size-8 text-accent" weight="regular" aria-hidden />
      ) : (
        <ImageIcon className="size-8 text-muted" weight="regular" aria-hidden />
      )}
      <span className="mt-3 text-sm text-foreground">Drop a screenshot of your SR breakdown</span>
      <span className="mt-1 text-[11px] text-muted">or click to browse · paste also works</span>
    </>
  );
}

function ReadySurface({ previewUrl, file }: { previewUrl: string; file: File }) {
  return (
    <span className="flex h-full min-h-0 w-full max-w-sm flex-col items-center justify-center gap-3">
      <span className="flex min-h-0 w-full flex-1 items-center justify-center">
        {/* blob preview; next/image does not accept object URLs */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt=""
          className="max-h-full max-w-full rounded-[6px] border border-border object-contain"
        />
      </span>
      <span className="min-w-0 shrink-0">
        <span className="block truncate text-sm text-foreground">{file.name}</span>
        <span className="mt-1 block text-[11px] text-muted">{formatBytes(file.size)}</span>
      </span>
    </span>
  );
}

function ReadingSurface({ previewUrl, reduce }: { previewUrl: string | null; reduce: boolean }) {
  return (
    <span className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {previewUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain opacity-40"
          />
          <span className="absolute inset-0 bg-background/55" aria-hidden />
        </>
      ) : null}
      {!reduce ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={{ y: "-100%" }}
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-transparent via-accent/45 to-transparent" />
        </motion.span>
      ) : null}
      <span className="relative text-sm text-foreground" role="status" aria-live="polite">
        Reading screenshot…
      </span>
    </span>
  );
}

function ErrorSurface({
  id,
  kind,
  message,
  canRetrySameFile,
  onChooseAnother,
  onRetry,
}: {
  id: string;
  kind: ScanErrorKind;
  message: string;
  canRetrySameFile: boolean;
  onChooseAnother: () => void;
  onRetry: () => void;
}) {
  const tone = errorTone(kind);
  const iconClass =
    tone === "warning" ? "text-warning" : tone === "negative" ? "text-negative" : "text-muted";
  const copyClass =
    tone === "warning" ? "text-warning" : tone === "negative" ? "text-negative" : "text-muted";

  let icon: ReactNode;
  if (kind === "unreadable") {
    icon = <ImageBroken className={cn("size-8", iconClass)} weight="regular" aria-hidden />;
  } else if (kind === "read_failed") {
    icon = <WarningCircle className={cn("size-8", iconClass)} weight="regular" aria-hidden />;
  } else if (kind === "rate_limit") {
    icon = <Clock className={cn("size-8", iconClass)} weight="regular" aria-hidden />;
  } else if (kind === "unavailable") {
    icon = <CloudSlash className={cn("size-8", iconClass)} weight="regular" aria-hidden />;
  } else {
    icon = <Warning className={cn("size-8", iconClass)} weight="regular" aria-hidden />;
  }

  const showRetry = (kind === "read_failed" || kind === "unavailable") && canRetrySameFile;
  const showChoose =
    kind === "unreadable" || kind === "read_failed" || kind === "invalid_file";

  return (
    <span className="flex max-w-sm flex-col items-center gap-3">
      {icon}
      <span id={id} role="alert" className={cn("text-sm", copyClass)}>
        {message}
      </span>
      {showRetry || showChoose ? (
        <span className="flex flex-wrap items-center justify-center gap-2">
          {showRetry ? (
            <Button type="button" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {showChoose ? (
            <Button type="button" size="sm" variant="outline" onClick={onChooseAnother}>
              Choose another
            </Button>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
