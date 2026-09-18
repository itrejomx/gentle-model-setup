import type { BudgetClass, Threshold } from "./types.js";

/**
 * Pure, I/O-free derivation of a model's Budget Class from a subscription's
 * ascending thresholds. Never reads a file or touches the network, so
 * `packages/engine` (ADR 0001) can reuse it unchanged.
 *
 * `thresholds` MUST be ascending by `max` with inclusive boundaries; the
 * final entry MUST have `max: null` to cover every value above the last
 * finite boundary. A `null` cap (unpublished `requestsPer5h`) yields `null`.
 */
export function deriveBudgetClass(
  requestsPer5h: number | null,
  thresholds: Threshold[],
): BudgetClass | null {
  if (requestsPer5h === null) return null;

  let previousMax = -Infinity;
  for (const threshold of thresholds) {
    if (threshold.max === null) return threshold.class;
    if (threshold.max <= previousMax) {
      // Unreachable for data that passed `validateSubscription`
      // (`validate.ts`'s `checkThresholds`, issue #32): it rejects any
      // `budgetClass.thresholds` list whose `max` values do not strictly
      // ascend before this function ever runs. Kept as an internal
      // assertion, not a second error path, for a caller that builds
      // `thresholds` some other way.
      throw new Error(
        `thresholds must ascend: "${threshold.class}" max ${threshold.max} does not exceed the previous max ${previousMax}`,
      );
    }
    if (requestsPer5h <= threshold.max) return threshold.class;
    previousMax = threshold.max;
  }

  // Unreachable for data that passed `validateSubscription`
  // (`checkThresholds`, issue #32): it rejects any `budgetClass.thresholds`
  // list whose last entry's `max` is not `null` before this function ever
  // runs. Kept as an internal assertion, not a second error path, for a
  // caller that builds `thresholds` some other way.
  throw new Error(
    "thresholds must end with a null max to cover every value above the last boundary",
  );
}
