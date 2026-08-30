export function reportError(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : undefined;

  if (digest) {
    console.error(`[ops] ${scope}`, message, digest);
    return;
  }

  console.error(`[ops] ${scope}`, message);
}
