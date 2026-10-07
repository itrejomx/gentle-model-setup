import type { PhaseRecord } from "@gentle-ai/profile-data";
import type { Candidate, ReasonFactor, Tier } from "./types.js";

/** The six Strength axes, in the fixed order every sum is taken in. */
export const AXES = [
  "oneShotReasoning",
  "sustainedReasoning",
  "codingTools",
  "longContext",
  "multimodal",
  "cheap",
] as const;

/** How much each Tier scales a Phase's `cheap` weight before renormalizing. */
const CHEAP_MULTIPLIER: Record<Tier, number> = { HIGH: 0, BALANCED: 1, LEAN: 3 };

export function cheapMultiplier(tier: Tier): number {
  return CHEAP_MULTIPLIER[tier];
}

/**
 * A Phase's weights for a Tier: the `cheap` weight scaled by the Tier's
 * multiplier, then every weight divided by the new total so they sum to 1.
 * A missing axis weighs 0; weights that total 0 stay all 0.
 */
export function tierWeights(phase: PhaseRecord, tier: Tier): Record<string, number> {
  const scaled: Record<string, number> = {};
  let total = 0;
  for (const axis of AXES) {
    const authored = phase.weights[axis] ?? 0;
    const weight = axis === "cheap" ? authored * cheapMultiplier(tier) : authored;
    scaled[axis] = weight;
    total += weight;
  }
  if (total === 0) return scaled;
  const weights: Record<string, number> = {};
  for (const axis of AXES) {
    weights[axis] = (scaled[axis] ?? 0) / total;
  }
  return weights;
}

/**
 * `sum(weight[axis] * strength[axis])` over the six axes with the Tier's
 * weights. A Strength axis the model does not carry counts as 0.
 */
export function score(candidate: Candidate, phase: PhaseRecord, tier: Tier): number {
  const weights = tierWeights(phase, tier);
  let total = 0;
  for (const axis of AXES) {
    total += (weights[axis] ?? 0) * (candidate.strengths[axis] ?? 0);
  }
  return total;
}

/** The Phase-level Reason Factor naming the Tier's effect on the `cheap` weight. */
export function tierReason(phase: PhaseRecord, tier: Tier): ReasonFactor {
  return {
    code: "tier-applied",
    params: {
      tier,
      multiplier: cheapMultiplier(tier),
      cheapWeight: tierWeights(phase, tier)["cheap"] ?? 0,
    },
  };
}

/** The candidate-level Reason Factor carrying a computed score. */
export function scoreReason(candidate: Candidate, value: number): ReasonFactor {
  return { code: "strength-score", params: { candidate: candidate.id, score: value } };
}
