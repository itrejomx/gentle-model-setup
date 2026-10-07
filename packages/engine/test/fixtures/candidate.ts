import type { BudgetClass, PhaseRecord } from "@gentle-ai/profile-data";
import type { Candidate } from "../../src/types.js";
import { catalog } from "./catalog.js";

export interface CandidateSpec {
  /** Prefixed id; defaults to `<subscription>/<modelId>`. */
  id?: string;
  subscription?: string;
  modelId?: string;
  billingModel?: "capped" | "metered";
  budgetClass?: BudgetClass | null;
  requestsPer5h?: number | null;
  strengths?: Record<string, number>;
}

const EVEN_STRENGTHS = {
  oneShotReasoning: 2,
  sustainedReasoning: 2,
  codingTools: 2,
  longContext: 2,
  multimodal: 0,
  cheap: 2,
};

/** A hand-built candidate, based on a fixture model so every other field is valid. */
export function makeCandidate(spec: CandidateSpec): Candidate {
  const base = catalog.models[0];
  const basePlan = base?.plans["basic"];
  if (base === undefined || basePlan === undefined) throw new Error("fixture catalog changed shape");
  const subscription = spec.subscription ?? "alpha";
  const modelId = spec.modelId ?? "m";
  const budgetClass = spec.budgetClass === undefined ? "workhorse" : spec.budgetClass;
  const plan = {
    ...basePlan,
    budgetClass,
    requestsPer5h: spec.requestsPer5h === undefined ? 1000 : spec.requestsPer5h,
  };
  return {
    id: spec.id ?? `${subscription}/${modelId}`,
    subscription,
    billingModel: spec.billingModel ?? "capped",
    model: { ...base, id: modelId, subscription },
    plan,
    budgetClass,
    lab: base.lab,
    strengths: spec.strengths ?? EVEN_STRENGTHS,
    reasons: [],
    warnings: [],
  };
}

export function makePhase(callPattern: string, weights: Record<string, number>): PhaseRecord {
  return { id: `${callPattern}-phase`, group: "test", callPattern, role: "neutral", weights };
}
