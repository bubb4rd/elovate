/** Client-side slug helpers mirroring private.slugify + profiles_slug_format. */

export const SLUG_MAX_LEN = 24;
export const DISPLAY_NAME_MAX_LEN = 40;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  s = s.slice(0, SLUG_MAX_LEN);
  if (!s) return "player";
  return s;
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= SLUG_MAX_LEN && SLUG_RE.test(slug);
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name cannot be empty.";
  if (trimmed.length > DISPLAY_NAME_MAX_LEN) {
    return `Keep the name under ${DISPLAY_NAME_MAX_LEN} characters.`;
  }
  return null;
}

export function validateSlug(slug: string): string | null {
  if (!slug) return "Choose a username.";
  if (!isValidSlug(slug)) {
    return "Use lowercase letters, numbers, and hyphens only.";
  }
  return null;
}
