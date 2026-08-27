"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsToggle } from "@/components/settings/settings-section";
import { joinDesktopWaitlist } from "@/lib/desktop/waitlist";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export function DesktopWaitlistForm({
  initialEmail = null,
  userId = null,
  source = "desktop_page",
}: {
  initialEmail?: string | null;
  userId?: string | null;
  source?: string;
}) {
  const reduce = useReducedMotion();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [wantUpdates, setWantUpdates] = useState(true);
  const [wantBeta, setWantBeta] = useState(false);
  const [useAccountEmail, setUseAccountEmail] = useState(Boolean(initialEmail));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"joined" | "already" | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await joinDesktopWaitlist({
      email: useAccountEmail && initialEmail ? initialEmail : email,
      wantUpdates,
      wantBeta,
      source,
      userId,
    });

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDone(result.alreadyJoined ? "already" : "joined");
  }

  if (done) {
    return (
      <motion.div
        className="mx-auto w-full max-w-md space-y-3 text-center"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
      >
        <p className="text-lg font-medium text-foreground">
          {done === "already" ? "You’re already on the list." : "You’re on the list."}
        </p>
        <p className="text-sm text-muted">
          We’ll reach out when Desktop updates or beta seats open.
        </p>
        <p className="pt-2">
          <Link
            href="/wz"
            className="text-sm font-medium text-accent underline decoration-accent decoration-2 underline-offset-[5px] hover:opacity-80"
          >
            Back to Warzone
          </Link>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="mx-auto w-full max-w-md space-y-5"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.28, ease }}
    >
      <div className="space-y-2">
        <label htmlFor="desktop-email" className="text-sm font-medium text-foreground">
          Email
        </label>
        {initialEmail ? (
          <label className="flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              className="size-4 rounded border-border accent-[var(--accent)]"
              checked={useAccountEmail}
              onChange={(event) => {
                setUseAccountEmail(event.target.checked);
                if (event.target.checked) setEmail(initialEmail);
              }}
            />
            Use my account email ({initialEmail})
          </label>
        ) : null}
        <Input
          id="desktop-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          disabled={Boolean(useAccountEmail && initialEmail) || submitting}
          value={useAccountEmail && initialEmail ? initialEmail : email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@email.com"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Notify me about</legend>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-foreground">Product updates</p>
            <p className="text-xs text-muted">Launch notes and Desktop news</p>
          </div>
          <SettingsToggle
            label="Product updates"
            checked={wantUpdates}
            disabled={submitting}
            onChange={setWantUpdates}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-foreground">Beta testing</p>
            <p className="text-xs text-muted">Early builds when seats open</p>
          </div>
          <SettingsToggle
            label="Beta testing"
            checked={wantBeta}
            disabled={submitting}
            onChange={setWantBeta}
          />
        </div>
      </fieldset>

      {error ? (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Joining…" : "Join the waitlist"}
      </Button>

      <p className={cn("text-center text-xs text-muted")}>
        No spam. Unsubscribe anytime when we start sending.
      </p>
    </motion.form>
  );
}
