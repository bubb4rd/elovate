"use client";

import { DiscordLogo, EnvelopeSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
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
import { destinationAfterSession } from "@/lib/auth/post-auth";
import { safeNextPath } from "@/lib/auth/paths";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const ERROR_COPY: Record<string, string> = {
  auth: "Could not complete sign-in. Try again.",
  device:
    "That email link is outdated. Request a new one below, then open the link or enter the code on this phone.",
  config: "Sign-in is not configured on this server.",
};

export function LoginForm({
  nextPath,
  errorCode,
}: {
  nextPath?: string;
  errorCode?: string;
}) {
  const router = useRouter();
  const next = safeNextPath(nextPath, "/");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"email" | "otp" | "discord" | null>(null);
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
    setOtp("");
    setSent(true);
  }

  async function verifyOtpCode() {
    const trimmedEmail = email.trim();
    const token = otp.replace(/\s+/g, "");
    if (!trimmedEmail) {
      setError("Enter an email address.");
      return;
    }
    if (!token) {
      setError("Enter the code from your email.");
      return;
    }
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(ERROR_COPY.config);
      return;
    }
    setBusy("otp");
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token,
      type: "email",
    });
    if (verifyError) {
      setBusy(null);
      setError(verifyError.message);
      return;
    }
    const destination = await destinationAfterSession(supabase, next);
    router.replace(`/auth/complete?next=${encodeURIComponent(destination)}`);
    router.refresh();
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
  const otpBusy = busy === "otp";
  const emailDisabled = busy != null || cooldown.cooling;
  const sendLabel = withCooldownLabel(
    sent ? "Resend email" : "Email me a link",
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
                      We sent a link and code to{" "}
                      <span className="text-foreground">{email.trim()}</span>. Open the
                      link on any device, or enter the code here.
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
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void verifyOtpCode();
                }}
              >
                <label className="block text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
                  Code from email
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    disabled={busy != null}
                    onChange={(event) => setOtp(event.target.value)}
                    className="mt-1.5 tracking-[0.2em]"
                    placeholder="12345678"
                    maxLength={12}
                  />
                </label>
                <Button type="submit" className="w-full" disabled={busy != null}>
                  {otpBusy ? "Verifying…" : "Verify code"}
                </Button>
              </form>
              <Button
                type="button"
                variant="outline"
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
                  setOtp("");
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
