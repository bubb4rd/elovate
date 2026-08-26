/** Hosting (Netlify Edge) 413s multipart bodies around 4.5–5 MB. Stay under that. */
export const POST_MAX_BYTES = 3 * 1024 * 1024;
export const PICK_MAX_BYTES = 8 * 1024 * 1024;
export const MAX_EDGE_PX = 1920;

export function fitWithinMaxEdge(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Couldn’t prepare the screenshot. Try again."));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

function jpegName(original: string): string {
  const base = original.replace(/\.[^.]+$/, "").trim() || "screenshot";
  return `${base}.jpg`;
}

/**
 * Downscale / JPEG-encode oversized screenshots so the POST fits Netlify’s body limit.
 * Small files are sent unchanged.
 */
export async function prepareUploadImage(file: File): Promise<File> {
  if (file.size <= POST_MAX_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Couldn’t read that image. Try a PNG or JPEG screenshot.");
  }

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn’t prepare the screenshot. Try again.");

    const edges = [MAX_EDGE_PX, 1280, 1024];
    const qualities = [0.82, 0.72, 0.6, 0.5];

    for (const maxEdge of edges) {
      const size = fitWithinMaxEdge(bitmap.width, bitmap.height, maxEdge);
      canvas.width = size.width;
      canvas.height = size.height;
      ctx.drawImage(bitmap, 0, 0, size.width, size.height);
      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, "image/jpeg", quality);
        if (blob.size <= POST_MAX_BYTES) {
          return new File([blob], jpegName(file.name), { type: "image/jpeg" });
        }
      }
    }

    throw new Error("Keep the screenshot under 3 MB, or crop it first.");
  } finally {
    bitmap.close();
  }
}
