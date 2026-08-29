export const PROFILE_PAGE_THEME_IDS = [
  "gold",
  "silver",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
] as const;

export type ProfilePageThemeId = (typeof PROFILE_PAGE_THEME_IDS)[number];

/** Four-stop pastel gradient — periwinkle → lavender → pink → mauve. */
export const IRIDESCENT_GRADIENT =
  "linear-gradient(90deg, #CED9EF 0%, #CFC7FB 50%, #F5C7E8 75%, #E2C6EE 100%)";

export type ProfilePageTheme = {
  id: ProfilePageThemeId;
  label: string;
  accent: string;
  accentFg: string;
  glow: string;
  gradient: string;
};

export const PROFILE_PAGE_THEMES: readonly ProfilePageTheme[] = [
  {
    id: "gold",
    label: "Gold",
    accent: "#f2c81d",
    accentFg: "#201b12",
    glow: "#f2c81d",
    gradient: "linear-gradient(90deg, #fcf8c5 0%, #f2c81d 50%, #ca8d0b 100%)",
  },
  {
    id: "silver",
    label: "Silver",
    accent: "#c4ced9",
    accentFg: "#0a0a0b",
    glow: "#e4eaf0",
    gradient: "linear-gradient(90deg, #eef2f6 0%, #c4ced9 40%, #8f9aad 75%, #5c6b7a 100%)",
  },
  {
    id: "platinum",
    label: "Platinum",
    accent: "#1df2b2",
    accentFg: "#0a0a0b",
    glow: "#73fffa",
    gradient: "linear-gradient(90deg, #73fffa 0%, #1df2b2 50%, #0bca8a 100%)",
  },
  {
    id: "diamond",
    label: "Diamond",
    accent: "#7373ff",
    accentFg: "#f4f4f5",
    glow: "#7373ff",
    gradient: "linear-gradient(90deg, #7373ff 0%, #241df2 50%, #180bca 100%)",
  },
  {
    id: "crimson",
    label: "Crimson",
    accent: "#f21d21",
    accentFg: "#f4f4f5",
    glow: "#ff7375",
    gradient: "linear-gradient(90deg, #ff7375 0%, #f21d21 50%, #ca0b0e 100%)",
  },
  {
    id: "iridescent",
    label: "Iridescent",
    accent: "#E2C6EE",
    accentFg: "#0a0a0b",
    glow: "#F5C7E8",
    gradient: IRIDESCENT_GRADIENT,
  },
];

const THEME_BY_ID = new Map(PROFILE_PAGE_THEMES.map((theme) => [theme.id, theme]));

export function isProfilePageThemeId(value: string): value is ProfilePageThemeId {
  return THEME_BY_ID.has(value as ProfilePageThemeId);
}

export function profilePageTheme(id: ProfilePageThemeId): ProfilePageTheme {
  return THEME_BY_ID.get(id)!;
}

export const PAGE_THEME_STORAGE_PREFIX = "elovate:profile-theme:";

export function pageThemeStorageKey(slug: string): string {
  return `${PAGE_THEME_STORAGE_PREFIX}${slug}`;
}

export function readStoredPageTheme(slug: string): ProfilePageThemeId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(pageThemeStorageKey(slug));
    return raw && isProfilePageThemeId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredPageTheme(slug: string, id: ProfilePageThemeId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(pageThemeStorageKey(slug), id);
  } catch {
    /* ignore quota / private mode */
  }
}
