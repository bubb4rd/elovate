import { NextResponse } from "next/server";
import { OcrHardFailure, parseSrBreakdown } from "@/lib/ocr";
import { rateLimitOk } from "@/lib/ocr/rate-limit";
import { detectDocumentText, visionCredentialsConfigured } from "@/lib/ocr/vision-client";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!visionCredentialsConfigured()) {
    return jsonError(503, "Scan unavailable right now");
  }

  if (!rateLimitOk(clientKey(request))) {
    return jsonError(429, "Too many scans — try again in a minute");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "No image uploaded");
  }

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return jsonError(400, "No image uploaded");
  }
  if (!image.type.startsWith("image/")) {
    return jsonError(400, "Use a PNG, JPEG, or WebP screenshot.");
  }
  if (image.size > MAX_BYTES) {
    return jsonError(400, "Keep the screenshot under 8 MB.");
  }

  let expectedFee: number | null = null;
  const feeRaw = form.get("expectedFee");
  if (typeof feeRaw === "string" && feeRaw.trim() !== "") {
    const n = Number(feeRaw);
    if (Number.isFinite(n)) expectedFee = Math.floor(n);
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await image.arrayBuffer());
  } catch {
    return jsonError(400, "No image uploaded");
  }

  let text: string;
  try {
    text = await detectDocumentText(bytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("credentials") || message.includes("GOOGLE_CLOUD")) {
      return jsonError(503, "Scan unavailable right now");
    }
    console.error("[ocr] vision failed", message);
    return jsonError(502, "Couldn’t read the screenshot. Try again.");
  }

  try {
    const parsed = parseSrBreakdown(text, { expectedFee });
    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof OcrHardFailure) {
      return jsonError(422, err.message);
    }
    console.error("[ocr] parse failed", err);
    return jsonError(422, "Couldn’t find an SR breakdown in this image");
  }
}
