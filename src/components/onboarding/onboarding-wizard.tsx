"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeNextPath } from "@/lib/auth/paths";
import type { Mode } from "@/lib/data/types";
import { ONBOARDING_CLIMB_GOALS } from "@/lib/profile/goals";
import {
  parseCurrentSrInput,
  saveOnboarding,
  isSlugAvailable,
  validateCurrentSr,
} from "@/lib/profile/onboarding";
import {
  DISPLAY_NAME_MAX_LEN,
  SLUG_MAX_LEN,
  slugify,
  validateDisplayName,
  validateSlug,
} from "@/lib/profile/slug";
import { rankFromSr, type ClimbTarget } from "@/lib/ranked";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
const STEPS = ["identity", "mode", "sr", "goals"] as const;
type Step = (typeof STEPS)[number];

export type OnboardingPrefill = {
  userId: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  profileExists: boolean;
  preferredMode: Mode;
  climbGoals: ClimbTarget[];
  currentSr: number | null;
};

export function OnboardingWizard({
  prefill,
  nextPath,
}: {
  prefill: OnboardingPrefill;
  nextPath?: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.85 };

  const [step, setStep] = useState<Step>("identity");
  const [displayName, setDisplayName] = useState(prefill.displayName);
  const [slug, setSlug] = useState(prefill.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(prefill.slug));
  const [preferredMode, setPreferredMode] = useState<Mode>(prefill.preferredMode || "wz");
  const [srInput, setSrInput] = useState(
    prefill.currentSr != null && prefill.currentSr > 0 ? String(prefill.currentSr) : "",
  );
  const [goals, setGoals] = useState<ClimbTarget[]>(
    prefill.climbGoals.length > 0 ? prefill.climbGoals : ["top250"],
  );
  const [error, setError] = useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(displayName));
  }, [displayName, slugTouched]);

  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex + 1) / STEPS.length;
  const parsedSr = parseCurrentSrInput(srInput);
  const rankPreview = parsedSr != null ? rankFromSr(parsedSr, null) : null;

  async function goNextFromIdentity() {
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      setError(nameError);
      return;
    }
    const slugError = validateSlug(slug);
    if (slugError) {
      setError(slugError);
      return;
    }
    setCheckingSlug(true);
    setError(null);
    const available = await isSlugAvailable(slug, prefill.userId);
    setCheckingSlug(false);
    if (!available) {
      setError("That username is taken.");
      return;
    }
    setStep("mode");
  }

  function goNextFromMode() {
    setError(null);
    setStep("sr");
  }

  function goNextFromSr() {
    const srError = validateCurrentSr(parsedSr);
    if (srError) {
      setError(srError);
      return;
    }
    setError(null);
    setStep("goals");
  }

  async function finish() {
    if (goals.length === 0) {
      setError("Pick at least one climb goal.");
      return;
    }
    const srError = validateCurrentSr(parsedSr);
    if (srError) {
      setError(srError);
      setStep("sr");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await saveOnboarding({
      userId: prefill.userId,
      displayName,
      slug,
      preferredMode,
      climbGoals: goals,
      currentSr: parsedSr!,
      avatarUrl: prefill.avatarUrl,
      profileExists: prefill.profileExists,
    });
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      if (result.field === "identity") setStep("identity");
      if (result.field === "sr") setStep("sr");
      return;
    }
    const next = safeNextPath(nextPath, `/players/${result.slug}`);
    const dest =
      next === "/" || next.startsWith("/onboarding") || next.startsWith("/login")
        ? `/players/${result.slug}`
        : next;
    router.replace(dest);
    router.refresh();
  }

  function toggleGoal(id: ClimbTarget) {
    setGoals((current) =>
      current.includes(id) ? current.filter((goal) => goal !== id) : [...current, id],
    );
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_55%)]"
      />
      <BrandWordmark className="text-3xl md:text-4xl" />

      <div className="mt-8 h-0.5 overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.45, ease }}
        />
      </div>
      <p className="mt-2 text-[10px] tracking-[0.16em] text-muted uppercase">
        Step {stepIndex + 1} of {STEPS.length}
      </p>

      <div className="relative mt-8 min-h-[280px]">
        <AnimatePresence mode="wait">
          {step === "identity" ? (
            <motion.div
              key="identity"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={spring}
            >
              <h1 className="text-2xl font-semibold tracking-tight">Who are you?</h1>
              <p className="mt-2 text-sm text-muted">
                Pick a display name and username for your profile.
              </p>
              <label className="mt-6 block text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
                Display name
                <Input
                  value={displayName}
                  maxLength={DISPLAY_NAME_MAX_LEN}
                  className="mt-1.5"
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setError(null);
                  }}
                />
              </label>
              <label className="mt-4 block text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
                Username
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-muted">
                    @
                  </span>
                  <Input
                    value={slug}
                    maxLength={SLUG_MAX_LEN}
                    className="pl-7"
                    onChange={(event) => {
                      setSlugTouched(true);
                      setSlug(slugify(event.target.value));
                      setError(null);
                    }}
                  />
                </div>
              </label>
              <Button
                type="button"
                className="mt-8 w-full"
                disabled={checkingSlug}
                onClick={() => {
                  void goNextFromIdentity();
                }}
              >
                {checkingSlug ? "Checking…" : "Continue"}
              </Button>
            </motion.div>
          ) : null}

          {step === "mode" ? (
            <motion.div
              key="mode"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={spring}
            >
              <h1 className="text-2xl font-semibold tracking-tight">Your mode</h1>
              <p className="mt-2 text-sm text-muted">
                Start with Warzone. Multiplayer is on the way.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setPreferredMode("wz")}
                  className={cn(
                    "rounded-[6px] border px-4 py-5 text-left transition-[border-color,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    preferredMode === "wz"
                      ? "border-accent bg-surface"
                      : "border-border bg-background hover:bg-surface",
                  )}
                >
                  <span className="text-lg font-semibold tracking-tight">Warzone</span>
                  <span className="mt-1 block text-sm text-muted">Ranked Resurgence climb</span>
                </button>
                <div
                  aria-disabled
                  className="cursor-not-allowed rounded-[6px] border border-border bg-background/60 px-4 py-5 opacity-60"
                >
                  <span className="text-lg font-semibold tracking-tight">Multiplayer</span>
                  <span className="mt-1 block text-sm text-muted">Coming soon</span>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("identity")}>
                  Back
                </Button>
                <Button type="button" className="flex-1" onClick={goNextFromMode}>
                  Continue
                </Button>
              </div>
            </motion.div>
          ) : null}

          {step === "sr" ? (
            <motion.div
              key="sr"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={spring}
            >
              <h1 className="text-2xl font-semibold tracking-tight">Current SR</h1>
              <p className="mt-2 text-sm text-muted">
                Where are you sitting right now in ranked?
              </p>
              <label className="mt-6 block text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
                Skill rating
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  value={srInput}
                  placeholder="8500"
                  className="mt-1.5 numeric text-2xl font-semibold tracking-tight h-14"
                  onChange={(event) => {
                    const next = event.target.value.replace(/[^\d,]/g, "").slice(0, 8);
                    setSrInput(next);
                    setError(null);
                  }}
                />
              </label>
              {rankPreview ? (
                <p className="mt-3 text-sm text-muted">
                  Rank preview:{" "}
                  <span className="font-medium text-foreground">{rankPreview.label}</span>
                </p>
              ) : null}
              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("mode")}>
                  Back
                </Button>
                <Button type="button" className="flex-1" onClick={goNextFromSr}>
                  Continue
                </Button>
              </div>
            </motion.div>
          ) : null}

          {step === "goals" ? (
            <motion.div
              key="goals"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={spring}
            >
              <h1 className="text-2xl font-semibold tracking-tight">Climb targets</h1>
              <p className="mt-2 text-sm text-muted">What are you chasing this season?</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {ONBOARDING_CLIMB_GOALS.map((goal) => {
                  const selected = goals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => {
                        toggleGoal(goal.id);
                        setError(null);
                      }}
                      className={cn(
                        "rounded-[6px] border px-3.5 py-2 text-sm font-medium transition-[border-color,background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        selected
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border bg-background text-foreground hover:bg-surface",
                      )}
                    >
                      {goal.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("sr")}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={saving}
                  onClick={() => {
                    void finish();
                  }}
                >
                  {saving ? "Saving…" : "Finish"}
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {error ? <p className="mt-4 text-sm text-negative">{error}</p> : null}
    </div>
  );
}
