"use client";

import { DiscordLogo } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyEmailOtp } from "@/lib/auth/email-otp";
import { oauthCallbackUrl, stashAuthNext } from "@/lib/auth/oauth-return";
import { safeNextPath } from "@/lib/auth/paths";
import { destinationAfterSession } from "@/lib/auth/post-auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

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
  const router = useRouter();
  const next = safeNextPath(nextPath, "/");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"email" | "otp" | "discord" | null>(null);
  const [error, setError] = useState<string | null>(ERROR_COPY[errorCode ?? ""] ?? null);

  async function sendCode() {
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
      setError(sendError.message);
      return;
    }
    setSent(true);
  }

  async function verifyCode() {
    const trimmed = email.trim();
    const token = code.trim();
    if (!token) {
      setError("Enter the 6-digit code.");
      return;
    }
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(ERROR_COPY.config);
      return;
    }
    setBusy("otp");
    setError(null);
    const { error: verifyError } = await verifyEmailOtp(supabase, trimmed, token);
    if (verifyError) {
      setBusy(null);
      setError(verifyError.message);
      return;
    }
    const path = await destinationAfterSession(supabase, next);
    setBusy(null);
    router.replace(path);
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

  return (
    <div className="mt-8 space-y-6">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void (sent ? verifyCode() : sendCode());
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
        {sent ? (
          <label className="block text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
            Code
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              disabled={busy != null}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1.5 tracking-[0.3em]"
              placeholder="000000"
              maxLength={6}
            />
          </label>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy != null}>
          {busy === "email" || busy === "otp"
            ? "Working…"
            : sent
              ? "Sign in"
              : "Send code"}
        </Button>
        {sent ? (
          <button
            type="button"
            className="w-full text-center text-[11px] text-muted hover:text-foreground"
            disabled={busy != null}
            onClick={() => {
              setSent(false);
              setCode("");
            }}
          >
            Use a different email
          </button>
        ) : null}
      </form>

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

      {error ? <p className="text-sm text-negative">{error}</p> : null}
    </div>
  );
}
