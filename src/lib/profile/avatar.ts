export const DEFAULT_AVATAR_URL = "/profile/default-avatar.png";

export function avatarOrDefault(url: string | null | undefined): string {
  return url?.trim() ? url : DEFAULT_AVATAR_URL;
}
