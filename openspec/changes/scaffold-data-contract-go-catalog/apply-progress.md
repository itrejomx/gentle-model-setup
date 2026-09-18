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

### Remaining Tasks

- [ ] Phase 3: Phases/Runtime/Override Schemas (Work Unit 3, PR 3) — tasks 3.1–3.4
- [ ] Phase 4: Go Subscription + Source Fixtures (Work Unit 4, PR 4) — tasks 4.1–4.4
- [ ] Phase 5: Catalog — moonshot/zhipu/xai/openai (Work Unit 5, PR 5) — tasks 5.1–5.4
- [ ] Phase 6: Catalog — alibaba/deepseek (Work Unit 6, PR 6) — tasks 6.1–6.4
- [ ] Phase 7: Catalog — minimax/xiaomi/tencent/meituan/meta (Work Unit 7, PR 7) — tasks 7.1–7.4
- [ ] Phase 8: Canonical Phases (Work Unit 8, PR 8) — tasks 8.1–8.3
- [ ] Phase 9: Runtime Mappings (Work Unit 9, PR 9) — tasks 9.1–9.4
- [ ] Phase 10: Bundle + CLI + CI (Work Unit 10, PR 10) — tasks 10.1–10.8

### Workload / PR Boundary

- Mode: stacked PR slice (`stacked-to-main`, per tasks.md Review Workload Forecast)
- Current work unit: Work Unit 2 (Phase 2), targeting branch `feat/2-workspace-scaffold` (PR #18); this branch is `feat/2-schemas-loader-core`
- Boundary: starts from the Work Unit 1 scaffold (VERSION smoke test only); ends with subscription/model schemas, the full loader core (parse, containment, validate, Strength-3 check), and `deriveBudgetClass`, all covered by passing tests and green typecheck
- Estimated review budget impact: **over budget** — 1235 authored lines vs. the 400-line default and design's ~380 estimate for this slice; see Deviation 5 for the breakdown and `size:exception` recommendation

### Status

15/50 tasks complete (1.1–1.5, 2.1–2.10). Ready for verify on Work Unit 2, or for `sdd-apply` to continue with Work Unit 3.
