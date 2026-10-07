import type { BudgetClass } from "@gentle-ai/profile-data";
import { UnknownCallPatternError } from "./errors.js";
import type { Candidate } from "./types.js";

/** Budget Classes in fit order, best first, for each call pattern. A sniper never serves a loop. */
const FIT_ORDER = {
  loop: ["volume", "workhorse", "semi"],
  "one-shot": ["sniper", "semi", "workhorse", "volume"],
} as const satisfies Record<string, readonly BudgetClass[]>;

function fitOrder(callPattern: string): readonly BudgetClass[] {
  if (callPattern === "loop" || callPattern === "one-shot") return FIT_ORDER[callPattern];
  throw new UnknownCallPatternError(callPattern);
}

/**
 * How well a Budget Class fits a call pattern: 0 is the best fit. `null`
 * means the class cannot serve the pattern at all (a sniper in a loop) or
 * is unknown.
 */
export function budgetFitRank(budgetClass: BudgetClass | null, callPattern: string): number | null {
  const order = fitOrder(callPattern);
  if (budgetClass === null) return null;
  const rank = order.indexOf(budgetClass);
  return rank === -1 ? null : rank;
}

export interface BudgetFilterResult {
  kept: Candidate[];
  excluded: Candidate[];
}

/**
 * Budget Class as a hard filter against a Phase's call pattern. A sniper
 * never serves a `loop` Phase; an unknown Budget Class is ineligible for
 * `loop` and allowed for `one-shot`. Either way an unknown class carries a
 * `budget-unknown` warning. Candidates are copied, never mutated.
 */
export function filterByCallPattern(
  candidates: readonly Candidate[],
  callPattern: string,
): BudgetFilterResult {
  fitOrder(callPattern);
  const kept: Candidate[] = [];
  const excluded: Candidate[] = [];
  for (const candidate of candidates) {
    const { budgetClass } = candidate;
    if (budgetClass === null) {
      const warned: Candidate = {
        ...candidate,
        warnings: [...candidate.warnings, { code: "budget-unknown", params: { candidate: candidate.id } }],
      };
      (callPattern === "loop" ? excluded : kept).push(warned);
    } else if (budgetFitRank(budgetClass, callPattern) === null) {
      excluded.push({
        ...candidate,
        reasons: [
          ...candidate.reasons,
          { code: "budget-filter", params: { candidate: candidate.id, budgetClass, callPattern } },
        ],
      });
    } else {
      kept.push(candidate);
    }
  }
  return { kept, excluded };
}
