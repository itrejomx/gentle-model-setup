import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkCrossFileIntegrity, readYamlFile, validateRuntime } from "../src/index.js";
import type { DataSet, PhaseRecord, SubscriptionRecord } from "../src/types.js";

/**
 * Expected `agentMap` entry counts, verified 2026-10-06 (issue #40) against
 * the Gentle AI 4.0 installs at `~/.pi/agent/agents/` (10 files),
 * `~/.config/opencode/opencode.json` (14 base agent keys, 13 once the
 * `gentleman` primary persona agent, which has no model of its own, is
 * excluded), and `~/.claude/agents/` (the 8 files dated 2026-10-04).
 * Codex's count (7) is the pre-4.0 install minus its `sdd-*` entries: its
 * `~/.codex/agents/` predates 4.0 and awaits a `gentle-ai sync`.
 * OpenCode's count includes `gentle-orchestrator`: OpenCode is the only
 * runtime where the orchestrator is a configured agent with its own model;
 * in the other three it is the active session model, so they carry no
 * entry for it.
 */
const EXPECTED_AGENT_MAP_COUNTS: Record<string, number> = {
  pi: 10,
  opencode: 13,
  "claude-code": 8,
  codex: 7,
};

interface RuntimeDoc {
  id: string;
  displayName: string;
  agentMap: Record<string, string>;
  prefixMap: Record<string, string>;
}

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(here, "../../../data");
const runtimesDir = join(dataRoot, "runtimes");
const phasesPath = join(dataRoot, "phases/phases.yaml");
const subscriptionsDir = join(dataRoot, "subscriptions");

function runtimePath(id: string): string {
  return join(runtimesDir, `${id}.yaml`);
}

function loadRuntime(id: string): RuntimeDoc {
  return readYamlFile(runtimePath(id), dataRoot) as RuntimeDoc;
}

/** Loads the canonical phase ids straight from `data/phases/phases.yaml`
 * (T10.10) — never from a list copy-pasted into this test file. */
function loadPhaseRecords(): PhaseRecord[] {
  const doc = readYamlFile(phasesPath, dataRoot) as { phases: PhaseRecord[] };
  return doc.phases;
}

/** Loads every committed subscription's `providerPrefix` (T10.10) — never
 * from a hardcoded array. `openai` has no backing subscription file yet
 * (PRD stories #4-#7, out of scope for issue #2); `checkCrossFileIntegrity`
 * keeps it working only as an explicit, commented, example-only exception
 * for the design spec's worked example (design.md section 4: `openai` ->
 * `openai-codex` on Pi). */
function loadSubscriptionRecords(): SubscriptionRecord[] {
  return readdirSync(subscriptionsDir)
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => readYamlFile(join(subscriptionsDir, name), dataRoot) as SubscriptionRecord);
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

  it.each(RUNTIME_IDS)("%s declares at least one prefixMap entry", (id) => {
    const doc = loadRuntime(id);
    expect(Object.keys(doc.prefixMap).length).toBeGreaterThan(0);
  });

  it.each(RUNTIME_IDS)("%s's agentMap values are unique", (id) => {
    const doc = loadRuntime(id);
    const targetPhaseIds = Object.values(doc.agentMap);
    expect(new Set(targetPhaseIds).size).toBe(targetPhaseIds.length);
  });

  // T10.10 (slice 9 advisory, reopened after review flagged this file's own
  // hand-copied 27-id list and prefix array): every agentMap value against
  // the ids data/phases/phases.yaml actually declares, every prefixMap key
  // against the providerPrefix values the committed subscriptions actually
  // declare, and agentMap uniqueness within each runtime — all in one pass
  // over the real data files, through the same cross-file integrity check
  // buildBundle runs on its input.
  it("every runtime's agentMap and prefixMap pass cross-file integrity against the real data files", () => {
    const dataSet: DataSet = {
      subscriptions: loadSubscriptionRecords(),
      models: [],
      phases: loadPhaseRecords(),
      overrides: [],
      runtimes: RUNTIME_IDS.map((id) => loadRuntime(id)),
    };
    expect(checkCrossFileIntegrity(dataSet)).toEqual([]);
  });

  // T10.10: the runtime files this test suite iterates (RUNTIME_IDS, driven
  // by EXPECTED_AGENT_MAP_COUNTS) must be exactly the files committed under
  // data/runtimes/ — so a new or removed runtime file cannot go untested.
  it("data/runtimes/ contains exactly the runtime files this suite iterates", () => {
    const committedIds = readdirSync(runtimesDir)
      .filter((name) => name.endsWith(".yaml"))
      .map((name) => name.replace(/\.yaml$/, ""))
      .sort();
    expect(committedIds).toEqual([...RUNTIME_IDS].sort());
  });

  // Issue #40: Gentle AI 4.0 retired SDD, so no runtime maps an `sdd-*`
  // agent name or targets an `sdd-*` phase id.
  it.each(RUNTIME_IDS)("%s's agentMap has no sdd-* key or value", (id) => {
    const { agentMap } = loadRuntime(id);
    const ids = [...Object.keys(agentMap), ...Object.values(agentMap)];
    expect(ids.filter((name) => name.startsWith("sdd-"))).toEqual([]);
  });

  // Issue #40 (slice A review, R3): every canonical Phase is mapped by at
  // least one runtime. The integrity check above only rejects an unknown
  // agentMap value; it cannot notice a runtime edit that drops the last
  // mapping of a Phase. Both sides are read from the data files.
  it("the union of every runtime's agentMap values is exactly the canonical Phase set", () => {
    const mapped = new Set(RUNTIME_IDS.flatMap((id) => Object.values(loadRuntime(id).agentMap)));
    const canonical = loadPhaseRecords().map((phase) => phase.id);
    expect([...mapped].sort()).toEqual([...canonical].sort());
  });

  // `gentle-orchestrator` is a canonical phase that only OpenCode can map:
  // there it is a configured agent with its own model, while Pi, Claude
  // Code, and Codex run the orchestrator as the active session model.
  it("only opencode maps the gentle-orchestrator phase", () => {
    const runtimesMappingOrchestrator = RUNTIME_IDS.filter((id) =>
      Object.values(loadRuntime(id).agentMap).includes("gentle-orchestrator"),
    );
    expect(runtimesMappingOrchestrator).toEqual(["opencode"]);
  });

  // Pinned scenario from the runtime-mappings spec: Pi translates the
  // OpenAI provider prefix to its own `openai-codex` spelling.
  it("pi translates the openai provider prefix to openai-codex", () => {
    const doc = loadRuntime("pi");
    expect(doc.prefixMap["openai"]).toBe("openai-codex");
  });
});
