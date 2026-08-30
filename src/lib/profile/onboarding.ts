import type { Mode } from "@/lib/data/types";
import { avatarOrDefault } from "@/lib/profile/avatar";
import { validateClimbGoals } from "@/lib/profile/goals";
import { validateDisplayName, validateSlug } from "@/lib/profile/slug";
import { clampSr, type ClimbTarget } from "@/lib/ranked";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export const CURRENT_SR_MAX = 100_000;

export function parseCurrentSrInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return clampSr(value);
}

export function validateCurrentSr(sr: number | null): string | null {
  if (sr == null) return "Enter your current SR.";
  if (sr < 0 || sr > CURRENT_SR_MAX) {
    return `SR must be between 0 and ${CURRENT_SR_MAX.toLocaleString("en-US")}.`;
  }
  return null;
}

export async function isSlugAvailable(slug: string, userId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return true;
  return data.id === userId;
}

export async function saveOnboarding(input: {
  userId: string;
  displayName: string;
  slug: string;
  preferredMode: Mode;
  climbGoals: ClimbTarget[];
  currentSr: number;
  avatarUrl?: string | null;
  profileExists: boolean;
}): Promise<{ slug: string } | { error: string; field?: "identity" | "sr" }> {
  const nameError = validateDisplayName(input.displayName);
  if (nameError) return { error: nameError, field: "identity" };
  const slugError = validateSlug(input.slug);
  if (slugError) return { error: slugError, field: "identity" };
  const srError = validateCurrentSr(input.currentSr);
  if (srError) return { error: srError, field: "sr" };
  const goalsError = validateClimbGoals(input.climbGoals);
  if (goalsError) return { error: goalsError };

  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Sign-in is not configured." };

  const available = await isSlugAvailable(input.slug, input.userId);
  if (!available) {
    return { error: "That username is taken.", field: "identity" };
  }

  const payload = {
    slug: input.slug,
    display_name: input.displayName.trim(),
    preferred_mode: input.preferredMode,
    climb_goals: input.climbGoals,
    current_sr: input.currentSr,
    onboarding_completed_at: new Date().toISOString(),
  };

  if (input.profileExists) {
    const { error } = await supabase.from("profiles").update(payload).eq("id", input.userId);
    if (error) {
      if (error.code === "23505") {
        return { error: "That username is taken.", field: "identity" };
      }
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from("profiles").insert({
      id: input.userId,
      ...payload,
      avatar_url: avatarOrDefault(input.avatarUrl),
    });
    if (error) {
      if (error.code === "23505") {
        return { error: "That username is taken.", field: "identity" };
      }
      return { error: error.message };
    }
  }

  return { slug: input.slug };
}
