const DISPLAY_NAME_PREFIX = "elovate:profile-display-name:";
const AVATAR_PREFIX = "elovate:profile-avatar:";

export function displayNameStorageKey(slug: string): string {
  return `${DISPLAY_NAME_PREFIX}${slug}`;
}

export function avatarStorageKey(slug: string): string {
  return `${AVATAR_PREFIX}${slug}`;
}

export function readStoredDisplayName(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(displayNameStorageKey(slug));
    return raw?.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredDisplayName(slug: string, displayName: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(displayNameStorageKey(slug), displayName.trim());
  } catch {
    /* ignore */
  }
}

export function readStoredAvatar(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(avatarStorageKey(slug));
    return raw?.startsWith("data:") ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredAvatar(slug: string, dataUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(avatarStorageKey(slug), dataUrl);
  } catch {
    /* ignore */
  }
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function validateAvatarFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Use a PNG, JPEG, or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "Keep the image under 2 MB.";
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image."));
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}
