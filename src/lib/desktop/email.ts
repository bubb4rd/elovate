const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && normalized.length <= 254 && EMAIL_RE.test(normalized);
}
