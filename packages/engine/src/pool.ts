import type { BundlePayload } from "@gentle-ai/profile-data";
import { InvalidSelectionError } from "./errors.js";
import type { Candidate, Constraints, ConstraintName, Selection } from "./types.js";

export interface Pool {
  candidates: Candidate[];
  pruned: Candidate[];
}

/**
 * The constraints that rule a model out, in a fixed order. Unknown log
 * retention fails closed against a retention limit and is reported as a
 * `retention-unknown` warning on the candidate.
 */
function violatedConstraints(candidate: Candidate, constraints: Constraints): ConstraintName[] {
  const { trainsOnData, logRetentionDays } = candidate.model.privacy;
  const violated: ConstraintName[] = [];
  if (constraints.clientCode && trainsOnData) {
    violated.push("clientCode");
  }
  const limit = constraints.maxLogRetentionDays;
  if (limit !== undefined) {
    if (logRetentionDays === null) {
      violated.push("maxLogRetentionDays");
      candidate.warnings.push({ code: "retention-unknown", params: { candidate: candidate.id } });
    } else if (logRetentionDays > limit) {
      violated.push("maxLogRetentionDays");
    }
  }
  return violated;
}

/**
 * The candidates a Selection can draw on: every `current` model offered on
 * the selected Plan of each selected Subscription. A model offered by two
 * selected Subscriptions is two candidates with distinct prefixed ids. A
 * Selection naming an unknown Subscription, a Plan it does not declare, or
 * a Subscription twice raises `InvalidSelectionError`, so a prefixed id is
 * unique in the pool.
 */
export function buildPool(payload: BundlePayload, selection: Selection): Pool {
  const candidates: Candidate[] = [];
  const pruned: Candidate[] = [];
  const seen = new Set<string>();
  for (const { subscription, plan: planId } of selection.subscriptions) {
    if (seen.has(subscription)) {
      throw new InvalidSelectionError(subscription, "it is listed twice");
    }
    seen.add(subscription);
    const held = payload.subscriptions.find((record) => record.id === subscription);
    if (held === undefined) {
      throw new InvalidSelectionError(subscription, "the payload holds no such Subscription");
    }
    if (!(held.plans ?? []).some((declared) => declared.id === planId)) {
      throw new InvalidSelectionError(subscription, `it declares no Plan "${planId}"`);
    }
    for (const model of payload.models) {
      if (model.subscription !== subscription || model.status !== "current") continue;
      if (!Object.hasOwn(model.plans, planId)) continue;
      const plan = model.plans[planId];
      if (plan === undefined) continue;
      const candidate: Candidate = {
        id: `${subscription}/${model.id}`,
        subscription,
        model,
        plan,
        budgetClass: plan.budgetClass,
        lab: model.lab,
        strengths: model.strengths,
        reasons: [],
        warnings: [],
      };
      const violated = violatedConstraints(candidate, selection.constraints);
      if (violated.length === 0) {
        candidates.push(candidate);
        continue;
      }
      for (const constraint of violated) {
        candidate.reasons.push({
          code: "constraint-pruned",
          params: { candidate: candidate.id, constraint },
        });
      }
      pruned.push(candidate);
    }
  }
  return { candidates, pruned };
}
