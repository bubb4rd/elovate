"use client";

import { profilePageTheme, type ProfilePageThemeId } from "@/lib/profile/themes";
import type { CSSProperties, ReactNode } from "react";

export function ProfileThemeProvider({
  themeId,
  children,
}: {
  themeId: ProfilePageThemeId;
  children: ReactNode;
}) {
  const theme = profilePageTheme(themeId);

  return (
    <div
      className="profile-themed contents"
      style={
        {
          "--profile-accent": theme.accent,
          "--profile-accent-fg": theme.accentFg,
          "--profile-glow": theme.glow,
          "--profile-gradient": theme.gradient,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
