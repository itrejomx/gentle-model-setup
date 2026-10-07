import type { PhaseRecord } from "@gentle-ai/profile-data";
import { budgetFitRank } from "./budget.js";
import { score } from "./score.js";
import type { Candidate, ReasonFactor, Tier } from "./types.js";

export interface RankedCandidate {
  candidate: Candidate;
  score: number;
  /** Budget Class fit for the Phase's call pattern; 0 is best, `null` is unranked. */
  fitRank: number | null;
}

export interface Ranking {
  ranked: RankedCandidate[];
  reasons: ReasonFactor[];
}

/** Lower is better; an unranked class sorts after every ranked one. */
function fitKey(rank: number | null): number {
  return rank === null ? Number.POSITIVE_INFINITY : rank;
}

function compareFit(a: number | null, b: number | null): number {
  if (a === b) return 0;
  return fitKey(a) < fitKey(b) ? -1 : 1;
}

function compare(a: RankedCandidate, b: RankedCandidate): number {
  if (a.score !== b.score) return b.score - a.score;
  const fit = compareFit(a.fitRank, b.fitRank);
  if (fit !== 0) return fit;
  const cheapA = a.candidate.strengths["cheap"] ?? 0;
  const cheapB = b.candidate.strengths["cheap"] ?? 0;
  if (cheapA !== cheapB) return cheapB - cheapA;
  if (a.candidate.id === b.candidate.id) return 0;
  return a.candidate.id < b.candidate.id ? -1 : 1;
}

export function rankCandidates(
  candidates: readonly Candidate[],
  phase: PhaseRecord,
  tier: Tier,
  rowsHeld: ReadonlyMap<string, number>,
): Ranking {
  const ranked = candidates.map((candidate) => ({
    candidate,
    score: score(candidate, phase, tier),
    fitRank: budgetFitRank(candidate.budgetClass, phase.callPattern),
  }));
  ranked.sort(compare);
  return { ranked, reasons: preferDuplicate(ranked, rowsHeld) };
}

type DuplicateRule = "budget-class" | "capped-over-metered" | "subscription-rows";

/**
 * The duplicate-Subscription rule. When the top candidate's model is also
 * offered by another Subscription at the same score, those candidates are
 * ordered by Budget Class fit, then capped over metered billing, then the
 * Subscription already holding more rows in this Profile. Only the top
 * position moves; a rule that cannot tell the two apart leaves the general
 * order and emits nothing.
 */
function preferDuplicate(
  ranked: RankedCandidate[],
  rowsHeld: ReadonlyMap<string, number>,
): ReasonFactor[] {
  const top = ranked[0];
  if (top === undefined) return [];
  const group = ranked.filter(
    (entry) =>
      entry.candidate.model.id === top.candidate.model.id &&
      (entry === top ||
        (entry.candidate.subscription !== top.candidate.subscription && entry.score === top.score)),
  );
  const rows = (entry: RankedCandidate) => rowsHeld.get(entry.candidate.subscription) ?? 0;
  const billing = (entry: RankedCandidate) => (entry.candidate.billingModel === "capped" ? 0 : 1);
  const ordered = [...group].sort(
    (a, b) =>
      compareFit(a.fitRank, b.fitRank) || billing(a) - billing(b) || rows(b) - rows(a),
  );
  const winner = ordered[0];
  const runnerUp = ordered[1];
  if (winner === undefined || runnerUp === undefined) return [];
  let rule: DuplicateRule;
  if (winner.fitRank !== runnerUp.fitRank) rule = "budget-class";
  else if (billing(winner) !== billing(runnerUp)) rule = "capped-over-metered";
  else if (rows(winner) !== rows(runnerUp)) rule = "subscription-rows";
  else return [];
  if (winner !== top) {
    ranked.splice(ranked.indexOf(winner), 1);
    ranked.unshift(winner);
  }
  return [
    {
      code: "duplicate-tiebreak",
      params: { kept: winner.candidate.id, dropped: runnerUp.candidate.id, rule },
    },
  ];
}
