import { ImageAnnotatorClient } from "@google-cloud/vision";

let client: ImageAnnotatorClient | null = null;

export function visionCredentialsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLOUD_CREDENTIALS?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  );
}

/**
 * Parse service-account JSON from env. Dotenv (and Next) turn `\n` in
 * double-quoted values into real newlines, which breaks JSON.parse on the
 * private_key PEM — repair that case.
 */
export function parseServiceAccountJson(raw: string): object {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as object;
  } catch {
    // Single-line JSON whose only newlines are dotenv-expanded PEM breaks.
    const repaired = trimmed.replace(/\r?\n/g, "\\n");
    try {
      return JSON.parse(repaired) as object;
    } catch {
      throw new Error("GOOGLE_CLOUD_CREDENTIALS is not valid JSON");
    }
  }
}

function credentialsFromEnv(): object | undefined {
  const json = process.env.GOOGLE_CLOUD_CREDENTIALS?.trim();
  if (!json) return undefined;
  return parseServiceAccountJson(json);
}

export function getVisionClient(): ImageAnnotatorClient {
  if (client) return client;
  if (!visionCredentialsConfigured()) {
    throw new Error("Vision credentials missing");
  }
  const credentials = credentialsFromEnv();
  client = credentials
    ? new ImageAnnotatorClient({ credentials })
    : new ImageAnnotatorClient();
  return client;
}

/** Reset cached client (tests). */
export function resetVisionClient(): void {
  client = null;
}

export async function detectDocumentText(imageBytes: Buffer): Promise<string> {
  const visionClient = getVisionClient();
  const [result] = await visionClient.documentTextDetection({
    image: { content: imageBytes.toString("base64") },
  });
  const text = result.fullTextAnnotation?.text ?? result.textAnnotations?.[0]?.description ?? "";
  return text;
}
