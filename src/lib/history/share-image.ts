import {
  SESSION_SHARE_HEIGHT,
  SESSION_SHARE_RADIUS,
  SESSION_SHARE_WIDTH,
} from "./share";

export const SHARE_CARD_PIXEL_RATIO = 3;

export const SHARE_ASSET_URLS = [
  "/share/bg.png",
  "/share/mark.svg",
  "/share/peak.svg",
] as const;

function waitForImages(root: HTMLElement): Promise<void> {
  const images = [...root.querySelectorAll("img")];
  return Promise.all(
    images.map((img) => {
      if (img.complete) return img.decode().catch(() => undefined);
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  ).then(() => undefined);
}

function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function preloadShareAssets(): Promise<void> {
  return Promise.all(SHARE_ASSET_URLS.map(preload)).then(() => undefined);
}

function clipCanvasToRadius(source: HTMLCanvasElement, radiusPx: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not export session image.");

  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, out.width, out.height, radiusPx);
  } else {
    const r = Math.min(radiusPx, out.width / 2, out.height / 2);
    ctx.moveTo(r, 0);
    ctx.lineTo(out.width - r, 0);
    ctx.quadraticCurveTo(out.width, 0, out.width, r);
    ctx.lineTo(out.width, out.height - r);
    ctx.quadraticCurveTo(out.width, out.height, out.width - r, out.height);
    ctx.lineTo(r, out.height);
    ctx.quadraticCurveTo(0, out.height, 0, out.height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
  }
  ctx.clip();
  ctx.drawImage(source, 0, 0);
  return out;
}

export async function captureShareCard(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  await preloadShareAssets();
  await waitForImages(node);
  const { toCanvas } = await import("html-to-image");
  const source = await toCanvas(node, {
    pixelRatio: SHARE_CARD_PIXEL_RATIO,
    width: SESSION_SHARE_WIDTH,
    height: SESSION_SHARE_HEIGHT,
    canvasWidth: SESSION_SHARE_WIDTH * SHARE_CARD_PIXEL_RATIO,
    canvasHeight: SESSION_SHARE_HEIGHT * SHARE_CARD_PIXEL_RATIO,
    cacheBust: true,
    skipAutoScale: true,
    style: {
      transform: "none",
      transformOrigin: "top left",
      borderRadius: `${SESSION_SHARE_RADIUS}px`,
      overflow: "hidden",
    },
  });

  const clipped = clipCanvasToRadius(
    source,
    SESSION_SHARE_RADIUS * SHARE_CARD_PIXEL_RATIO,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    clipped.toBlob((next) => resolve(next), "image/png");
  });
  if (!blob) throw new Error("Could not export session image.");
  return blob;
}

export function downloadShareBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyShareBlob(blob: Blob) {
  const item = new ClipboardItem({
    "image/png": blob,
  });
  await navigator.clipboard.write([item]);
}

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }
  const probe = new File([new Blob(["x"], { type: "image/png" })], "x.png", {
    type: "image/png",
  });
  try {
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function shareShareBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
    throw new Error("Sharing images is not supported here.");
  }
  await navigator.share({ files: [file], title: "elovate session" });
}
