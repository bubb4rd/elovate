"use client";

import { Camera, CircleNotch, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ProfileHeaderPicker } from "@/components/profile/profile-header-picker";
import { ProfileThemePicker } from "@/components/profile/profile-theme-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateAvatarFile } from "@/lib/profile/edit-storage";
import { writeStoredEquippedHeader, type ProfileHeaderId } from "@/lib/profile/headers";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { saveProfileEdits } from "@/lib/profile/save";
import {
  writeStoredPageTheme,
  type ProfilePageThemeId,
} from "@/lib/profile/themes";
import { cn } from "@/lib/utils";
import { zIndex } from "@/lib/z-index";

export type ProfileEditDraft = {
  displayName: string;
  avatarUrl: string;
  equippedHeaderId: ProfileHeaderId;
  pageThemeId: ProfilePageThemeId;
};

export function ProfileEditModal({
  open,
  userId,
  slug,
  handle,
  ownedHeaderIds,
  draft,
  onSave,
  onClose,
}: {
  open: boolean;
  userId: string;
  slug: string;
  handle: string;
  ownedHeaderIds: readonly ProfileHeaderId[];
  draft: ProfileEditDraft;
  onSave: (saved: ProfileEditDraft) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [displayName, setDisplayName] = useState(draft.displayName);
  const [avatarUrl, setAvatarUrl] = useState(draft.avatarUrl);
  const [equippedHeaderId, setEquippedHeaderId] = useState(draft.equippedHeaderId);
  const [pageThemeId, setPageThemeId] = useState(draft.pageThemeId);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(draft.avatarUrl);

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.85 };

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset form when the dialog opens */
    setDisplayName(draft.displayName);
    setAvatarUrl(draft.avatarUrl);
    setPreviewUrl(draft.avatarUrl);
    setAvatarFile(null);
    setEquippedHeaderId(draft.equippedHeaderId);
    setPageThemeId(draft.pageThemeId);
    setAvatarError(null);
    setNameError(null);
    setSaving(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, draft.displayName, draft.avatarUrl, draft.equippedHeaderId, draft.pageThemeId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function onPickAvatar(file: File | undefined) {
    if (!file) return;
    const error = validateAvatarFile(file);
    if (error) {
      setAvatarError(error);
      return;
    }
    setAvatarError(null);
    try {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } catch {
      setAvatarError("Could not load that image.");
    }
  }

  async function handleSave() {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty.");
      return;
    }
    setNameError(null);
    setSaving(true);
    const result = await saveProfileEdits({
      userId,
      displayName: trimmed,
      equippedHeaderId,
      pageThemeId,
      avatarFile,
      avatarUrl,
    });
    if ("error" in result) {
      setAvatarError(result.error);
      setSaving(false);
      return;
    }
    writeStoredEquippedHeader(slug, equippedHeaderId);
    writeStoredPageTheme(slug, pageThemeId);
    const saved: ProfileEditDraft = {
      displayName: trimmed,
      avatarUrl: result.avatarUrl,
      equippedHeaderId,
      pageThemeId,
    };
    onSave(saved);
    setSaving(false);
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          key="profile-edit"
          className="fixed inset-0 flex items-end justify-center p-3 sm:items-center"
          style={{ zIndex: zIndex.modal }}
        >
          <motion.button
            type="button"
            aria-label="Close profile editor"
            disabled={saving}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!saving) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={spring}
            className="relative max-h-[min(90dvh,720px)] w-full max-w-3xl overflow-y-auto rounded-[6px] border border-white/12 bg-[#121214] p-4 text-zinc-100 shadow-[0_18px_50px_rgb(0_0_0/0.45)] sm:p-5"
          >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-sm font-medium tracking-wide text-zinc-300">
            Edit profile
          </h2>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Close"
            className="rounded-[4px] border border-white/12 p-1 text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-100 disabled:opacity-50"
          >
            <X weight="bold" className="size-3.5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "group relative size-20 shrink-0 overflow-hidden rounded-full ring-2 ring-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarOrDefault(previewUrl || avatarUrl)}
                alt=""
                className="size-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Camera weight="bold" className="size-5 text-white" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                void onPickAvatar(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div className="min-w-0 flex-1">
              <label htmlFor={`${titleId}-name`} className="text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
                Display name
              </label>
              <Input
                id={`${titleId}-name`}
                value={displayName}
                disabled={saving}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  if (nameError) setNameError(null);
                }}
                className="mt-1.5 border-white/12 bg-[#0a0a0b] text-zinc-100"
                autoComplete="off"
              />
              {nameError ? (
                <p className="mt-1 text-[11px] text-negative">{nameError}</p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-zinc-500">{handle}</p>
            </div>
          </div>
          {avatarError ? (
            <p className="text-[11px] text-negative">{avatarError}</p>
          ) : null}

          <div>
            <p className="mb-2 text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
              Page theme
            </p>
            <ProfileThemePicker
              selectedThemeId={pageThemeId}
              onSelect={setPageThemeId}
              disabled={saving}
            />
          </div>

          <div>
            <p className="mb-2 text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
              Header
            </p>
            <ProfileHeaderPicker
              ownedHeaderIds={ownedHeaderIds}
              equippedHeaderId={equippedHeaderId}
              onSelect={setEquippedHeaderId}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            className="flex-1 border-white/12 bg-transparent text-zinc-300 hover:bg-white/5"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            className="flex-1 gap-1.5"
            onClick={() => {
              void handleSave();
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {saving ? (
                <motion.span
                  key="spin"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex"
                >
                  <CircleNotch weight="bold" className="size-3.5 animate-spin" />
                </motion.span>
              ) : null}
            </AnimatePresence>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
