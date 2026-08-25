import { ImageAnnotatorClient } from "@google-cloud/vision";

let client: ImageAnnotatorClient | null = null;

export function visionCredentialsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLOUD_CREDENTIALS?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  );
}

function credentialsFromEnv(): object | undefined {
  const json = process.env.GOOGLE_CLOUD_CREDENTIALS?.trim();
  if (!json) return undefined;
  try {
    return JSON.parse(json) as object;
  } catch {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS is not valid JSON");
  }
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
