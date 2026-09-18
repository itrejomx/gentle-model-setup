import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validateModel } from "../src/validate.js";

const STRENGTH_AXES = [
  "oneShotReasoning",
  "sustainedReasoning",
  "codingTools",
  "longContext",
  "multimodal",
  "cheap",
] as const;

function buildModelDoc(
  strengthValues: Record<(typeof STRENGTH_AXES)[number], number>,
  evidenceAxes: ReadonlySet<string>,
): Record<string, unknown> {
  const evidence: Record<string, string> = {};
  for (const axis of evidenceAxes) {
    evidence[axis] = `Evidence for ${axis} (https://example.com, verified 2026-09-14).`;
  }
  const hasEvidence = Object.keys(evidence).length > 0;

  return {
    id: "prop-test-model",
    subscription: "fixture-sub",
    displayName: "Property Test Model",
    lab: "moonshot",
    status: "current",
    strengths: strengthValues,
    ...(hasEvidence ? { evidence } : {}),
    privacy: { trainsOnData: false, logRetentionDays: 0 },
    effortVariants: ["medium"],
    plans: {
      go: {
        requestsPer5h: 100,
        requestsPerWeek: 500,
        requestsPerMonth: 2000,
        monthlyUsdBucket: 10,
        source: "https://example.com/catalog",
        verifiedAt: "2026-09-14",
      },
    },
  };
}

describe("Strength-3 evidence property (crossing six 0..3 ints with evidence subsets)", () => {
  it("names exactly the axes rated 3 that lack a non-empty evidence string", () => {
    const strengthRecord = fc.record(
      Object.fromEntries(
        STRENGTH_AXES.map((axis) => [axis, fc.integer({ min: 0, max: 3 })]),
      ) as Record<(typeof STRENGTH_AXES)[number], fc.Arbitrary<number>>,
    );

    fc.assert(
      fc.property(
        strengthRecord,
        fc.subarray([...STRENGTH_AXES]),
        (strengthValues, evidenceAxesArray) => {
          const evidenceAxes = new Set<string>(evidenceAxesArray);
          const doc = buildModelDoc(strengthValues, evidenceAxes);
          const errors = validateModel(doc, "prop-test.yaml");

          const expectedMissingAxes = STRENGTH_AXES.filter(
            (axis) => strengthValues[axis] === 3 && !evidenceAxes.has(axis),
          );
          const codeLevelMissingAxes = errors
            .filter((error) => error.field.startsWith("strengths."))
            .map((error) => error.field.slice("strengths.".length));

          expect(new Set(codeLevelMissingAxes)).toEqual(
            new Set(expectedMissingAxes),
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
