# Apply Progress: scaffold-data-contract-go-catalog

## Work Unit 1 / Phase 1 (PR 1) — Complete

Completed pnpm workspace root scaffold + `packages/data` skeleton with a
`VERSION` smoke test, committed as `78541e9 chore: scaffold pnpm workspace and
packages/data skeleton` on branch `feat/2-workspace-scaffold` (stacked on
`docs/2-sdd-planning`), tasks marked `[x]` in `905fd43 docs: mark work unit 1
tasks complete`.

- Created: root `package.json` (`packageManager: pnpm@12.4.1`, `engines.node
  >=22`), `pnpm-workspace.yaml` (globs `packages/*`, `apps/*`, `allowBuilds: {
  esbuild: true }`), `tsconfig.base.json`, `.nvmrc` (22), `packages/data/package.json`
  (`@gentle-ai/profile-data`), `packages/data/tsconfig.json`,
  `packages/data/vitest.config.ts`, `packages/data/src/index.ts` (`VERSION`),
  `packages/data/test/index.test.ts`.
- Modified: `.gitignore`.
- Tasks 1.1–1.5 marked `[x]`.
- Verification: `pnpm install`, `pnpm -r typecheck`, `pnpm test` all green;
  diff `docs/2-sdd-planning..HEAD` = 90 authored lines.

## Work Unit 2 / Phase 2 (PR 2) — Complete

Implemented subscription and model JSON Schemas plus the loader core
(YAML parsing with alias-bomb/containment guards, Ajv 2020 validation naming
file and field, the code-level Strength-3 evidence check, and pure Budget
Class derivation), on branch `feat/2-schemas-loader-core` (stacked on
`feat/2-workspace-scaffold`, PR #18), committed as:

- `0d77892 feat(data): add subscription and model JSON Schemas`
- `9d7de69 feat(data): YAML loader with Ajv validation naming file and field`
- `6f90bdb feat(data): derive Budget Class from thresholds`
- `c5fc00f docs: mark work unit 2 tasks complete`

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `data/schemas/subscription.schema.json` | Created | 2020-12 schema: `billingModel` enum, `budgetClass.derivedFrom`/`thresholds` (`{class, max}`), `plans` array, `catalogSourceUrl`, `verifiedAt`; `if billingModel==capped then required:[plans]` |
| `data/schemas/model.schema.json` | Created | 2020-12 schema: six strength axes (integer 0..3), `evidence` object, six `allOf` if/then blocks requiring `evidence.<axis>` when that axis is 3, `privacy` (`trainsOnData`, `logRetentionDays` number\|null), `effortVariants` enum array, `plans` map (`requestsPer5h`/`requestsPerWeek`/`requestsPerMonth`/`monthlyUsdBucket`/`source`/`verifiedAt`, optional `multiplier`/`multiplierExpiresAt`), `status` enum, `id` pattern |
| `packages/data/src/types.ts` | Created | `BudgetClass`, `Threshold` |
| `packages/data/src/errors.ts` | Created | `DataError` interface, `DataValidationError` class |
| `packages/data/src/yaml.ts` | Created | `parseYaml` (safe options: `schema: 'core'`, `merge: false`, `maxAliasCount: 100`), `YamlLoadError`, `resolveContainedPath` (realpath containment under `rootDir`), `readYamlFile` |
| `packages/data/src/validate.ts` | Created | Ajv 2020 instance + `ajv-formats`, `validateSubscription`, `validateModel`, `instancePath`→dotted `field` rendering, code-level `checkStrengthEvidence` naming the offending axis |
| `packages/data/src/budget-class.ts` | Created | `deriveBudgetClass` (pure, no I/O; ascending-threshold walk; `null` cap → `null`; throws on non-ascending thresholds) |
| `packages/data/src/index.ts` | Modified | Exports `DataError`, `DataValidationError`, `BudgetClass`, `Threshold`, `validateModel`, `validateSubscription`, `deriveBudgetClass`, `parseYaml`, `readYamlFile`, `resolveContainedPath`, `YamlLoadError` |
| `packages/data/package.json` | Modified | Added `@types/node` devDependency (see Deviations) |
| `tsconfig.base.json` | Modified | Added explicit `"types": ["node"]` (see Deviations) |
| `packages/data/test/validate.test.ts` | Created | Fixture-driven tests for `validateSubscription`/`validateModel`: valid pass, missing `billingModel` names field, wrong field type names field, strength-3-no-evidence names axis, path-traversal `id` names `id` |
| `packages/data/test/loader-containment.test.ts` | Created | Threat-matrix tests: in-root file loads; symlink escaping root is rejected; alias-bomb fixture is rejected without hanging |
| `packages/data/test/strength-evidence.property.test.ts` | Created | fast-check property: for every combination of six 0..3 strength ints crossed with evidence subsets, the code-level check names exactly the axes at 3 lacking evidence |
| `packages/data/test/budget-class.test.ts` | Created | Table test for boundaries 199/200/499/500/5000/5001 and `null` cap; throws on non-ascending thresholds; fast-check monotonicity property |
| `packages/data/test/fixtures/valid/subscription/subscription.yaml` | Created | Valid capped subscription fixture |
| `packages/data/test/fixtures/valid/model/model.yaml` | Created | Valid model fixture (strength-3 with evidence) |
| `packages/data/test/fixtures/invalid/subscription-missing-billing-model/{subscription.yaml,expected-errors.json}` | Created | Missing `billingModel` case |
| `packages/data/test/fixtures/invalid/model-wrong-field-type/{model.yaml,expected-errors.json}` | Created | `longContext` as string |
| `packages/data/test/fixtures/invalid/model-strength-three-no-evidence/model.yaml` | Created | `multimodal: 3` with no `evidence` |
| `packages/data/test/fixtures/invalid/model-bad-id/model.yaml` | Created | `id: "../escape"` |
| `packages/data/test/fixtures/invalid/alias-bomb/data.yaml` | Created | Billion-laughs style alias expansion (5 levels, 5-way fan-out) |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.2/2.3 | `test/validate.test.ts` | Unit | N/A (new) | ✅ Written — `Cannot find module '../src/validate.js'` | ✅ Passed — 6/6 after implementing types/errors/yaml/validate | ✅ 6 cases (valid sub, missing field, valid model, wrong type, strength-3-no-evidence, bad id) | ✅ Extracted `toDataErrors`/`instancePathToField`/`checkStrengthEvidence` helpers |
| 2.4/2.5 | `test/loader-containment.test.ts` | Unit | N/A (new) | ✅ Written — `readYamlFile is not a function` (3/3 failed) | ✅ Passed — 3/3 after implementing `resolveContainedPath`/`readYamlFile` | ✅ 3 cases (in-root load, symlink escape, alias bomb) | ➖ None needed |
| 2.6/2.7 | `test/strength-evidence.property.test.ts` | Property | N/A (new) | ⚠️ See Deviations — passed immediately | ✅ Passed — 50 runs green, no implementation change | ✅ fast-check generates the full 0..3×evidence-subset space | ➖ None needed |
| 2.8/2.9 | `test/budget-class.test.ts` | Unit + Property | N/A (new) | ✅ Written — `Cannot find module '../src/budget-class.js'` | ✅ Passed — 9/9 after implementing `deriveBudgetClass` | ✅ 6 boundary cases + null-cap + throw case + 100-run monotonicity property | ➖ None needed — implementation was minimal from the first pass |

### Test Summary

- **Total tests written**: 20 (across 5 test files)
- **Total tests passing**: 20
- **Layers used**: Unit (17), Property (2 files / 150 property runs total), Data-driven fixture (part of Unit)
- **Approval tests** (refactoring): None — no refactoring tasks in this phase
- **Pure functions created**: `deriveBudgetClass`, `parseYaml`, `instancePathToField`, `checkStrengthEvidence` (schema errors aside, these take only their arguments and return a value with no I/O)

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter @gentle-ai/profile-data exec vitest run validate budget-class` → 2 files, 15 tests passed (see Deviations for the `pnpm run test -- <args>` filter caveat) |
| Runtime harness command/scenario and exact result | N/A — unit/property tests call loader functions directly against fixtures and temp-dir-backed filesystem scenarios (symlink escape, alias bomb); no network or process boundary in this slice |
| Rollback boundary | `git revert 6f90bdb 9d7de69 0d77892` (in that order) removes `data/schemas/*.json`, `packages/data/src/{types,errors,yaml,validate,budget-class}.ts`, their tests/fixtures, the `@types/node` devDependency, and the `tsconfig.base.json` `types` addition, restoring exactly the Work Unit 1 state; nothing downstream (Phases 3–10) exists yet to depend on it |

### Deviations from Design

1. **Strength-3 RED/GREEN folded into 2.2/2.3.** `validate.test.ts` (written for task 2.2) already includes a case asserting `multimodal: 3` with no evidence fails naming `strengths.multimodal`. Making that single fixture case pass during 2.3's GREEN step required implementing the full code-level Strength-3 check at that point, ahead of the standalone RED test planned for task 2.6. The 2.6 property test (`strength-evidence.property.test.ts`) therefore passed on its first run with zero implementation changes; it served as triangulation (generalizing the single-fixture case across the full 0..3×evidence-subset space via fast-check) rather than a fresh RED→GREEN cycle. No production code was written speculatively ahead of a failing test — the check was built to satisfy the earlier fixture RED, and the property test verified it generalizes correctly.
2. **`@types/node` added as a devDependency**, and `tsconfig.base.json` gained an explicit `"types": ["node"]`. `src/validate.ts`/`src/yaml.ts` and the new tests use `node:fs`, `node:url`, `node:module`, and `import.meta.url`, none of which compiled without `@types/node` present. Design's File Changes table does not list this dependency because Phase 1 had no code needing Node's ambient types; adding it here is required, not optional.
3. **TypeScript 7 (`^7.0.2`, the installed native/Go-ported compiler) double-wraps the synthesized default export of `ajv` and `ajv-formats`** under `moduleResolution: nodenext` — both are CommonJS packages with no `package.json` `"type"` field. A value-level `import Ajv2020 from "ajv/dist/2020.js"` types as `typeof import(".../ajv/dist/2020")` (the whole module namespace) instead of the class, so `new Ajv2020()` fails to typecheck (`TS2351: not constructable`) even though it runs correctly at runtime. Verified this is a genuine compiler-resolution quirk, not a misconfiguration: `moduleResolution: bundler` does not exhibit it, and a type-only `typeof import("ajv/dist/2020.js").default` query (as opposed to a value import) resolves to the correct constructor type. Worked around it in `validate.ts` by loading the real values through `node:module`'s `createRequire` and casting to the correctly-resolved type-only query result — this keeps both compile-time types and runtime behavior accurate without weakening `strict`, disabling `esModuleInterop`, or changing the project's `nodenext` module resolution.
4. **`pnpm run test -- <pattern>`, and therefore `pnpm --filter @gentle-ai/profile-data test -- validate budget-class` exactly as written in the tasks.md forecast table, does not filter test files** under this repo's pnpm 12 + Vitest 5 combination: pnpm forwards a literal `--` token ahead of the pattern args into the `vitest run` script, and Vitest's CLI then runs the full suite instead of narrowing to the named files. Confirmed the root cause (extra literal `--`) and the working equivalent: `pnpm --filter @gentle-ai/profile-data exec vitest run validate budget-class` (or, from inside `packages/data`, `pnpm vitest run validate budget-class`) filters correctly to the intended 2 files / 15 tests. No source change was made for this — it is a CLI invocation note for future work units using the same forecast-table command pattern.
5. **Review budget overage.** Design estimated ~380 authored lines for this slice; the actual diff (`feat/2-workspace-scaffold..HEAD`, lockfile excluded, fixtures included per this work unit's assignment) is **1235 lines**. The two JSON Schema files alone are 532 lines: JSON Schema 2020-12's `allOf`/`if`/`then` syntax is verbose, and Ajv's `strict: true` mode additionally required adding explicit `"type": "object"` annotations inside each `if.properties.strengths` block and `"properties"` stubs inside each `then` block (for `plans` and each `evidence.<axis>`) to satisfy `strictTypes`/`strictRequired` — six repetitions of that boilerplate account for most of the size difference from design's estimate. No comments, blank lines, docs, or tests were removed or compressed to reduce this count; the six axes and the strict-mode-required properties are irreducible restatements of the same rule, not accidental duplication. Recommend `size:exception` for this PR, or a retroactive re-slice (schemas as their own PR, loader+budget-class as a second) if the maintainer wants strict 400-line PRs going forward — this work unit's assignment fixed it as one PR, so no further slicing was made unilaterally.

### Issues Found

None beyond the deviations above.

### Remaining Tasks (as of Work Unit 2)

- [ ] Phase 3: Phases/Runtime/Override Schemas (Work Unit 3, PR 3) — tasks 3.1–3.4
- [ ] Phase 4: Go Subscription + Source Fixtures (Work Unit 4, PR 4) — tasks 4.1–4.4
- [ ] Phase 5: Catalog — moonshot/zhipu/xai/openai (Work Unit 5, PR 5) — tasks 5.1–5.4
- [ ] Phase 6: Catalog — alibaba/deepseek (Work Unit 6, PR 6) — tasks 6.1–6.4
- [ ] Phase 7: Catalog — minimax/xiaomi/tencent/meituan/meta (Work Unit 7, PR 7) — tasks 7.1–7.4
- [ ] Phase 8: Canonical Phases (Work Unit 8, PR 8) — tasks 8.1–8.3
- [ ] Phase 9: Runtime Mappings (Work Unit 9, PR 9) — tasks 9.1–9.4
- [ ] Phase 10: Bundle + CLI + CI (Work Unit 10, PR 10) — tasks 10.1–10.8

### Workload / PR Boundary (Work Unit 2)

- Mode: stacked PR slice (`stacked-to-main`, per tasks.md Review Workload Forecast)
- Current work unit: Work Unit 2 (Phase 2), targeting branch `feat/2-workspace-scaffold` (PR #18); this branch is `feat/2-schemas-loader-core`
- Boundary: starts from the Work Unit 1 scaffold (VERSION smoke test only); ends with subscription/model schemas, the full loader core (parse, containment, validate, Strength-3 check), and `deriveBudgetClass`, all covered by passing tests and green typecheck
- Estimated review budget impact: **over budget** — 1235 authored lines vs. the 400-line default and design's ~380 estimate for this slice; see Deviation 5 for the breakdown and `size:exception` recommendation

## Work Unit 3 / Phase 3 (PR 3) — Complete

Implemented the phases, runtime, and override JSON Schemas plus their
validators, on branch `feat/2-phases-runtime-override-schemas` (stacked on
`feat/2-schemas-loader-core`, PR #19), committed as:

- `2689cc6 feat(data): add phases, runtime, and override JSON Schemas`
- `92fcd79 feat(data): validators for phases, runtimes, and overrides`

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `data/schemas/phases.schema.json` | Created | 2020-12 schema: top-level `phases` array (`minItems: 1`); each entry requires `id`, `group` (enum `orchestration\|sdd\|judgment-day\|review\|workers`), `callPattern` (enum `one-shot\|loop`), `role` (enum `implementer\|verifier\|judge-a\|judge-b\|neutral`), `weights` (object, all six strength axes required, each `number` `0..1`) |
| `data/schemas/runtime.schema.json` | Created | 2020-12 schema: `id`, `displayName`, `agentMap` and `prefixMap` both `type: object`, `minProperties: 1`, `additionalProperties: { type: string }` |
| `data/schemas/override.schema.json` | Created | 2020-12 schema: `tier` (enum `HIGH\|BALANCED\|LEAN`), `phase`, `requires` (array, `minItems: 1`, string items), `model`, `effort` (enum `low\|medium\|high`), `reason`, `author`, `pr` (`format: uri`) |
| `packages/data/src/validate.ts` | Modified | Added `validatePhases`, `validateRuntime`, `validateOverride` (compile + `toDataErrors`, same pattern as `validateSubscription`); extracted the shared compile-then-report logic from all four schema-only validators into `validateAgainstSchema(validateFn, doc, file)` (REFACTOR step, ran after GREEN, tests stayed green throughout) |
| `packages/data/src/index.ts` | Modified | Exports `validatePhases`, `validateRuntime`, `validateOverride` |
| `packages/data/test/validate.test.ts` | Modified | Added `describe` blocks for `validatePhases`, `validateRuntime`, `validateOverride`: one valid-accepts case and one invalid-rejects-naming-field case each |
| `packages/data/test/fixtures/valid/phases/phases.yaml` | Created | Two valid phase entries (`sdd-apply` loop/implementer, `sdd-verify` one-shot/verifier) |
| `packages/data/test/fixtures/invalid/phases-missing-weights-axis/phases.yaml` | Created | `jd-judge-b` entry with `weights` missing the `cheap` axis |
| `packages/data/test/fixtures/valid/runtime/runtime.yaml` | Created | Valid `claude-code` runtime mapping (`agentMap`, `prefixMap` each non-empty) |
| `packages/data/test/fixtures/invalid/runtime-agentmap-non-string/runtime.yaml` | Created | `agentMap.sdd-propose: 42` (non-string value) |
| `packages/data/test/fixtures/valid/override/override.yaml` | Created | Valid override (`tier: BALANCED`, `requires: [opencode-go]`, etc.) |
| `packages/data/test/fixtures/invalid/override-bad-tier/override.yaml` | Created | `tier: EXTREME` (outside the enum) |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1–3.3 (phases) | `test/validate.test.ts` | Unit | ✅ 12/12 (pre-existing validate.test.ts cases) | ✅ Written — `TypeError: validatePhases is not a function` | ✅ Passed — 12/12 after implementing `validatePhases` + schema | ✅ 2 cases (valid collection, missing-axis reject naming `phases.0.weights.cheap`) | ✅ Extracted `validateAgainstSchema` shared helper |
| 3.1–3.3 (runtime) | `test/validate.test.ts` | Unit | ✅ (same file, same baseline) | ✅ Written — `TypeError: validateRuntime is not a function` | ✅ Passed — after implementing `validateRuntime` + schema | ✅ 2 cases (valid mapping, non-string `agentMap` value naming `agentMap.sdd-propose`) | ✅ Same extraction |
| 3.1–3.3 (override) | `test/validate.test.ts` | Unit | ✅ (same file, same baseline) | ✅ Written — `TypeError: validateOverride is not a function` | ✅ Passed — after implementing `validateOverride` + schema | ✅ 2 cases (valid override, `tier: EXTREME` reject naming `tier`) | ✅ Same extraction |

### Test Summary

- **Total tests written this unit**: 6 (2 `describe` cases × 3 validators)
- **Total tests passing (package)**: 26 (20 carried over from Work Units 1–2, plus 6 new)
- **Layers used**: Unit (6 new; fixture-driven, same style as existing `validateSubscription`/`validateModel` tests)
- **Approval tests** (refactoring): None — `validateAgainstSchema` extraction is a pure internal refactor with identical external behavior, verified by the full existing + new test suite staying green before and after
- **Pure functions created**: `validateAgainstSchema` (internal helper, no I/O), `validatePhases`, `validateRuntime`, `validateOverride` (each pure: parsed doc in, `DataError[]` out)

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter @gentle-ai/profile-data exec vitest run validate` → 1 file, 12 tests passed |
| Runtime harness command/scenario and exact result | N/A — unit tests call the validator functions directly against fixtures; no network, process, or filesystem-containment boundary in this slice (schema-only validation, no loader I/O change) |
| Rollback boundary | `git revert 92fcd79 2689cc6` (in that order) removes the three schema files, the three validator functions, their `index.ts` exports, the `validateAgainstSchema` refactor, and the new test file section + fixtures, restoring exactly the Work Unit 2 state; nothing downstream (Phases 4–10) exists yet to depend on these schemas |

### Deviations from Design

None — implementation matches design.md's `Interfaces / Contracts` → `Schemas` table (required fields, enums, `agentMap`/`prefixMap` shape) and the Loader API's `validatePhases`/`validateRuntime`/`validateOverride` signatures exactly. `phases.schema.json` intentionally does not hard-code the 27-row count via `minItems`/`maxItems` — the design explicitly assigns that check to a test in Work Unit 8, not the schema.

### Issues Found

None.

### Remaining Tasks

- [ ] Phase 4: Go Subscription + Source Fixtures (Work Unit 4, PR 4) — tasks 4.1–4.4
- [ ] Phase 5: Catalog — moonshot/zhipu/xai/openai (Work Unit 5, PR 5) — tasks 5.1–5.4
- [ ] Phase 6: Catalog — alibaba/deepseek (Work Unit 6, PR 6) — tasks 6.1–6.4
- [ ] Phase 7: Catalog — minimax/xiaomi/tencent/meituan/meta (Work Unit 7, PR 7) — tasks 7.1–7.4
- [ ] Phase 8: Canonical Phases (Work Unit 8, PR 8) — tasks 8.1–8.3
- [ ] Phase 9: Runtime Mappings (Work Unit 9, PR 9) — tasks 9.1–9.4
- [ ] Phase 10: Bundle + CLI + CI (Work Unit 10, PR 10) — tasks 10.1–10.8

### Workload / PR Boundary

- Mode: stacked PR slice (`stacked-to-main`, per tasks.md Review Workload Forecast)
- Current work unit: Work Unit 3 (Phase 3), branch `feat/2-phases-runtime-override-schemas` (stacked on `feat/2-schemas-loader-core`, PR #19)
- Boundary: starts from the Work Unit 2 state (subscription/model schemas, loader core, Budget Class); ends with the phases/runtime/override schemas and their three validators, all covered by passing tests and green typecheck
- Estimated review budget impact: within budget — `git diff --stat feat/2-schemas-loader-core..HEAD` (lockfile excluded) = 330 insertions + 8 deletions = 338 authored lines, under the 400-line default

### Status

19/50 tasks complete (1.1–1.5, 2.1–2.10, 3.1–3.4). Ready for verify on Work Unit 3, or for `sdd-apply` to continue with Work Unit 4.

## Work Unit 4 / Phase 4 (PR 4) — Complete

Encoded the OpenCode Go subscription (capped billing model, the four Budget
Class thresholds, Plan `go`, catalog source URL, `verifiedAt`) and committed
the two pandoc-converted source document fixtures as classification
evidence, on branch `feat/2-go-subscription-fixtures` (stacked on
`feat/2-phases-runtime-override-schemas`, PR #20), committed as:

- `ec5dff9 feat(data): add OpenCode Go subscription with Budget Class thresholds`
- `94777de docs(data): add source document fixtures`
- `67fd4fa docs: mark work unit 4 tasks complete`

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `data/subscriptions/opencode-go.yaml` | Created | `id: opencode-go`, `displayName: OpenCode Go`, `providerPrefix: opencode-go`, `billingModel: capped`, `budgetClass.derivedFrom: requestsPer5h` with thresholds `{sniper: 199, semi: 499, workhorse: 5000, volume: null}`, `plans: [{id: go, displayName: Go, priceUsdPerMonth: 10}]`, `catalogSourceUrl: https://opencode.ai/docs/go`, `verifiedAt: 2026-09-14` — matches design.md's worked example exactly, no Budget Class stored on the model side |
| `packages/data/test/subscription-opencode-go.test.ts` | Created | Loads the real committed file via `readYamlFile(subscriptionPath, dataRoot)` (not a fixture copy, per design's "glob the real tree" testing strategy), asserting schema validity, `billingModel: capped`, ascending thresholds, Plan `go` present, `catalogSourceUrl`, `verifiedAt`, and `deriveBudgetClass` against the file's own thresholds for `220 → semi` and `1350 → workhorse` |
| `data/sources/perfiles-sdd-opencode-go-only-v2.2.md` | Created | Pandoc GFM conversion of `Perfiles_SDD_OpenCode_Go_Only_v2.2.docx` (2026-08-19), copied from the read-only pre-converted scratchpad fixture |
| `data/sources/gentle-ai-opencode-gpt-5.6.md` | Created | Pandoc GFM conversion of `Gentle AI OpenCode GPT 5.6.docx` (2026-07-22), copied from the read-only pre-converted scratchpad fixture |
| `data/sources/README.md` | Created | States origin docx filenames, document dates, `pandoc -t gfm` conversion method, and that these files are evidence, never data consumed by the loader or schemas |
| `openspec/changes/scaffold-data-contract-go-catalog/tasks.md` | Modified | Tasks 4.1–4.4 marked `[x]` |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1/4.2 | `test/subscription-opencode-go.test.ts` | Unit (data-driven, real tree) | N/A (new file) | ✅ Written — `YamlLoadError: unable to resolve path: ENOENT ... 'data/subscriptions'` (file did not exist) | ✅ Passed — 7/7 after creating `data/subscriptions/opencode-go.yaml` | ✅ 7 assertions across 5 `it`/`it.each` blocks (schema validity, billing model, thresholds, plan presence, catalog metadata, two `deriveBudgetClass` boundary cases: 220→semi, 1350→workhorse) | ➖ None needed — data file, no logic to extract |
| 4.3 | N/A — fixture copy, no test targets fixture content | N/A | N/A (new files) | N/A — design and spec require the fixtures be present as evidence, not validated by a test; "Triangulation skipped: purely structural evidence files, no branching logic to exercise" | N/A | N/A | N/A |

### Test Summary

- **Total tests written this unit**: 7 (1 test file, `it`/`it.each` cases)
- **Total tests passing (package)**: 40 (33 carried over from Work Units 1–3, plus 7 new)
- **Layers used**: Unit / data-driven-against-real-tree (7 new; reads the actual committed `data/subscriptions/opencode-go.yaml`, not a copied fixture, per design's catalog testing strategy)
- **Approval tests** (refactoring): None — no refactoring tasks in this unit
- **Pure functions created**: None new — reused `readYamlFile`, `validateSubscription`, `deriveBudgetClass` from Work Unit 2 unchanged

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter @gentle-ai/profile-data exec vitest run subscription-opencode-go` → 1 file, 7 tests passed |
| Runtime harness command/scenario and exact result | N/A — no network call in this slice; the subscription file is static, hand-authored data validated purely against the loader API with no I/O boundary beyond the filesystem read already exercised by `readYamlFile` |
| Rollback boundary | `git revert 67fd4fa 94777de ec5dff9` (in that order) removes `data/subscriptions/opencode-go.yaml`, `packages/data/test/subscription-opencode-go.test.ts`, `data/sources/*`, and the tasks.md checkbox update, restoring exactly the Work Unit 3 state; nothing downstream (Phases 5–10) exists yet to depend on this subscription file |

### Deviations from Design

None — `data/subscriptions/opencode-go.yaml` matches design.md's "Data shapes" worked example byte-for-byte on structure (only `verifiedAt`'s date and the file's real location differ from the inline example, which already used the same value). The assignment's mention of window percentages (5h = 20% of monthly, weekly = 50%, monthly = 100%, research C1) is evidentiary context for *why* the thresholds are what they are; the subscription schema (`additionalProperties: false` on the `plans` item) has no field for per-window percentages, so none was added — adding one would have failed schema validation and contradicted the design's exact worked example.

### Issues Found

None.

### Remaining Tasks

- [ ] Phase 6: Catalog — alibaba/deepseek (Work Unit 6, PR 6) — tasks 6.1–6.4
- [ ] Phase 7: Catalog — minimax/xiaomi/tencent/meituan/meta (Work Unit 7, PR 7) — tasks 7.1–7.4
- [ ] Phase 8: Canonical Phases (Work Unit 8, PR 8) — tasks 8.1–8.3
- [ ] Phase 9: Runtime Mappings (Work Unit 9, PR 9) — tasks 9.1–9.4
- [ ] Phase 10: Bundle + CLI + CI (Work Unit 10, PR 10) — tasks 10.1–10.8

### Workload / PR Boundary (Work Unit 4)

- Mode: stacked PR slice (`stacked-to-main`, per tasks.md Review Workload Forecast)
- Current work unit: Work Unit 4 (Phase 4), branch `feat/2-go-subscription-fixtures` (stacked on `feat/2-phases-runtime-override-schemas`, PR #20)
- Boundary: starts from the Work Unit 3 state (phases/runtime/override schemas and validators); ends with the Go subscription file, its RED/GREEN test against the real committed tree, and both source document fixtures, all covered by passing tests and green typecheck
- Estimated review budget impact: within budget — `git diff --stat feat/2-phases-runtime-override-schemas..HEAD` (lockfile and `data/sources/*` excluded per design's authored-line convention) = 78 insertions + 4 deletions = 78 authored lines net additions, well under the 400-line default

## Work Unit 5 / Phase 5 (PR 5) — Complete

Implemented the first catalog slice — 10 OpenCode Go models across
moonshot, zhipu, xai, and openai — on branch
`feat/2-catalog-moonshot-zhipu-xai-openai` (stacked on
`feat/2-go-subscription-fixtures`, PR #21), committed as:

- `d29c490 test(data): data-driven catalog test for moonshot/zhipu/xai/openai slice`
- `fb1d6dc feat(data): OpenCode Go catalog, moonshot and zhipu`
- `62863c6 feat(data): OpenCode Go catalog, xai and openai`
- (tasks.md checkbox commit follows this apply-progress update)

### Task 5.1 — Live re-fetch

Re-fetched `https://opencode.ai/docs/go` with `curl -sL` (server-rendered
HTML, not client-only — the usage-limits and privacy tables are present
in the raw response). Cross-checked all 9 live-present models against
research.md's 2026-09-14 table: every 5h/weekly/monthly cap, `$` bucket,
and privacy row (training/retention) matched exactly, including
`grok-4.6` (169/423/845, $15, 30-day retention) and `gpt-5.6-luna`
(2,050/5,100/10,250, $15, 30-day retention). `grok-4.5` remains **absent**
from the live page (confirmed by a direct string search across the full
fetched HTML) — corroborates research.md claim C18. No live-vs-research
discrepancies found for this slice; no `verifiedAt` adjustment was
needed beyond the task's specified `2026-09-14`.

### Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `packages/data/test/catalog.test.ts` | Created | Data-driven test globbing `data/models/opencode-go/*.yaml`; asserts an extensible expected-id list, `validateModel` passes (naming file/field on failure via `toEqual([])`), all six strength axes present, non-empty `evidence.<axis>` for any axis rated 3, `privacy` shape, `status` enum, at least one `effortVariants` entry, and `plans.go.verifiedAt === "2026-09-14"` |
| `data/models/opencode-go/kimi-k3.yaml` | Created | moonshot, `current`, cap 110/5h ($15 bucket); `oneShotReasoning: 2` |
| `data/models/opencode-go/kimi-k2.7-code.yaml` | Created | moonshot, `current`, cap 1,350/5h ($60 bucket); `codingTools: 3` with evidence (top of three separate practical rankings: spec, apply diario/tools, tasks) |
| `data/models/opencode-go/kimi-k2.6.yaml` | Created | moonshot, `legacy`, cap 1,150/5h ($60 bucket) |
| `data/models/opencode-go/glm-5.3-flash.yaml` | Created | zhipu, `current`, cap 6,320/5h ($60 bucket); `cheap: 3` with evidence (cap exceeds the subscription's workhorse ceiling of 5,000 — lands in the `volume` Budget Class tier) |
| `data/models/opencode-go/glm-5.3.yaml` | Created | zhipu, `current`, cap 220/5h ($15 bucket); `oneShotReasoning: 3` with evidence (ranked first for "Design crítico", few-call critical decisions) |
| `data/models/opencode-go/glm-5.2.yaml` | Created | zhipu, `current`, cap 880/5h ($60 bucket); reuses design.md's worked example verbatim (`codingTools: 3` with its exact evidence string) |
| `data/models/opencode-go/glm-5.1.yaml` | Created | zhipu, `legacy`, cap 880/5h ($60 bucket) |
| `data/models/opencode-go/grok-4.6.yaml` | Created | xai, `current`, cap 169/5h ($15 bucket), 30-day log retention |
| `data/models/opencode-go/grok-4.5.yaml` | Created | xai, `legacy`; see "Judgment call" below |
| `data/models/opencode-go/gpt-5.6-luna.yaml` | Created | openai, `current`, cap 2,050/5h ($15 bucket), 30-day log retention |

### Strength rating methodology

- The `cheap` axis is derived directly and objectively from the
  subscription's own Budget Class thresholds
  (`data/subscriptions/opencode-go.yaml` — sniper<200 → 0, semi<500 → 1,
  workhorse<=5000 → 2, volume>5000 → 3), so it is reproducible without
  re-reading the narrative source documents and stays consistent with
  design.md's `glm-5.2` worked example (cap 880 → workhorse → `cheap: 2`).
- The other five axes (`oneShotReasoning`, `sustainedReasoning`,
  `codingTools`, `longContext`, `multimodal`) were scored from the
  practical per-dimension rankings in
  `data/sources/perfiles-sdd-opencode-go-only-v2.2.md` section 2.2. A `3`
  was reserved for a model that is explicitly ranked *first* in a
  dimension ranking (glm-5.3 → Design crítico; kimi-k2.7-code →
  codingTools, first in three separate rankings), matching the
  conservatism of design.md's own `glm-5.2` example (which is ranked
  first for "Criterio sostenible" but was still scored
  `sustainedReasoning: 2`, not 3 — the design reserved 3 for the model's
  single standout, quantitatively distinguishable strength). Models with
  no ranking-table appearance (kimi-k2.6, glm-5.1 legacy; glm-5.3-flash,
  new) were scored conservatively (0–1) rather than inferring quality
  from cap size or lab family alone.
- `effortVariants` used the assignment's "minimal valid set when unknown"
  rule literally: `["medium"]` for every model whose only documented
  effort is "default" across all per-phase configuration tables, and
  `["medium", "high"]` for `glm-5.3` (the only model in this slice
  explicitly configured with `high` effort in the HIGH profile's Design
  row). `glm-5.2` reuses design.md's example verbatim (`[low, medium,
  high]`).

### Judgment call: `grok-4.5`

`grok-4.5` is legacy and confirmed absent from the live
`opencode.ai/docs/go` table (task 5.1 re-fetch, corroborating research.md
C18) — no changelog or rename statement exists tying it to `grok-4.6`.
Its `requestsPer5h: 120` comes from the 2026-08-19 source document. Per
the assignment's explicit instruction, `requestsPerWeek` and
`requestsPerMonth` are recorded as `null` (the schema types both fields
as `["number", "null"]`) rather than invented, since neither source ever
published them for this row.

`monthlyUsdBucket` is a required, non-nullable `integer` in the schema
and was **not** flagged by the assignment as an allowed-blocker field
(only weekly/monthly caps were called out). No source publishes a bucket
for `grok-4.5` directly (it predates the current $15/$30/$60 bucket
table). It is set to `15` as a judgment call: every other model in this
slice with a comparable sub-200 cap (`kimi-k3`, `glm-5.3`) is bucketed at
`$15` on the live table, so `$15` is the best-evidenced inference
available rather than a value read from either source document. This is
documented in the file's own header comment for reviewer visibility. If
this inference is rejected at review, the fix is a one-line change to
`grok-4.5.yaml`'s `monthlyUsdBucket` and does not affect any other file
in this slice.

One further deviation from the narrative source: the assignment's
explicit instruction sets `logRetentionDays: 0` for every model in this
slice except `grok-4.6` and `gpt-5.6-luna` (30 days each), per research
C22–C23. The 2026-08-19 source document separately claims "Grok 4.5 ...
retiene logs 30 días" for the *old* catalog snapshot. Since `grok-4.5`
is absent from the current live privacy table (there is nothing to
re-verify), and the assignment's instruction is explicit and
authoritative for this file set, `grok-4.5.yaml` was written with
`logRetentionDays: 0` per the assignment rather than the older
narrative claim. Flagged here for visibility, not treated as a
blocker.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5.2–5.3 (moonshot+zhipu) | `packages/data/test/catalog.test.ts` | Unit (data-driven, `it.each`) | ✅ 114/114 pre-existing tests green before starting | ✅ Written — 81 tests failed with `ENOENT` on `data/models` (directory did not exist) | ✅ 56/81 passed after adding the 7 moonshot/zhipu files (remaining 25 failures were only the 3 not-yet-created xai/openai files) | ✅ 10 distinct model fixtures across 2 labs, 2 statuses (`current`/`legacy`), varying strength/evidence/privacy shapes | ➖ None needed — test structure is already minimal and data-driven |
| 5.3 (xai+openai) | `packages/data/test/catalog.test.ts` | Unit (data-driven, `it.each`) | ✅ 56/81 passing baseline before adding the remaining 3 files | ✅ (test already written in 5.2; no new test code) | ✅ 81/81 passed after adding `grok-4.6`, `grok-4.5`, `gpt-5.6-luna` | ✅ `grok-4.5` triangulates the `null`-cap and non-`2026-09-14`-source path against the other 9 straightforward files | ➖ None needed |

### Test Summary

- **Total tests written**: 8 `it`/`it.each` blocks × 10 model ids (+1 file-count test) = 81 assertions in `catalog.test.ts`
- **Total tests passing**: 81/81 (`catalog.test.ts`), 114/114 (full suite)
- **Layers used**: Unit (81), Integration (0), E2E (0)
- **Approval tests** (refactoring): None — no refactoring tasks
- **Pure functions created**: 0 (this unit is pure data; reuses `readYamlFile`/`validateModel` from Work Unit 2)

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter @gentle-ai/profile-data exec vitest run catalog` → `Test Files 1 passed (1)`, `Tests 81 passed (81)` |
| Runtime harness command/scenario and exact result | Re-fetched `https://opencode.ai/docs/go` live via `curl -sL` (task 5.1) and cross-checked all 9 live-present models' caps/buckets/privacy against research.md byte-for-byte — no discrepancies; `grok-4.5` confirmed absent from the live page by direct string search |
| Rollback boundary | `git revert 62863c6 fb1d6dc d29c490` (in that order) removes all 10 model files and `catalog.test.ts`, restoring exactly the Work Unit 4 state; nothing downstream (Phases 6–10) exists yet to depend on these files |

### Deviations from Design

None on schema shape or field names — all 10 files validate against
`data/schemas/model.schema.json` unchanged. See "Judgment call:
`grok-4.5`" above for the two documented, reviewer-visible judgment
calls (inferred `monthlyUsdBucket`, and following the assignment's
explicit `logRetentionDays: 0` instruction over the older narrative
source's `30` claim for this one legacy row).

### Issues Found

None blocking. The `grok-4.5` bucket inference above is the only open
item a reviewer may want to revisit.

### Workload / PR Boundary (Work Unit 5)

- Mode: stacked PR slice (`stacked-to-main`, per tasks.md Review Workload Forecast)
- Current work unit: Work Unit 5 (Phase 5), branch `feat/2-catalog-moonshot-zhipu-xai-openai` (stacked on `feat/2-go-subscription-fixtures`, PR #21)
- Boundary: starts from the Work Unit 4 state (Go subscription file + source fixtures); ends with 10 validated catalog model files and the data-driven test that covers them, both `pnpm -r typecheck` and `pnpm test` green
- Estimated review budget impact: within budget — `git diff --stat feat/2-go-subscription-fixtures..HEAD -- . ':(exclude)pnpm-lock.yaml'` = 330 authored insertions, 0 deletions, well under the 400-line default

### Status

27/50 tasks complete (1.1–1.5, 2.1–2.10, 3.1–3.4, 4.1–4.4, 5.1–5.4). Ready for verify on Work Unit 5, or for `sdd-apply` to continue with Work Unit 6.

## Work Unit 6 / Phase 6 (PR 6) — Complete

Implemented the second catalog slice — 9 OpenCode Go models across
alibaba (Qwen) and deepseek — on branch `feat/2-catalog-alibaba-deepseek`
(stacked on `feat/2-catalog-moonshot-zhipu-xai-openai`, PR #22), committed
as:

- `caf6834 test(data): extend catalog test with alibaba/deepseek ids, promo and id-filename checks`
- `081ec67 feat(data): OpenCode Go catalog, alibaba`
- `9946e6a feat(data): OpenCode Go catalog, deepseek`
- `f1a7d38 docs: mark work unit 6 tasks complete`

### Task 6.1 — Live re-fetch

Re-fetched `https://opencode.ai/docs/go` with `curl -sL` and cross-checked
all 9 models against research.md's 2026-09-14 table: every 5h/weekly/
monthly cap, `$` bucket, `deepseek-v4.1-flash`'s 4x promo note
("4x · Ends Sep 20"), and privacy row matched exactly, including
`qwen3.7-max`'s re-cap to 170 and `deepseek-v4-flash`'s re-cap to 13,000.
The live privacy table states "Model training: Not used" and
"Data retention: 0 days*" for all four DeepSeek rows, with a page
footnote reading "DeepSeek: ZDR agreement is renewed monthly. The current
agreement is valid through September 30, 2026." — this directly
corroborates research.md C25 and the assignment's correction to task 6.3
(`deepseek-v4-flash-vision-exp` is `trainsOnData: false`, not `true`). No
live-vs-research discrepancies found for this slice; no `verifiedAt`
adjustment was needed beyond `2026-09-14`.

### Correction applied: task 6.3 / `deepseek-v4-flash-vision-exp` privacy

The original task 6.3 text asserted `trainsOnData: true` for
`deepseek-v4-flash-vision-exp`. This was wrong: research.md's catalog
table shows Training Allowed = No for every DeepSeek row (only the Muse
Spark Contributor models train on user data), and the live re-fetch
(task 6.1) confirms "Model training: Not used" for this exact model.
`tasks.md`'s task 6.3 line was edited to state the correction and record
`trainsOnData: false`, `logRetentionDays: 0`; the model file was written
with the corrected values from the start, not written wrong and then
fixed.

### Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `packages/data/test/catalog.test.ts` | Modified | Appended the 9 `ALIBABA_DEEPSEEK_IDS` to `EXPECTED_IDS`; extended `ModelDoc`'s `plans` shape with `requestsPer5h`/`multiplier`/`multiplierExpiresAt`; added an `id`-equals-filename assertion for every model (prior review advisory); added a dedicated test loading the real `data/subscriptions/opencode-go.yaml` thresholds and asserting `deepseek-v4.1-flash`'s stored `plans.go.requestsPer5h` is the base 6,500 (never the promo-scaled 26,000), `multiplier: 4`, `multiplierExpiresAt: 2026-09-20`, and that `deriveBudgetClass` on the base and on the promo-scaled value both resolve to `volume` |
| `data/models/opencode-go/qwen3.8-max.yaml` | Created | alibaba, `current`, cap 160/5h ($15 bucket); `oneShotReasoning: 3` with evidence (ranked first in "Criterio de un disparo") |
| `data/models/opencode-go/qwen3.8-flash.yaml` | Created | alibaba, `current`, cap 5,400/5h ($30 bucket); `cheap: 3` with evidence (cap exceeds workhorse ceiling); new since 2026-08-19 |
| `data/models/opencode-go/qwen3.7-max.yaml` | Created | alibaba, `current`, cap 170/5h ($30 bucket), re-capped from 340 (research C16, confirmed live) |
| `data/models/opencode-go/qwen3.7-plus.yaml` | Created | alibaba, `current`, cap 4,300/5h ($60 bucket) |
| `data/models/opencode-go/qwen3.6-plus.yaml` | Created | alibaba, `legacy`, cap 3,300/5h ($60 bucket) |
| `data/models/opencode-go/deepseek-v4.1-flash.yaml` | Created | deepseek, `current`, base cap 6,500/5h ($60 bucket), `multiplier: 4`/`multiplierExpiresAt: 2026-09-20`; `cheap: 3` with evidence; ZDR renewal note in comment |
| `data/models/opencode-go/deepseek-v4-pro.yaml` | Created | deepseek, `current`, cap 1,050/5h ($15 bucket) |
| `data/models/opencode-go/deepseek-v4-flash.yaml` | Created | deepseek, `current`, cap 13,000/5h ($30 bucket), re-capped from 7,600 (research C17, confirmed live); `cheap: 3` with evidence |
| `data/models/opencode-go/deepseek-v4-flash-vision-exp.yaml` | Created | deepseek, `experimental`, cap 6,500/5h ($15 bucket), `trainsOnData: false`/`logRetentionDays: 0` per the corrected task 6.3; `cheap: 3` with evidence |
| `openspec/changes/scaffold-data-contract-go-catalog/tasks.md` | Modified | Corrected task 6.3's privacy note; tasks 6.1–6.4 marked `[x]` |

### Strength rating methodology

Same methodology as Work Unit 5: `cheap` is derived mechanically from the
subscription's own Budget Class thresholds (sniper→0, semi→1,
workhorse→2, volume→3); the other five axes are scored from the
practical per-dimension rankings in
`data/sources/perfiles-sdd-opencode-go-only-v2.2.md` sections 2.1/2.2,
reserving `3` only for a model explicitly ranked first in a named
dimension. Of the 9 models in this slice, only `qwen3.8-max`
(oneShotReasoning, "Criterio de un disparo: Qwen3.8 Max > Kimi K3 ≈ Grok
4.5") meets that bar on a reasoning axis. `deepseek-v4-flash`'s 3rd-place
appearance in the "Tasks" ranking ("Kimi K2.7 Code > Qwen3.7 Plus >
Flash") and `deepseek-v4-pro`'s last-place appearance in "Criterio
sostenible" were scored `codingTools: 1` / `sustainedReasoning: 1`
respectively rather than `3`, consistent with the conservatism established
in Work Unit 5 (a ranking appearance below first place does not earn a
`3`). `deepseek-v4-flash`'s tied-first appearance in the "Archive/Cierre"
dimension was deliberately NOT used as reasoning-axis evidence: that
dimension is a cost/volume task category, not one of the six strength
axes, and using it would conflate the mechanically-derived `cheap` axis
with a manually-scored reasoning axis. `deepseek-v4-flash-vision-exp` (a
new, undocumented vision variant) was scored `multimodal: 1` rather than
`3` — its name implies multimodal capability, but no source describes its
depth, and inventing a `3`-worthy evidence string from a model name alone
would violate the evidence discipline this contract enforces.
`effortVariants` is `["medium"]` for all 9: none of them appear configured
with `high` effort in any per-phase table across either source document
(unlike zhipu's GLM-5.3 in Work Unit 5).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 6.2–6.3 (alibaba+deepseek) | `packages/data/test/catalog.test.ts` | Unit (data-driven, `it.each`) + 1 dedicated unit test | ✅ 173/173 pre-existing tests green before starting (10 moonshot/zhipu/xai/openai ids × existing assertions) | ✅ Written — 83 of 173 tests failed with `ENOENT` on the 9 new model paths (file-count test, per-id `it.each` assertions, and the new promo test) before any of the 9 files existed | ✅ 173/173 passed after adding all 9 model files | ✅ 9 distinct model fixtures across 2 labs, 2 statuses (`current`/`legacy`/`experimental` — 3 statuses across this slice), one file (`deepseek-v4.1-flash`) exercising the optional `multiplier`/`multiplierExpiresAt` schema fields for the first time in this repo | ➖ None needed — test structure already minimal and data-driven, reused unchanged from Work Unit 5 |

### Test Summary

- **Total tests written this unit**: 2 new `it`/`it.each` blocks (id-matches-filename, ×19 ids; the dedicated promo-multiplier test, ×1) = 20 new assertions in `catalog.test.ts`
- **Total tests passing (package)**: 206 (173 in `catalog.test.ts`, 33 carried over in other files)
- **Layers used**: Unit / data-driven (19 new `it.each` cases), Unit / dedicated (1 new promo-multiplier case)
- **Approval tests** (refactoring): None — no refactoring tasks in this unit
- **Pure functions created**: None new — reused `readYamlFile`, `validateModel`, `validateSubscription`, `deriveBudgetClass` unchanged

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter @gentle-ai/profile-data exec vitest run catalog` → `Test Files 1 passed (1)`, `Tests 173 passed (173)` |
| Runtime harness command/scenario and exact result | Re-fetched `https://opencode.ai/docs/go` live via `curl -sL` (task 6.1) and cross-checked all 9 models' caps/buckets/privacy/promo note against research.md byte-for-byte — no discrepancies; the live footnote for DeepSeek's ZDR renewal (valid through 2026-09-30) directly corroborates research.md C25 |
| Rollback boundary | `git revert f1a7d38 9946e6a 081ec67 caf6834` (in that order) removes all 9 model files and the `catalog.test.ts` extension, restoring exactly the Work Unit 5 state; nothing downstream (Phases 7–10) exists yet to depend on these files |

### Deviations from Design

None on schema shape or field names — all 9 files validate against
`data/schemas/model.schema.json` unchanged, including
`deepseek-v4.1-flash`'s use of the optional `multiplier`/
`multiplierExpiresAt` plan fields exactly as documented in design.md's
"Data shapes" section. The one correction applied — reversing task 6.3's
draft `trainsOnData: true` note for `deepseek-v4-flash-vision-exp` to
`false` — was instructed by the orchestrator at apply time based on
research.md evidence and confirmed independently by the task 6.1 live
re-fetch; it is a task-text correction, not a design deviation.

### Issues Found

None.

### Remaining Tasks

- [ ] Phase 7: Catalog — minimax/xiaomi/tencent/meituan/meta (Work Unit 7, PR 7) — tasks 7.1–7.4
- [ ] Phase 8: Canonical Phases (Work Unit 8, PR 8) — tasks 8.1–8.3
- [ ] Phase 9: Runtime Mappings (Work Unit 9, PR 9) — tasks 9.1–9.4
- [ ] Phase 10: Bundle + CLI + CI (Work Unit 10, PR 10) — tasks 10.1–10.8

### Workload / PR Boundary (Work Unit 6)

- Mode: stacked PR slice (`stacked-to-main`, per tasks.md Review Workload Forecast)
- Current work unit: Work Unit 6 (Phase 6), branch `feat/2-catalog-alibaba-deepseek` (stacked on `feat/2-catalog-moonshot-zhipu-xai-openai`, PR #22)
- Boundary: starts from the Work Unit 5 state (10 moonshot/zhipu/xai/openai catalog files); ends with 9 additional validated catalog model files (alibaba + deepseek) and the extended data-driven test that covers all 19, both `pnpm -r typecheck` and `pnpm test` green
- Estimated review budget impact: within budget — `git diff --stat feat/2-catalog-moonshot-zhipu-xai-openai..HEAD -- . ':(exclude)pnpm-lock.yaml'` = 284 authored insertions, 7 deletions, well under the 400-line default

### Status

31/50 tasks complete (1.1–1.5, 2.1–2.10, 3.1–3.4, 4.1–4.4, 5.1–5.4, 6.1–6.4). Ready for verify on Work Unit 6, or for `sdd-apply` to continue with Work Unit 7.
