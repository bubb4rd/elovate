import {
  SESSION_SHARE_HEIGHT,
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

export async function captureShareCard(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  await preloadShareAssets();
  await waitForImages(node);
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, {
    pixelRatio: SHARE_CARD_PIXEL_RATIO,
    width: SESSION_SHARE_WIDTH,
    height: SESSION_SHARE_HEIGHT,
    canvasWidth: SESSION_SHARE_WIDTH * SHARE_CARD_PIXEL_RATIO,
    canvasHeight: SESSION_SHARE_HEIGHT * SHARE_CARD_PIXEL_RATIO,
    backgroundColor: "#0a0a0b",
    cacheBust: true,
    skipAutoScale: true,
    style: {
      transform: "none",
      transformOrigin: "top left",
    },
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
