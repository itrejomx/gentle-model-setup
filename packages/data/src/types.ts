export type BudgetClass = "sniper" | "semi" | "workhorse" | "volume";

export interface Threshold {
  class: BudgetClass;
  max: number | null;
}

export interface SubscriptionPlan {
  id: string;
  displayName: string;
  priceUsdPerMonth?: number;
}

export interface SubscriptionRecord {
  id: string;
  displayName: string;
  providerPrefix: string;
  billingModel: "capped" | "metered";
  budgetClass: {
    derivedFrom: "requestsPer5h" | "pricePerMTok";
    thresholds: Threshold[];
  };
  plans?: SubscriptionPlan[];
  catalogSourceUrl: string;
  verifiedAt: string;
}

export interface ModelPlan {
  requestsPer5h: number | null;
  requestsPerWeek: number | null;
  requestsPerMonth: number | null;
  monthlyUsdBucket: number;
  source: string;
  verifiedAt: string;
  multiplier?: number;
  multiplierExpiresAt?: string;
}

export interface ModelRecord {
  id: string;
  subscription: string;
  displayName: string;
  lab: string;
  status: "current" | "legacy" | "experimental";
  strengths: Record<string, number>;
  evidence?: Record<string, string>;
  privacy: { trainsOnData: boolean; logRetentionDays: number | null };
  effortVariants: string[];
  plans: Record<string, ModelPlan>;
}

export interface PhaseRecord {
  id: string;
  group: string;
  callPattern: string;
  role: string;
  weights: Record<string, number>;
}

export interface OverrideRecord {
  tier: "HIGH" | "BALANCED" | "LEAN";
  phase: string;
  requires: string[];
  model: string;
  effort: "low" | "medium" | "high";
  reason: string;
  author: string;
  pr: string;
}

export interface RuntimeRecord {
  id: string;
  displayName: string;
  agentMap: Record<string, string>;
  prefixMap: Record<string, string>;
}

/**
 * The full validated data tree, assembled from every YAML collection under
 * `data/`, before Budget Class derivation or canonicalization. This is
 * `buildBundle`'s input shape (design.md's Loader API: `buildBundle(data:
 * DataSet): Bundle`).
 */
export interface DataSet {
  subscriptions: SubscriptionRecord[];
  models: ModelRecord[];
  phases: PhaseRecord[];
  overrides: OverrideRecord[];
  runtimes: RuntimeRecord[];
}

/**
 * A model plan as it appears inside a built bundle: the source plan plus
 * the Budget Class `buildBundle` derives for it. Never stored in YAML
 * (ADR 0001: Budget Class is derived, never persisted).
 */
export interface BundleModelPlan extends ModelPlan {
  budgetClass: BudgetClass | null;
}

export interface BundleModelRecord extends Omit<ModelRecord, "plans"> {
  plans: Record<string, BundleModelPlan>;
}

/**
 * The hashed payload of a built bundle: the same five collections as
 * {@link DataSet}, with every model plan's Budget Class injected. Carries
 * no timestamp and no `hash` field of its own — the bundle spec's "SHA-256
 * hash outside the payload" requirement puts `hash` beside `payload`,
 * never inside it.
 */
export interface BundlePayload {
  subscriptions: SubscriptionRecord[];
  models: BundleModelRecord[];
  phases: PhaseRecord[];
  overrides: OverrideRecord[];
  runtimes: RuntimeRecord[];
}

export interface Bundle {
  hash: string;
  payload: BundlePayload;
}
