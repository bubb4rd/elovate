import type { ClimbTarget } from "@/lib/ranked";

export const ONBOARDING_CLIMB_GOALS: { id: ClimbTarget; label: string }[] = [
  { id: "nextTier", label: "Next tier" },
  { id: "nextDivision", label: "Next rank" },
  { id: "iridescent", label: "Iridescent" },
  { id: "top250", label: "Live T250" },
];

const GOAL_IDS = new Set(ONBOARDING_CLIMB_GOALS.map((goal) => goal.id));

export function isClimbTarget(value: string): value is ClimbTarget {
  return GOAL_IDS.has(value as ClimbTarget);
}

export function parseClimbGoals(raw: unknown): ClimbTarget[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is ClimbTarget => typeof item === "string" && isClimbTarget(item));
}

export function validateClimbGoals(goals: ClimbTarget[]): string | null {
  if (goals.length === 0) return "Pick at least one climb goal.";
  if (!goals.every(isClimbTarget)) return "Invalid climb goal.";
  return null;
}
