import type { Candidate, Effort, ReasonFactor, Tier } from "./types.js";

export interface EffortChoice {
  effort: Effort;
  reason: ReasonFactor;
}

/**
 * The reasoning effort a primary runs at. Only a `workhorse` or `volume`
 * model that lists the `high` variant gets it, and only in HIGH; `sniper`,
 * `semi`, an unknown Budget Class, and every other Tier stay `default`.
 */
export function resolveEffort(candidate: Candidate, tier: Tier): EffortChoice {
  const { budgetClass } = candidate;
  const roomForHigh = budgetClass === "workhorse" || budgetClass === "volume";
  if (tier === "HIGH" && roomForHigh && candidate.model.effortVariants.includes("high")) {
    return {
      effort: "high",
      reason: { code: "effort-high", params: { candidate: candidate.id, budgetClass } },
    };
  }
  return {
    effort: "default",
    reason: { code: "effort-default", params: { candidate: candidate.id, budgetClass } },
  };
}
