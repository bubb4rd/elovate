"use client";

import { DiscordLogo, EnvelopeSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { useAuthCompletionWatcher } from "@/components/auth/use-auth-completion-watcher";
import { useActionCooldown } from "@/components/use-action-cooldown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_ACTION_COOLDOWN_SEC,
  isRateLimitMessage,
  withCooldownLabel,
} from "@/lib/action-cooldown";
import { oauthCallbackUrl, stashAuthNext } from "@/lib/auth/oauth-return";
import { safeNextPath } from "@/lib/auth/paths";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const ERROR_COPY: Record<string, string> = {
  auth: "Could not complete sign-in. Try again.",
  config: "Sign-in is not configured on this server.",
};

export function LoginForm({
  nextPath,
  errorCode,
}: {
  nextPath?: string;
  errorCode?: string;
}) {
  const next = safeNextPath(nextPath, "/");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"email" | "discord" | null>(null);
  const [error, setError] = useState<string | null>(ERROR_COPY[errorCode ?? ""] ?? null);
  const completionPhase = useAuthCompletionWatcher({ enabled: sent, next });
  const cooldown = useActionCooldown();

  async function sendLink() {
    if (cooldown.cooling) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter an email address.");
      return;
    }
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(ERROR_COPY.config);
      return;
    }
    setBusy("email");
    setError(null);
    stashAuthNext(next);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: oauthCallbackUrl(window.location.origin),
      },
    });
    setBusy(null);
    if (sendError) {
      if (isRateLimitMessage(sendError.message)) {
        cooldown.startFromError(sendError.message);
        return;
      }
      setError(sendError.message);
      return;
    }
    cooldown.start(DEFAULT_ACTION_COOLDOWN_SEC);
    setSent(true);
  }

  async function signInDiscord() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(ERROR_COPY.config);
      return;
    }
    setBusy("discord");
    setError(null);
    const origin = window.location.origin;
    stashAuthNext(next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: oauthCallbackUrl(origin),
      },
    });
    if (oauthError) {
      setBusy(null);
      setError(oauthError.message);
    }
  }

  const emailBusy = busy === "email";
  const emailDisabled = busy != null || cooldown.cooling;
  const sendLabel = withCooldownLabel(
    sent ? "Resend link" : "Email me a link",
    cooldown.remaining,
  );

  return (
    <div className="mt-8 space-y-6">
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-[6px] border border-border bg-surface-elevated px-4 py-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background",
                  completionPhase === "waiting" && "text-accent",
                )}
              >
                {completionPhase === "completing" ? (
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
                    aria-hidden
                  />
                ) : (
                  <EnvelopeSimple weight="duotone" className="size-4" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {completionPhase === "completing"
                    ? "Signing you in…"
                    : "Check your email"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {completionPhase === "completing" ? (
                    "Link confirmed. Finishing sign-in in this tab."
                  ) : (
                    <>
                      We sent a sign-in link to{" "}
                      <span className="text-foreground">{email.trim()}</span>. Open it in any
                      tab to continue — this page will update automatically.
                    </>
                  )}
                </p>
                {completionPhase === "waiting" ? (
                  <p className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                    <span className="live-dot" aria-hidden />
                    Waiting for link confirmation
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          {completionPhase === "waiting" ? (
            <>
              <Button
                type="button"
                className="w-full"
                disabled={emailDisabled}
                onClick={() => {
                  void sendLink();
                }}
              >
                {emailBusy ? "Working…" : sendLabel}
              </Button>
              <button
                type="button"
                className="w-full text-center text-[11px] text-muted hover:text-foreground"
                disabled={busy != null}
                onClick={() => {
                  setSent(false);
                  setError(null);
                }}
              >
                Use a different email
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendLink();
          }}
        >
          <label className="block text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
            Email
            <Input
              type="email"
              autoComplete="email"
              value={email}
              disabled={busy != null}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5"
              placeholder="you@email.com"
            />
          </label>
          <Button type="submit" className="w-full" disabled={emailDisabled}>
            {emailBusy ? "Working…" : sendLabel}
          </Button>
        </form>
      )}

      {!sent || completionPhase === "waiting" ? (
        <>
          <div className="flex items-center gap-3 text-[10px] tracking-[0.16em] text-muted uppercase">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={busy != null}
            onClick={() => {
              void signInDiscord();
            }}
          >
            <DiscordLogo weight="fill" className="size-4" />
            {busy === "discord" ? "Redirecting…" : "Continue with Discord"}
          </Button>
        </>
      ) : null}

      {error ? <p className="text-sm text-negative">{error}</p> : null}
    </div>
  );
}
