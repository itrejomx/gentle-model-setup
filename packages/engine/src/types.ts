import type { BudgetClass, BundleModelPlan, BundleModelRecord } from "@gentle-ai/profile-data";

/** The quality-versus-cost target a user selects. An input, never the output. */
export type Tier = "HIGH" | "BALANCED" | "LEAN";

/** One selected Subscription and the Plan the user holds on it. */
export interface PlanSelection {
  subscription: string;
  plan: string;
}

export interface Constraints {
  /** True when client code runs through the models: drops models that train on data. */
  clientCode: boolean;
  /** Drops models whose log retention exceeds this many days, or is unknown. */
  maxLogRetentionDays?: number;
}

/** A personal choice of model (prefixed id) per Phase id. Typed here, ignored by the engine in #3. */
export type Pins = Record<string, string>;

export interface Selection {
  subscriptions: PlanSelection[];
  tier: Tier;
  constraints: Constraints;
  pins?: Pins;
}

export type Effort = "default" | "high";

export type ConstraintName = "clientCode" | "maxLogRetentionDays";

/**
 * Why one part of a row resolved as it did: a code and its parameters, never
 * prose. Consumers render sentences. Candidates are named by prefixed id
 * (`<subscription>/<model>`).
 */
export type ReasonFactor =
  | { code: "strength-score"; params: { candidate: string; score: number } }
  | { code: "tier-applied"; params: { tier: Tier; cheapWeight: number } }
  | { code: "budget-filter"; params: { candidate: string; budgetClass: BudgetClass; callPattern: string } }
  | {
      code: "budget-fit";
      params: { candidate: string; budgetClass: BudgetClass; callPattern: string; rank: number };
    }
  | { code: "constraint-pruned"; params: { candidate: string; constraint: ConstraintName } }
  | { code: "effort-high"; params: { candidate: string; budgetClass: BudgetClass } }
  | { code: "effort-default"; params: { candidate: string; budgetClass: BudgetClass | null } }
  | {
      code: "duplicate-tiebreak";
      params: {
        kept: string;
        dropped: string;
        rule: "budget-class" | "capped-over-metered" | "subscription-rows";
      };
    }
  | { code: "pool-empty"; params: { phase: string } }
  | { code: "fill-candidate"; params: { phase: string; subscription: string } };

/** A condition worth surfacing that does not change the resolved model. */
export type Warning =
  | { code: "fallback-chain-short"; params: { phase: string; length: number } }
  | { code: "budget-unknown"; params: { candidate: string } }
  | { code: "retention-unknown"; params: { candidate: string } };

/** One Phase's resolved assignment. `primary` and fallbacks are prefixed model ids. */
export interface ProfileRow {
  phase: string;
  primary: string | null;
  effort: Effort;
  fallbacks: string[];
  reasons: ReasonFactor[];
  warnings: Warning[];
  /** Typed hooks for later issues (#9 Overrides, #12 Pins); never set in #3. */
  override?: { model: string };
  pin?: { model: string };
}

/** The resolved Phase-to-model assignments for one Selection: one row per Phase. */
export interface Profile {
  tier: Tier;
  rows: ProfileRow[];
}

/** One model offered on one Subscription's selected Plan. Internal to the engine. */
export interface Candidate {
  /** Prefixed model id, `<subscription>/<model>`. */
  id: string;
  subscription: string;
  model: BundleModelRecord;
  plan: BundleModelPlan;
  budgetClass: BudgetClass | null;
  lab: string;
  strengths: Record<string, number>;
  reasons: ReasonFactor[];
  warnings: Warning[];
}
