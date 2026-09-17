import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readYamlFile, validateRuntime } from "../src/index.js";

/**
 * Expected `agentMap` entry counts, verified 2026-09-17 against the live
 * installs at `~/.pi/agent/agents/`, `~/.config/opencode/opencode.json`,
 * `~/.claude/agents/`, and `~/.codex/agents/` (T9.1). Claude Code's count
 * (19) includes `sdd-research`, which the design spec text
 * (docs/superpowers/specs/2026-09-14-model-profile-site-design.md line 66,
 * "Claude Code 18") predates; the live install wins per maintainer decision
 * on 2026-09-14.
 */
const EXPECTED_AGENT_MAP_COUNTS: Record<string, number> = {
  pi: 24,
  opencode: 20,
  "claude-code": 19,
  codex: 17,
};

/**
 * The 27 canonical phase ids, duplicated from phases.test.ts's own
 * derivation (same source: the design spec table, section 3.2). Kept here
 * rather than imported so this file can assert "every agentMap value is one
 * of these ids" without coupling to the other test module's internals.
 */
const ORCHESTRATION_IDS = ["gentle-orchestrator"] as const;

const SDD_IDS = [
  "sdd-init",
  "sdd-explore",
  "sdd-research",
  "sdd-propose",
  "sdd-spec",
  "sdd-design",
  "sdd-tasks",
  "sdd-apply",
  "sdd-remediate",
  "sdd-verify",
  "sdd-archive",
  "sdd-onboard",
  "sdd-status",
  "sdd-sync",
] as const;

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
  ...SDD_IDS,
  ...JUDGMENT_DAY_IDS,
  ...REVIEW_IDS,
  ...WORKER_IDS,
];

/**
 * "Known" subscription provider prefixes a runtime's `prefixMap` may key on.
 *
 * - `opencode-go` is `data/subscriptions/opencode-go.yaml`'s `providerPrefix`
 *   field — the only subscription committed under issue #2's scope.
 * - `openai` is not backed by any committed subscription file yet (the
 *   OpenAI/ChatGPT-via-Codex subscription is PRD stories #4-#7, out of scope
 *   here); it is the frozen design spec's own worked example of the concept
 *   (design.md section 4: "a prefix map (subscription provider prefix ->
 *   runtime prefix, so `openai/` becomes `openai-codex/` on Pi)"), and slice
 *   9's task instructions require Pi's `prefixMap` to declare exactly this
 *   translation. Treating it as "known" here documents that judgment call
 *   instead of hiding it; a future subscription slice should confirm or
 *   replace it once `data/subscriptions/openai.yaml` (or equivalent) exists.
 */
const KNOWN_PROVIDER_PREFIXES = ["opencode-go", "openai"] as const;

interface RuntimeDoc {
  id: string;
  displayName: string;
  agentMap: Record<string, string>;
  prefixMap: Record<string, string>;
}

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(here, "../../../data");
const runtimesDir = join(dataRoot, "runtimes");

function runtimePath(id: string): string {
  return join(runtimesDir, `${id}.yaml`);
}

function loadRuntime(id: string): RuntimeDoc {
  return readYamlFile(runtimePath(id), dataRoot) as RuntimeDoc;
}

const RUNTIME_IDS = Object.keys(EXPECTED_AGENT_MAP_COUNTS);

describe("runtime mappings", () => {
  it.each(RUNTIME_IDS)("%s validates against the runtime schema", (id) => {
    const doc = loadRuntime(id);
    expect(validateRuntime(doc, runtimePath(id))).toEqual([]);
  });

  it.each(RUNTIME_IDS)("%s declares its own id and a display name", (id) => {
    const doc = loadRuntime(id);
    expect(doc.id).toBe(id);
    expect(doc.displayName.length).toBeGreaterThan(0);
  });

  for (const [id, expectedCount] of Object.entries(EXPECTED_AGENT_MAP_COUNTS)) {
    it(`${id} has exactly ${expectedCount} agentMap entries`, () => {
      const doc = loadRuntime(id);
      expect(Object.keys(doc.agentMap).length).toBe(expectedCount);
    });
  }

  it.each(RUNTIME_IDS)(
    "%s's every agentMap value resolves to a canonical phase id",
    (id) => {
      const doc = loadRuntime(id);
      for (const [runtimeName, phaseId] of Object.entries(doc.agentMap)) {
        expect(
          CANONICAL_PHASE_IDS.includes(phaseId),
          `${id}.yaml agentMap["${runtimeName}"] = "${phaseId}" is not a canonical phase id`,
        ).toBe(true);
      }
    },
  );

  it.each(RUNTIME_IDS)(
    "%s's every prefixMap key is a known provider prefix",
    (id) => {
      const doc = loadRuntime(id);
      for (const prefix of Object.keys(doc.prefixMap)) {
        expect(
          (KNOWN_PROVIDER_PREFIXES as readonly string[]).includes(prefix),
          `${id}.yaml prefixMap key "${prefix}" is not a known provider prefix`,
        ).toBe(true);
      }
    },
  );

  it.each(RUNTIME_IDS)("%s declares at least one prefixMap entry", (id) => {
    const doc = loadRuntime(id);
    expect(Object.keys(doc.prefixMap).length).toBeGreaterThan(0);
  });

  // Pinned scenario from the runtime-mappings spec: Pi's own agent name for
  // sdd-propose is spelled `sdd-proposal`.
  it("pi maps its sdd-proposal agent name to the canonical sdd-propose", () => {
    const doc = loadRuntime("pi");
    expect(doc.agentMap["sdd-proposal"]).toBe("sdd-propose");
  });

  // Pinned scenario from the runtime-mappings spec: Pi translates the
  // OpenAI provider prefix to its own `openai-codex` spelling.
  it("pi translates the openai provider prefix to openai-codex", () => {
    const doc = loadRuntime("pi");
    expect(doc.prefixMap["openai"]).toBe("openai-codex");
  });
});
