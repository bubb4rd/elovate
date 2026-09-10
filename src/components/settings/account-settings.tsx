"use client";

import { Camera, CircleNotch } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { LinkedAccounts } from "@/components/profile/linked-accounts";
import { useSettingsActions } from "@/components/settings/settings-actions";
import { SettingsSection, SettingsStatus } from "@/components/settings/settings-section";
import { useSettingsPatch } from "@/components/settings/use-settings-patch";
import { Input } from "@/components/ui/input";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { validateAvatarFile } from "@/lib/profile/edit-storage";
import { uploadAccountAvatar, type AccountSettings } from "@/lib/profile/settings";
import { DISPLAY_NAME_MAX_LEN } from "@/lib/profile/slug";

function formatMemberSince(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function AccountSettingsPanel({ settings }: { settings: AccountSettings }) {
  const { saving, message, error, setMessage, setError, patch } = useSettingsPatch(
    settings.userId,
  );
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [savedDisplayName, setSavedDisplayName] = useState(settings.displayName);
  const dirty = displayName.trim() !== savedDisplayName;

  const [avatarUrl, setAvatarUrl] = useState(settings.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const onPickAvatar = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const validationError = validateAvatarFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      void (async () => {
        setAvatarBusy(true);
        setError(null);
        setMessage(null);
        const result = await uploadAccountAvatar(settings.userId, file);
        setAvatarBusy(false);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setAvatarUrl(result.avatarUrl);
        setMessage("Profile photo updated.");
      })();
    },
    [settings.userId, setError, setMessage],
  );

  const memberSince = settings.createdAt ? formatMemberSince(settings.createdAt) : null;

  return (
    <div className="space-y-6">
      <SettingsSection>
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-start sm:gap-6 md:p-5">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              aria-label="Change profile photo"
              className="group relative size-20 overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarOrDefault(avatarUrl)}
                alt=""
                className="size-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                {avatarBusy ? (
                  <CircleNotch weight="bold" className="size-5 animate-spin text-white" />
                ) : (
                  <Camera weight="bold" className="size-5 text-white" />
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              className="text-xs font-medium text-accent hover:underline disabled:opacity-60"
            >
              {avatarBusy ? "Uploading…" : "Change"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                onPickAvatar(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="account-display-name"
                className="text-xs font-medium tracking-wide text-muted uppercase"
              >
                Display name
              </label>
              <Input
                id="account-display-name"
                value={displayName}
                maxLength={DISPLAY_NAME_MAX_LEN}
                disabled={saving}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setMessage(null);
                  setError(null);
                }}
                className="max-w-xs"
              />
              <p className="text-sm text-muted">@{settings.slug}</p>
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4 text-sm">
              <div className="space-y-0.5">
                <dt className="text-xs tracking-wide text-muted uppercase">Member since</dt>
                <dd className="font-medium">{memberSince ?? "—"}</dd>
              </div>
              <div className="min-w-0 space-y-0.5">
                <dt className="text-xs tracking-wide text-muted uppercase">Email</dt>
                <dd className="truncate font-medium">{settings.email ?? "Not set"}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs tracking-wide text-muted uppercase">Profile</dt>
                <dd>
                  <Link
                    href={`/players/${settings.slug}`}
                    className="font-medium text-accent hover:underline"
                  >
                    View public profile
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </div>
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
