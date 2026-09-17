import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { deriveBudgetClass } from "./budget-class.js";
import { canonicalJson } from "./canonical.js";
import { BundleHashMismatchError } from "./errors.js";
import type {
  Bundle,
  BundleModelPlan,
  BundleModelRecord,
  BundlePayload,
  DataSet,
  SubscriptionRecord,
} from "./types.js";

/**
 * SHA-256 hex digest of `payload`'s canonical JSON. The bundle spec's
 * "SHA-256 hash outside the payload" requirement: the hash sits beside the
 * payload it covers, never inside it, so hashing it is never circular.
 */
export function hashPayload(payload: BundlePayload): string {
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function indexSubscriptionsById(
  subscriptions: SubscriptionRecord[],
): Map<string, SubscriptionRecord> {
  return new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
}

/**
 * Injects each model plan's derived Budget Class (ADR 0001: derived,
 * never stored in YAML). Derivation always uses the plan's own
 * `requestsPer5h` — never a value scaled by an optional `multiplier` — so
 * a temporary promo never re-tiers a model (T10.2b).
 */
function injectBudgetClasses(data: DataSet): BundleModelRecord[] {
  const subscriptionsById = indexSubscriptionsById(data.subscriptions);
  return data.models.map((model) => {
    const subscription = subscriptionsById.get(model.subscription);
    const thresholds = subscription?.budgetClass.thresholds ?? [];
    const plans: Record<string, BundleModelPlan> = {};
    for (const [planId, plan] of Object.entries(model.plans)) {
      plans[planId] = {
        ...plan,
        budgetClass: deriveBudgetClass(plan.requestsPer5h, thresholds),
      };
    }
    return { ...model, plans };
  });
}

/**
 * Assembles a hashed bundle from a validated {@link DataSet}: injects every
 * model plan's derived Budget Class, canonicalizes the result, and hashes
 * it.
 */
export function buildBundle(data: DataSet): Bundle {
  const payload: BundlePayload = {
    subscriptions: data.subscriptions,
    models: injectBudgetClasses(data),
    phases: data.phases,
    overrides: data.overrides,
    runtimes: data.runtimes,
  };
  return { hash: hashPayload(payload), payload };
}

/**
 * Reads a bundle JSON file and re-hashes its `payload`, rejecting the
 * bundle when the recomputed hash does not match the stored `hash`
 * (bundle spec: "loadBundle() verifies on read"). Never returns tampered
 * data.
 */
export async function loadBundle(file: string): Promise<Bundle> {
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw) as Bundle;
  const actualHash = hashPayload(parsed.payload);
  if (actualHash !== parsed.hash) {
    throw new BundleHashMismatchError(parsed.hash, actualHash);
  }
  return { hash: parsed.hash, payload: parsed.payload };
}
