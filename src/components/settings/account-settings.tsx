"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { LinkedAccounts } from "@/components/profile/linked-accounts";
import { useSettingsActions } from "@/components/settings/settings-actions";
import { SettingsRow, SettingsSection, SettingsStatus } from "@/components/settings/settings-section";
import { useSettingsPatch } from "@/components/settings/use-settings-patch";
import { Input } from "@/components/ui/input";
import { formatSnapshotTime } from "@/lib/format";
import type { AccountSettings } from "@/lib/profile/settings";
import { DISPLAY_NAME_MAX_LEN } from "@/lib/profile/slug";

export function AccountSettingsPanel({ settings }: { settings: AccountSettings }) {
  const { saving, message, error, setMessage, setError, patch } = useSettingsPatch(
    settings.userId,
  );
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [savedDisplayName, setSavedDisplayName] = useState(settings.displayName);
  const dirty = displayName.trim() !== savedDisplayName;

  const cancel = useCallback(() => {
    setDisplayName(savedDisplayName);
    setMessage(null);
    setError(null);
  }, [savedDisplayName, setMessage, setError]);

  const save = useCallback(() => {
    void (async () => {
      const ok = await patch({ displayName });
      if (!ok) return;
      setSavedDisplayName(displayName.trim());
      setDisplayName(displayName.trim());
      setMessage("Display name updated.");
    })();
  }, [displayName, patch, setMessage]);

  useSettingsActions({ dirty, saving, onCancel: cancel, onSave: save });

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsRow
          label="Display name"
          hint="Shown on your profile and in the nav."
        >
          <div className="w-full sm:w-44">
            <Input
              value={displayName}
              maxLength={DISPLAY_NAME_MAX_LEN}
              disabled={saving}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setMessage(null);
                setError(null);
              }}
            />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Username"
          hint="Your profile URL. Contact support to change."
        >
          <span className="text-sm font-medium text-muted">@{settings.slug}</span>
        </SettingsRow>
        <SettingsRow
          label="Email"
          hint="Used for sign-in and notifications."
        >
          <span className="text-sm text-muted">{settings.email ?? "Not set"}</span>
        </SettingsRow>
        <SettingsRow
          label="Member since"
        >
          <span className="text-sm text-muted">
            {settings.createdAt ? formatSnapshotTime(settings.createdAt) : "—"}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Profile"
        >
          <Link
            href={`/players/${settings.slug}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            View public profile
          </Link>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Linked accounts"
        description="Manage the accounts connected to your elovate profile."
      >
        <div className="px-4 py-4 md:px-5">
          <LinkedAccounts nextPath="/settings/account" surface="default" />
        </div>
      </SettingsSection>
      <SettingsStatus message={message} error={error} />
    </div>
  );
}
