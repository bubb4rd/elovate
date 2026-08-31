"use client";

import { useState } from "react";
import {
  SettingsRow,
  SettingsSection,
  SettingsStatus,
  SettingsToggle,
} from "@/components/settings/settings-section";
import { useSettingsPatch } from "@/components/settings/use-settings-patch";
import type { AccountSettings } from "@/lib/profile/settings";

export function PrivacySettings({ settings }: { settings: AccountSettings }) {
  const { saving, message, error, setMessage, patch } = useSettingsPatch(settings.userId);
  const [isPrivate, setIsPrivate] = useState(settings.isPrivate);

  async function togglePrivate(next: boolean) {
    const previous = isPrivate;
    setIsPrivate(next);
    const ok = await patch({ isPrivate: next });
    if (!ok) {
      setIsPrivate(previous);
      return;
    }
    setMessage("Privacy updated.");
  }

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsRow
          label="Private profile"
          hint="When on, only you can view your profile page."
        >
          <SettingsToggle
            label="Private profile"
            checked={isPrivate}
            disabled={saving}
            onChange={(next) => {
              void togglePrivate(next);
            }}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsStatus message={message} error={error} />
    </div>
  );
}
