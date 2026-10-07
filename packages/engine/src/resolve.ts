import type { BundlePayload, PhaseRecord } from "@gentle-ai/profile-data";
import { filterByCallPattern } from "./budget.js";
import { resolveEffort } from "./effort.js";
import { buildPool } from "./pool.js";
import { rankCandidates } from "./rank.js";
import { scoreReason, tierReason } from "./score.js";
import type { Candidate, Profile, ProfileRow, ReasonFactor, Selection, Warning } from "./types.js";

/** The longest Fallback Chain a row carries. */
const MAX_FALLBACKS = 10;
/** A shorter chain is returned as it is, with a `fallback-chain-short` warning. */
const MIN_FALLBACKS = 2;

/** Phase ids that lead every Profile, in this order, ahead of the payload order. */
const LEADING_PHASES = ["gentle-ai-worker", "jd-fix-agent"];

function orderedPhases(phases: readonly PhaseRecord[]): PhaseRecord[] {
  const leading = LEADING_PHASES.flatMap((id) => phases.filter((phase) => phase.id === id));
  return [...leading, ...phases.filter((phase) => !LEADING_PHASES.includes(phase.id))];
}

export function resolveProfile(payload: BundlePayload, selection: Selection): Profile {
  const { candidates } = buildPool(payload, selection);
  const rows: ProfileRow[] = [];
  const rowsHeld = new Map<string, number>();
  for (const phase of orderedPhases(payload.phases)) {
    const row = resolveRow(payload, phase, candidates, selection, rowsHeld);
    rows.push(row);
    const holder = candidates.find((candidate) => candidate.id === row.primary)?.subscription;
    if (holder !== undefined) rowsHeld.set(holder, (rowsHeld.get(holder) ?? 0) + 1);
  }
  return { tier: selection.tier, rows };
}

/**
 * The Subscriptions in the payload, selected or not, that offer at least one
 * model eligible for the Phase on any of their Plans under the Selection's
 * constraints, sorted by id. No order beyond that: nothing here ranks them.
 */
function fillingSubscriptions(payload: BundlePayload, phase: PhaseRecord, selection: Selection): string[] {
  const filling: string[] = [];
  for (const { id, plans } of payload.subscriptions) {
    const offers = (plans ?? []).some((plan) => {
      const { candidates } = buildPool(payload, {
        ...selection,
        subscriptions: [{ subscription: id, plan: plan.id }],
      });
      return filterByCallPattern(candidates, phase.callPattern).kept.length > 0;
    });
    if (offers) filling.push(id);
  }
  return filling.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function resolveRow(
  payload: BundlePayload,
  phase: PhaseRecord,
  pool: readonly Candidate[],
  selection: Selection,
  rowsHeld: ReadonlyMap<string, number>,
): ProfileRow {
  const { kept } = filterByCallPattern(pool, phase.callPattern);
  const { ranked, reasons: tiebreaks } = rankCandidates(kept, phase, selection.tier, rowsHeld);
  const top = ranked[0];
  if (top === undefined) {
    const reasons: ReasonFactor[] = [{ code: "pool-empty", params: { phase: phase.id } }];
    for (const subscription of fillingSubscriptions(payload, phase, selection)) {
      reasons.push({ code: "fill-candidate", params: { phase: phase.id, subscription } });
    }
    return { phase: phase.id, primary: null, effort: "default", fallbacks: [], reasons, warnings: [] };
  }
  const { candidate } = top;
  const { effort, reason: effortReason } = resolveEffort(candidate, selection.tier);
  const reasons: ReasonFactor[] = [...candidate.reasons];
  if (candidate.budgetClass !== null && top.fitRank !== null) {
    reasons.push({
      code: "budget-fit",
      params: {
        candidate: candidate.id,
        budgetClass: candidate.budgetClass,
        callPattern: phase.callPattern,
        rank: top.fitRank,
      },
    });
  }
  reasons.push(scoreReason(candidate, top.score), effortReason, tierReason(phase, selection.tier), ...tiebreaks);
  const fallbacks = ranked.slice(1, 1 + MAX_FALLBACKS).map((entry) => entry.candidate.id);
  const warnings: Warning[] = [...candidate.warnings];
  if (fallbacks.length < MIN_FALLBACKS) {
    warnings.push({ code: "fallback-chain-short", params: { phase: phase.id, length: fallbacks.length } });
  }
  return { phase: phase.id, primary: candidate.id, effort, fallbacks, reasons, warnings };
}
