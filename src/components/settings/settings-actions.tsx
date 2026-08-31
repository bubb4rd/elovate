"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SettingsToolbar } from "@/components/settings/settings-section";

type SettingsActions = {
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

const SettingsActionsContext = createContext<{
  actions: SettingsActions | null;
  setActions: (next: SettingsActions | null) => void;
} | null>(null);

export function SettingsActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<SettingsActions | null>(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return (
    <SettingsActionsContext.Provider value={value}>{children}</SettingsActionsContext.Provider>
  );
}

/**
 * Register a panel's Cancel/Save toolbar actions with the settings chrome.
 *
 * Contract: `onSave` and `onCancel` MUST be `useCallback`-stable. They are
 * effect dependencies here, so passing fresh closures every render makes the
 * registration effect loop.
 */
export function useSettingsActions({
  dirty,
  saving,
  onCancel,
  onSave,
}: SettingsActions) {
  const ctx = useContext(SettingsActionsContext);
  if (!ctx) {
    throw new Error("useSettingsActions must be used within SettingsActionsProvider");
  }

  const { setActions } = ctx;
  useEffect(() => {
    setActions({ dirty, saving, onCancel, onSave });
    return () => setActions(null);
  }, [dirty, saving, onCancel, onSave, setActions]);
}

export function SettingsPageActions() {
  const ctx = useContext(SettingsActionsContext);
  const actions = ctx?.actions;

  // Panels that auto-save (Appearance, Privacy, Notifications) never register
  // actions — render nothing rather than a permanently-disabled toolbar.
  if (!actions) return null;

  return (
    <SettingsToolbar
      dirty={actions.dirty}
      saving={actions.saving}
      onCancel={actions.onCancel}
      onSave={actions.onSave}
    />
  );
}

export function SettingsChrome({ children }: { children: React.ReactNode }) {
  return (
    <SettingsActionsProvider>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        <div className="shrink-0 sm:pt-1">
          <SettingsPageActions />
        </div>
      </div>
      {children}
    </SettingsActionsProvider>
  );
}
