"use client";

import {
  CheckCircle,
  DiscordLogo,
  EnvelopeSimple,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useActionCooldown } from "@/components/use-action-cooldown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_ACTION_COOLDOWN_SEC,
  isRateLimitMessage,
  withCooldownLabel,
} from "@/lib/action-cooldown";
import { oauthCallbackUrl, stashAuthNext } from "@/lib/auth/oauth-return";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ProviderId = "email" | "discord";

type LinkedIdentity = {
  id: string;
  provider: ProviderId;
  email: string | null;
  username: string | null;
};

function providerOf(identity: { provider: string }): LinkedIdentity["provider"] | null {
  if (identity.provider === "email") return "email";
  if (identity.provider === "discord") return "discord";
  return null;
}

function identitiesFromUser(
  identities: {
    identity_id: string;
    provider: string;
    identity_data?: {
      email?: string;
      full_name?: string;
      preferred_username?: string;
      user_name?: string;
    };
  }[],
): LinkedIdentity[] {
  return identities
    .map((identity) => {
      const provider = providerOf(identity);

      if (!provider) return null;

      return {
        id: identity.identity_id,
        provider,
        email: identity.identity_data?.email ?? null,
        username:
          identity.identity_data?.preferred_username ??
          identity.identity_data?.user_name ??
          identity.identity_data?.full_name ??
          null,
      };
    })
    .filter((identity): identity is LinkedIdentity => identity !== null);
}

type LinkedAccountsProps = {
  nextPath: string;
  disabled?: boolean;
  surface?: "modal" | "default";
};

export function LinkedAccounts({
  nextPath,
  disabled,
  surface = "modal",
}: LinkedAccountsProps) {
  const router = useRouter();
  const cooldown = useActionCooldown();

  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isModal = surface === "modal";

  const hasEmail = identities.some((identity) => identity.provider === "email");
  const hasDiscord = identities.some((identity) => identity.provider === "discord");

  const emailIdentity = identities.find((identity) => identity.provider === "email");
  const discordIdentity = identities.find((identity) => identity.provider === "discord");

  // Only Supabase auth identities count toward login safety.
  const canUnlinkAuthIdentity = identities.length >= 2;

  const theme = useMemo(() => {
    if (isModal) {
      return {
        card: "border-white/10 bg-white/[0.025]",
        cardMuted: "border-white/[0.07] bg-white/[0.015]",
        title: "text-zinc-100",
        detail: "text-zinc-500",
        divider: "border-white/10",
        input: "border-white/12 bg-[#0a0a0b] text-zinc-100",
        button:
          "border-white/12 bg-transparent text-zinc-200 hover:bg-white/[0.06] hover:text-white",
      };
    }

    return {
      card: "border-border bg-background",
      cardMuted: "border-border bg-muted/20",
      title: "text-foreground",
      detail: "text-muted",
      divider: "border-border",
      input: "",
      button: "",
    };
  }, [isModal]);

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

  async function linkDiscord() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    setBusy("discord");
    setError(null);
    setMessage(null);

    stashAuthNext(nextPath);

    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "discord",
      options: {
        redirectTo: oauthCallbackUrl(window.location.origin),
      },
    });

    if (linkError) {
      setBusy(null);

      setError(
        linkError.message.toLowerCase().includes("already")
          ? "That Discord account is already connected to another user."
          : linkError.message,
      );
    }
  }

  async function sendEmailLink() {
    if (cooldown.cooling) return;

    const trimmed = email.trim();

    if (!trimmed) {
      setError("Enter an email address.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    setBusy("email");
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase.auth.updateUser({
      email: trimmed,
    });

    setBusy(null);

    if (updateError) {
      if (isRateLimitMessage(updateError.message)) {
        cooldown.startFromError(updateError.message);
        return;
      }

      setError(
        updateError.message.toLowerCase().includes("already")
          ? "That email address is already connected to another account."
          : updateError.message,
      );
      return;
    }

    cooldown.start(DEFAULT_ACTION_COOLDOWN_SEC);
    setSent(true);
    setMessage("We sent a 6-digit confirmation code to that email address.");
  }

  async function verifyEmailLink() {
    const trimmed = email.trim();
    const token = code.trim();

    if (token.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    setBusy("otp");
    setError(null);
    setMessage(null);

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
    setMessage("Your email address has been linked.");

    await loadIdentities();
    router.refresh();
  }

  async function unlink(provider: LinkedIdentity["provider"]) {
    if (!canUnlinkAuthIdentity) {
      setError("Connect another sign-in method before removing this one.");
      return;
    }

    const identity = identities.find((item) => item.provider === provider);
    const supabase = createBrowserSupabaseClient();

    if (!identity || !supabase) return;

    setBusy(`unlink-${provider}`);
    setError(null);
    setMessage(null);

    const { data } = await supabase.auth.getUserIdentities();

    const rawIdentity = data?.identities.find(
      (item) => item.identity_id === identity.id,
    );

    if (!rawIdentity) {
      setBusy(null);
      return;
    }

    const { error: unlinkError } = await supabase.auth.unlinkIdentity(rawIdentity);

    setBusy(null);

    if (unlinkError) {
      setError(unlinkError.message);
      return;
    }

    setMessage(
      `${provider === "discord" ? "Discord" : "Email"} account disconnected.`,
    );

    await loadIdentities();
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <AccountCard
        icon={
          <div className="grid size-10 place-items-center rounded-xl bg-red-500/10 text-red-400">
            <EnvelopeSimple weight="fill" className="size-5" />
          </div>
        }
        title="Email"
        detail={
          hasEmail
            ? emailIdentity?.email ?? "Email address connected"
            : "Use email to sign in and receive account updates."
        }
        connected={hasEmail}
        theme={theme}
        action={
          hasEmail ? (
            canUnlinkAuthIdentity ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || busy !== null}
                className={theme.button}
                onClick={() => {
                  void unlink("email");
                }}
              >
                {busy === "unlink-email" ? "Removing…" : "Unlink"}
              </Button>
            ) : (
              <span className={`text-xs ${theme.detail}`}>Primary sign-in</span>
            )
          ) : (
            <span className={`text-xs ${theme.detail}`}>Not connected</span>
          )
        }
      />

      {!hasEmail ? (
        <form
          className={`rounded-xl border p-3 ${theme.cardMuted}`}
          onSubmit={(event) => {
            event.preventDefault();
            void (sent ? verifyEmailLink() : sendEmailLink());
          }}
        >
          <div className="space-y-2.5">
            <Input
              type="email"
              value={email}
              disabled={disabled || busy !== null}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              className={theme.input}
            />

            {sent ? (
              <Input
                inputMode="numeric"
                value={code}
                disabled={disabled || busy !== null}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                placeholder="6-digit code"
                maxLength={6}
                className={
                  theme.input
                    ? `${theme.input} tracking-[0.3em]`
                    : "tracking-[0.3em]"
                }
              />
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={
                  disabled ||
                  busy !== null ||
                  (!sent && cooldown.cooling)
                }
                className={theme.button}
              >
                {busy === "email" || busy === "otp"
                  ? "Working…"
                  : sent
                    ? "Verify email"
                    : withCooldownLabel("Send code", cooldown.remaining)}
              </Button>

              {sent ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled || busy !== null || cooldown.cooling}
                  onClick={() => {
                    void sendEmailLink();
                  }}
                >
                  {withCooldownLabel("Resend code", cooldown.remaining)}
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      ) : null}

      <AccountCard
        icon={
          <div className="grid size-10 place-items-center rounded-xl bg-[#5865F2]/15 text-[#7b86ff]">
            <DiscordLogo weight="fill" className="size-5" />
          </div>
        }
        title="Discord"
        detail={
          hasDiscord
            ? discordIdentity?.username
              ? `Connected as ${discordIdentity.username}`
              : "Discord account connected"
            : "Connect Discord for identity verification and community features."
        }
        connected={hasDiscord}
        theme={theme}
        action={
          hasDiscord ? (
            canUnlinkAuthIdentity ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || busy !== null}
                className={theme.button}
                onClick={() => {
                  void unlink("discord");
                }}
              >
                {busy === "unlink-discord" ? "Removing…" : "Unlink"}
              </Button>
            ) : (
              <span className={`text-xs ${theme.detail}`}>Primary sign-in</span>
            )
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || busy !== null}
              className={theme.button}
              onClick={() => {
                void linkDiscord();
              }}
            >
              <DiscordLogo weight="fill" className="mr-1.5 size-3.5" />
              {busy === "discord" ? "Redirecting…" : "Connect"}
            </Button>
          )
        }
      />

      {message ? (
        <p className={`flex items-center gap-1.5 text-xs ${theme.detail}`}>
          <CheckCircle weight="fill" className="size-3.5 text-emerald-400" />
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-negative">
          <WarningCircle weight="fill" className="size-3.5" />
          {error}
        </p>
      ) : null}

      <div
        className={`flex items-start gap-2 border-t pt-3 text-xs ${theme.divider} ${theme.detail}`}
      >
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Keep at least one sign-in method connected so you do not lose access
          to your account.
        </p>
      </div>
    </div>
  );
}

function AccountCard({
  icon,
  title,
  detail,
  connected,
  action,
  theme,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  connected: boolean;
  action: React.ReactNode;
  theme: {
    card: string;
    title: string;
    detail: string;
  };
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${theme.card}`}
    >
      {icon}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${theme.title}`}>{title}</p>

          <span
            className={`size-1.5 rounded-full ${
              connected ? "bg-emerald-400" : "bg-zinc-500"
            }`}
          />
        </div>

        <p className={`mt-0.5 truncate text-xs ${theme.detail}`}>{detail}</p>
      </div>

      <div className="shrink-0">{action}</div>
    </div>
  );
}