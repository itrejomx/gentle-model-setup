import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readYamlFile, validatePhases } from "../src/index.js";

/**
 * The 13 canonical Gentle AI phase ids: the non-`sdd` rows of the Gentle AI
 * 4.0 roster (release 2026-10-01), which retired SDD. Maintainer decision
 * 2026-10-06 (issue #40): the canonical set is the 13 ids that survive 4.0,
 * unioned across runtimes.
 */
const ORCHESTRATION_IDS = ["gentle-orchestrator"] as const;

const JUDGMENT_DAY_IDS = ["jd-judge-a", "jd-judge-b", "jd-fix-agent"] as const;

const REVIEW_IDS = [
  "review-risk",
  "review-readability",
  "review-reliability",
  "review-resilience",
  "review-refuter",
  "review-validator",
] as const;

const WORKER_IDS = [
  "gentle-ai-explore",
  "gentle-ai-verify",
  "gentle-ai-worker",
] as const;

const CANONICAL_PHASE_IDS: readonly string[] = [
  ...ORCHESTRATION_IDS,
  ...JUDGMENT_DAY_IDS,
  ...REVIEW_IDS,
  ...WORKER_IDS,
];

const STRENGTH_AXES = [
  "oneShotReasoning",
  "sustainedReasoning",
  "codingTools",
  "longContext",
  "multimodal",
  "cheap",
] as const;

const CALL_PATTERNS = ["one-shot", "loop"] as const;
const ROLES = ["implementer", "verifier", "judge-a", "judge-b", "neutral"] as const;
const GROUPS = ["orchestration", "judgment-day", "review", "workers"] as const;

interface PhaseEntry {
  id: string;
  group: string;
  callPattern: string;
  role: string;
  weights: Record<string, number>;
}

interface PhasesDoc {
  phases: PhaseEntry[];
}

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(here, "../../../data");
const phasesPath = join(dataRoot, "phases/phases.yaml");

function loadPhases(): PhasesDoc {
  return readYamlFile(phasesPath, dataRoot) as PhasesDoc;
}

function findPhase(doc: PhasesDoc, id: string): PhaseEntry {
  const phase = doc.phases.find((entry) => entry.id === id);
  if (!phase) {
    throw new Error(`phases.yaml has no entry for id "${id}"`);
  }
  return phase;
}

describe("canonical phases", () => {
  it("validates against the phases schema", () => {
    const doc = loadPhases();
    expect(validatePhases(doc, phasesPath)).toEqual([]);
  });

  it("has exactly 13 rows", () => {
    const doc = loadPhases();
    expect(doc.phases.length).toBe(13);
  });

  it("has ids matching the canonical 13-id list", () => {
    const doc = loadPhases();
    const ids = doc.phases.map((phase) => phase.id).sort();
    expect(ids).toEqual([...CANONICAL_PHASE_IDS].sort());
  });

  // Issue #40: SDD is retired in Gentle AI 4.0, so `sdd` is no longer a
  // valid group. The doc is a real row with only its group changed.
  it("rejects a row whose group is the retired sdd group, naming the field", () => {
    const doc = loadPhases();
    const row = findPhase(doc, "gentle-orchestrator");
    const retired = { phases: [{ ...row, group: "sdd" }] };
    const errors = validatePhases(retired, phasesPath);
    expect(errors.some((error) => error.field === "phases.0.group")).toBe(true);
  });

  it("has unique ids", () => {
    const doc = loadPhases();
    const ids = doc.phases.map((phase) => phase.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CANONICAL_PHASE_IDS)("%s declares a valid group", (id) => {
    const doc = loadPhases();
    const phase = findPhase(doc, id);
    expect(GROUPS).toContain(phase.group);
  });

  it.each(CANONICAL_PHASE_IDS)("%s declares a valid callPattern", (id) => {
    const doc = loadPhases();
    const phase = findPhase(doc, id);
    expect(CALL_PATTERNS).toContain(phase.callPattern);
  });

  it.each(CANONICAL_PHASE_IDS)("%s declares a valid role", (id) => {
    const doc = loadPhases();
    const phase = findPhase(doc, id);
    expect(ROLES).toContain(phase.role);
  });

  it.each(CANONICAL_PHASE_IDS)(
    "%s declares all six weight axes summing above zero",
    (id) => {
      const doc = loadPhases();
      const phase = findPhase(doc, id);
      expect(Object.keys(phase.weights).sort()).toEqual([...STRENGTH_AXES].sort());
      const sum = Object.values(phase.weights).reduce((total, value) => total + value, 0);
      expect(sum).toBeGreaterThan(0);
    },
  );

  // The following pin the canonical-phases/spec.md scenarios directly.
  it("gentle-orchestrator does not claim a special role", () => {
    const doc = loadPhases();
    const phase = findPhase(doc, "gentle-orchestrator");
    expect(phase.role).toBe("neutral");
  });

  it("jd-judge-a and jd-judge-b hold their respective judge roles", () => {
    const doc = loadPhases();
    expect(findPhase(doc, "jd-judge-a").role).toBe("judge-a");
    expect(findPhase(doc, "jd-judge-b").role).toBe("judge-b");
  });

  // T9.5 (slice 8 advisory): each id sits in its canonical group, iterating
  // the same per-group id constants used to build CANONICAL_PHASE_IDS above,
  // rather than only checking membership in the flat GROUPS enum.
  describe("group membership", () => {
    it.each(ORCHESTRATION_IDS)("%s belongs to group orchestration", (id) => {
      const doc = loadPhases();
      expect(findPhase(doc, id).group).toBe("orchestration");
    });

    it.each(JUDGMENT_DAY_IDS)("%s belongs to group judgment-day", (id) => {
      const doc = loadPhases();
      expect(findPhase(doc, id).group).toBe("judgment-day");
    });

    it.each(REVIEW_IDS)("%s belongs to group review", (id) => {
      const doc = loadPhases();
      expect(findPhase(doc, id).group).toBe("review");
    });

    it.each(WORKER_IDS)("%s belongs to group workers", (id) => {
      const doc = loadPhases();
      expect(findPhase(doc, id).group).toBe("workers");
    });
  });

  // T9.6 (slice 8 advisory): pin the judgment-call rows the header comment
  // (data/phases/phases.yaml lines 14-25) documents as following the design
  // spec's more detailed table rather than canonical-phases/spec.md's
  // shorter, incomplete summary sentence.
  it("jd-fix-agent is an implementer", () => {
    const doc = loadPhases();
    expect(findPhase(doc, "jd-fix-agent").role).toBe("implementer");
  });

  it("gentle-ai-worker is an implementer", () => {
    const doc = loadPhases();
    expect(findPhase(doc, "gentle-ai-worker").role).toBe("implementer");
  });

  // Issue #40 (maintainer decision 2026-10-06): the worker iterates
  // test-first inside each delegated task, so it consumes requests in a
  // burst like the orchestrator. It is the loop Phase the sniper invariant
  // (ADR 0001) protects now that the SDD apply phase is gone.
  it("gentle-ai-worker is a loop Phase", () => {
    const doc = loadPhases();
    expect(findPhase(doc, "gentle-ai-worker").callPattern).toBe("loop");
  });

  it("gentle-ai-worker and gentle-orchestrator are the only loop Phases", () => {
    const doc = loadPhases();
    const loops = doc.phases.filter((phase) => phase.callPattern === "loop").map((phase) => phase.id);
    expect(loops.sort()).toEqual(["gentle-ai-worker", "gentle-orchestrator"]);
  });

  it("gentle-ai-verify is a verifier", () => {
    const doc = loadPhases();
    expect(findPhase(doc, "gentle-ai-verify").role).toBe("verifier");
  });

  it("gentle-ai-explore is neutral", () => {
    const doc = loadPhases();
    expect(findPhase(doc, "gentle-ai-explore").role).toBe("neutral");
  });

  it.each([
    "review-risk",
    "review-readability",
    "review-reliability",
    "review-resilience",
    "review-refuter",
    "review-validator",
  ])("%s is a verifier", (id) => {
    const doc = loadPhases();
    expect(findPhase(doc, id).role).toBe("verifier");
  });

  // T9.6: every weights map sums to 1.0 exactly, per the phases.yaml header
  // ("every weights map sums to 1.0"), tightening the earlier ">0" check.
  it.each(CANONICAL_PHASE_IDS)("%s's weights sum to 1.0", (id) => {
    const doc = loadPhases();
    const phase = findPhase(doc, id);
    const sum = Object.values(phase.weights).reduce((total, value) => total + value, 0);
    expect(sum).toBeCloseTo(1.0, 9);
  });
});
