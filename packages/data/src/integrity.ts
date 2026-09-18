import type { DataError } from "./errors.js";
import type { DataSet } from "./types.js";

/**
 * `openai` is not backed by any committed subscription file (the
 * OpenAI/ChatGPT-via-Codex subscription is PRD stories #4-#7, out of scope
 * for issue #2). It is kept working here only because it is the design
 * spec's own worked example of a prefix translation (design.md section 4:
 * "`openai/` becomes `openai-codex/` on Pi") and Pi's `prefixMap` is
 * required to declare exactly this entry. Listing it as an explicit,
 * commented, example-only exception documents the judgment call instead of
 * silently accepting it; a future subscription slice should confirm or
 * remove it once `data/subscriptions/openai.yaml` (or equivalent) exists.
 */
const EXAMPLE_ONLY_PROVIDER_PREFIXES = new Set(["openai"]);

function runtimeFile(runtimeId: string): string {
  return `data/runtimes/${runtimeId}.yaml`;
}

/**
 * Cross-file checks no single-file validator can express, because each one
 * compares one file's content against another's: a runtime's `agentMap`
 * against `data/phases/phases.yaml`'s ids, and a runtime's `prefixMap`
 * against the committed subscriptions' `providerPrefix` values. Runs once
 * the whole {@link DataSet} is assembled — `buildBundle`'s input — since
 * that is the only place both sides are in scope together. Never reads a
 * hand-copied list: every expected value comes from `data` itself.
 */
export function checkCrossFileIntegrity(data: DataSet): DataError[] {
  const knownPhaseIds = new Set(data.phases.map((phase) => phase.id));
  const knownProviderPrefixes = new Set(
    data.subscriptions.map((subscription) => subscription.providerPrefix),
  );

  const errors: DataError[] = [];

  for (const runtime of data.runtimes) {
    const file = runtimeFile(runtime.id);
    const firstAgentNameForPhase = new Map<string, string>();

    for (const [agentName, phaseId] of Object.entries(runtime.agentMap)) {
      if (!knownPhaseIds.has(phaseId)) {
        errors.push({
          file,
          field: `agentMap.${agentName}`,
          message: `agentMap value "${phaseId}" is not a phase id declared in data/phases/phases.yaml`,
        });
        continue;
      }

      const firstAgentName = firstAgentNameForPhase.get(phaseId);
      if (firstAgentName !== undefined) {
        errors.push({
          file,
          field: `agentMap.${agentName}`,
          message: `agentMap value "${phaseId}" duplicates the mapping already declared by "${firstAgentName}"; agentMap values must be unique within a runtime`,
        });
        continue;
      }
      firstAgentNameForPhase.set(phaseId, agentName);
    }

    for (const prefix of Object.keys(runtime.prefixMap)) {
      if (knownProviderPrefixes.has(prefix) || EXAMPLE_ONLY_PROVIDER_PREFIXES.has(prefix)) {
        continue;
      }
      errors.push({
        file,
        field: `prefixMap.${prefix}`,
        message: `prefixMap key "${prefix}" is not a providerPrefix declared by any subscription under data/subscriptions/ (only the explicit, example-only "openai" exception is allowed until that subscription file exists)`,
      });
    }
  }

  return errors;
}
