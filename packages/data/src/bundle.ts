import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { deriveBudgetClass } from "./budget-class.js";
import { canonicalJson } from "./canonical.js";
import {
  BundleHashMismatchError,
  BundleParseError,
  BundleShapeError,
  DataValidationError,
} from "./errors.js";
import { checkCrossFileIntegrity } from "./integrity.js";
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
 *
 * Runs only after `buildBundle`'s `checkCrossFileIntegrity` call has
 * already rejected a dangling `model.subscription` and an unsupported
 * `budgetClass.derivedFrom` (T11.3), so `subscriptionsById.get(...)` is
 * guaranteed to resolve here and its thresholds are guaranteed to be
 * `requestsPer5h`-derived — never the silent, degraded fallback this used
 * to produce for a dangling subscription.
 */
function injectBudgetClasses(data: DataSet): BundleModelRecord[] {
  const subscriptionsById = indexSubscriptionsById(data.subscriptions);
  return data.models.map((model) => {
    const subscription = subscriptionsById.get(model.subscription)!;
    const thresholds = subscription.budgetClass.thresholds;
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
 * Assembles a hashed bundle from a validated {@link DataSet}: runs the
 * cross-file integrity checks no single-file validator can express
 * (`checkCrossFileIntegrity` — a runtime's `agentMap`/`prefixMap` against
 * `phases.yaml`/the committed subscriptions), injects every model plan's
 * derived Budget Class, canonicalizes the result, and hashes it. Throws
 * {@link DataValidationError} aggregating every integrity error found —
 * never a partial or incorrect bundle.
 */
export function buildBundle(data: DataSet): Bundle {
  const integrityErrors = checkCrossFileIntegrity(data);
  if (integrityErrors.length > 0) {
    throw new DataValidationError(integrityErrors);
  }

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
 * Rejects `value` unless it is shaped like a bundle: a JSON object with a
 * string `hash` and an object (non-array, non-null) `payload` (T11.4).
 * Never checks the *content* of `payload`'s five collections — that is
 * `buildBundle`'s (and, upstream, each validator's) job, not a read-time
 * shape check.
 */
function assertBundleShape(
  file: string,
  value: unknown,
): asserts value is { hash: string; payload: BundlePayload } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BundleShapeError(file, "expected a JSON object at the top level");
  }
  const record = value as Record<string, unknown>;
  if (typeof record["hash"] !== "string") {
    throw new BundleShapeError(file, 'missing or non-string "hash" field');
  }
  const payload = record["payload"];
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new BundleShapeError(file, 'missing or non-object "payload" field');
  }
}

/**
 * Reads a bundle JSON file and re-hashes its `payload`, rejecting the
 * bundle when the recomputed hash does not match the stored `hash`
 * (bundle spec: "loadBundle() verifies on read"). Never returns tampered
 * data. Raises a typed {@link BundleParseError} for malformed JSON and a
 * typed {@link BundleShapeError} for a well-formed JSON document that is
 * not shaped like a bundle (missing/mistyped `hash` or `payload`) — both
 * distinct from {@link BundleHashMismatchError}, which means the shape was
 * fine but the recomputed hash did not match (T11.4).
 */
export async function loadBundle(file: string): Promise<Bundle> {
  const raw = await readFile(file, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new BundleParseError(file, cause);
  }
  assertBundleShape(file, parsed);
  const actualHash = hashPayload(parsed.payload);
  if (actualHash !== parsed.hash) {
    throw new BundleHashMismatchError(parsed.hash, actualHash);
  }
  return { hash: parsed.hash, payload: parsed.payload };
}
