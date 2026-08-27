"use client";

import { DiscordLogo } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { oauthCallbackUrl, stashAuthNext } from "@/lib/auth/oauth-return";

type ProviderId = "email" | "discord";

function providerOf(identity: { provider: string }): ProviderId | null {
  if (identity.provider === "email") return "email";
  if (identity.provider === "discord") return "discord";
  return null;
}

function identitiesFromUser(identities: { identity_id: string; provider: string }[]) {
  return identities
    .map((identity) => {
      const provider = providerOf(identity);
      if (!provider) return null;
      return { id: identity.identity_id, provider };
    })
    .filter((identity): identity is { id: string; provider: ProviderId } => identity != null);
}

export function LinkedAccounts({
  nextPath,
  disabled,
  surface = "modal",
}: {
  nextPath: string;
  disabled?: boolean;
  surface?: "modal" | "default";
}) {
  const router = useRouter();
  const [identities, setIdentities] = useState<{ id: string; provider: ProviderId }[]>([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadIdentities() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const { data, error: identitiesError } = await supabase.auth.getUserIdentities();
    if (identitiesError || !data) return;
    setIdentities(identitiesFromUser(data.identities));
  }

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    void supabase.auth.getUserIdentities().then(({ data, error: identitiesError }) => {
      if (cancelled || identitiesError || !data) return;
      setIdentities(identitiesFromUser(data.identities));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasEmail = identities.some((identity) => identity.provider === "email");
  const hasDiscord = identities.some((identity) => identity.provider === "discord");
  const canUnlink = identities.length >= 2;
  const isModal = surface === "modal";
  const labelClass = isModal
    ? "mb-2 text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase"
    : "sr-only";
  const rowClass = isModal
    ? "flex items-center justify-between gap-3 rounded-[6px] border border-white/12 px-3 py-2"
    : "flex items-center justify-between gap-3 rounded-[6px] border border-border bg-background px-3 py-2.5";
  const textClass = isModal ? "text-zinc-300" : "text-foreground";
  const mutedClass = isModal ? "text-zinc-500" : "text-muted";
  const linkBtnClass = isModal
    ? "text-[11px] text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
    : "text-[11px] text-muted hover:text-foreground disabled:opacity-50";
  const inputClass = isModal
    ? "border-white/12 bg-[#0a0a0b] text-zinc-100"
    : undefined;
  const outlineBtnClass = isModal
    ? "h-7 border-white/12 bg-transparent text-zinc-300 hover:bg-white/5"
    : undefined;

  async function linkDiscord() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setBusy("discord");
    setError(null);
    const origin = window.location.origin;
    stashAuthNext(nextPath);
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "discord",
      options: {
        redirectTo: oauthCallbackUrl(origin),
      },
    });
    if (linkError) {
      setBusy(null);
      setError(
        linkError.message.toLowerCase().includes("already")
          ? "That Discord account is already used by another user."
          : linkError.message,
      );
    }
  }

  async function sendEmailLink() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter an email address.");
      return;
    }
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setBusy("email");
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ email: trimmed });
    setBusy(null);
    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes("already")
          ? "That email is already used by another user."
          : updateError.message,
      );
      return;
    }
    setSent(true);
    setMessage("Check your inbox for a 6-digit code.");
  }

  async function verifyEmailLink() {
    const trimmed = email.trim();
    const token = code.trim();
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setBusy("otp");
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmed,
      token,
      type: "email_change",
    });
    setBusy(null);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setSent(false);
    setCode("");
    setMessage("Email linked.");
    await loadIdentities();
    router.refresh();
  }

  async function unlink(provider: ProviderId) {
    if (!canUnlink) return;
    const identity = identities.find((item) => item.provider === provider);
    const supabase = createBrowserSupabaseClient();
    if (!identity || !supabase) return;
    setBusy(`unlink-${provider}`);
    setError(null);
    const { data } = await supabase.auth.getUserIdentities();
    const raw = data?.identities.find((item) => item.identity_id === identity.id);
    if (!raw) {
      setBusy(null);
      return;
    }
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(raw);
    setBusy(null);
    if (unlinkError) {
      setError(unlinkError.message);
      return;
    }
    await loadIdentities();
    router.refresh();
  }

  return (
    <div>
      <p className={labelClass}>Linked accounts</p>
      <ul className="space-y-2 text-sm">
        <li className={rowClass}>
          <span className={textClass}>Email</span>
          {hasEmail ? (
            <span className="flex items-center gap-2">
              <span className={`text-[11px] ${mutedClass}`}>Linked</span>
              {canUnlink ? (
                <button
                  type="button"
                  disabled={disabled || busy != null}
                  className={linkBtnClass}
                  onClick={() => {
                    void unlink("email");
                  }}
                >
                  Unlink
                </button>
              ) : null}
            </span>
          ) : (
            <span className={`text-[11px] ${mutedClass}`}>Not linked</span>
          )}
        </li>
        <li className={rowClass}>
          <span className={`inline-flex items-center gap-2 ${textClass}`}>
            <DiscordLogo weight="fill" className="size-3.5" />
            Discord
          </span>
          {hasDiscord ? (
            <span className="flex items-center gap-2">
              <span className={`text-[11px] ${mutedClass}`}>Linked</span>
              {canUnlink ? (
                <button
                  type="button"
                  disabled={disabled || busy != null}
                  className={linkBtnClass}
                  onClick={() => {
                    void unlink("discord");
                  }}
                >
                  Unlink
                </button>
              ) : null}
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || busy != null}
              className={outlineBtnClass}
              onClick={() => {
                void linkDiscord();
              }}
            >
              {busy === "discord" ? "Redirecting…" : "Link Discord"}
            </Button>
          )}
        </li>
      </ul>

      {!hasEmail ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void (sent ? verifyEmailLink() : sendEmailLink());
          }}
        >
          <Input
            type="email"
            value={email}
            disabled={disabled || busy != null}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Add an email"
            className={inputClass}
          />
          {sent ? (
            <Input
              inputMode="numeric"
              value={code}
              disabled={disabled || busy != null}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              maxLength={6}
              className={inputClass ? `${inputClass} tracking-[0.3em]` : "tracking-[0.3em]"}
            />
          ) : null}
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={disabled || busy != null}
            className={outlineBtnClass}
          >
            {sent ? "Verify email" : "Send code"}
          </Button>
        </form>
      ) : null}

      {message ? <p className={`mt-2 text-[11px] ${mutedClass}`}>{message}</p> : null}
      {error ? <p className="mt-2 text-[11px] text-negative">{error}</p> : null}
    </div>
  );
}
