"use client";

import { useState } from "react";
import { ProfileThemePicker } from "@/components/profile/profile-theme-picker";
import { ProfileThemeProvider } from "@/components/profile/profile-theme-provider";
import { SettingsSection, SettingsStatus } from "@/components/settings/settings-section";
import { useSettingsPatch } from "@/components/settings/use-settings-patch";
import type { AccountSettings } from "@/lib/profile/settings";
import {
  writeStoredPageTheme,
  type ProfilePageThemeId,
} from "@/lib/profile/themes";

export function AppearanceSettings({ settings }: { settings: AccountSettings }) {
  const { saving, message, error, setMessage, patch } = useSettingsPatch(settings.userId);
  const [pageThemeId, setPageThemeId] = useState<ProfilePageThemeId>(settings.pageThemeId);

  async function selectPageTheme(next: ProfilePageThemeId) {
    const previous = pageThemeId;
    setPageThemeId(next);
    writeStoredPageTheme(settings.slug, next);
    const ok = await patch({ pageThemeId: next });
    if (!ok) {
      setPageThemeId(previous);
      writeStoredPageTheme(settings.slug, previous);
      return;
    }
    setMessage("Profile theme updated.");
  }

  return (
    <ProfileThemeProvider themeId={pageThemeId}>
      <div className="space-y-6">
        <SettingsSection>
          <div className="px-4 py-4 md:px-5">
            <ProfileThemePicker
              selectedThemeId={pageThemeId}
              onSelect={(next) => {
                void selectPageTheme(next);
              }}
              disabled={saving}
            />
          </div>
        </SettingsSection>
        <SettingsStatus message={message} error={error} />
      </div>
    </ProfileThemeProvider>
  );
}
