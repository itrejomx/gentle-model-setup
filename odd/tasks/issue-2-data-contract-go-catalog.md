# Issue #2: data contract and OpenCode Go catalog (slices 7-10)

Locator: `odd/tasks/issue-2-data-contract-go-catalog.md`
Engram mirror: topic `odd/issue-2-data-contract-go-catalog/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/2 (PRD #1, build step 1)

## Objective

Finish issue #2: complete the 29-model OpenCode Go catalog, the canonical phases, the four
runtime mappings, and the content-hashed bundle with its CLIs and CI workflow.

## Problem and why

The engine (#3), the site, and the checker all need a validated YAML contract and a
content-hashed bundle before they can be built. Slices 1-6 delivered the workspace, the
schemas, the loader, the Go subscription file, and 19 of 29 catalog models. Slices 7-10 remain.

## Route

Slices 1-6 ran under SDD as change `scaffold-data-contract-go-catalog`. On 2026-09-16 the
maintainer moved slices 7-10 to Organic Driven Development. The SDD change is frozen:
its `proposal.md`, `specs/`, `design.md`, and `tasks.md` are read-only reference for
requirements and design decisions, and its `tasks.md` / `apply-progress.md` are no longer
updated. Progress lives in this document. `sdd-archive` runs once, after slice 10, so
`openspec/specs/` never documents a capability that does not exist yet.

## Scope

In: tasks T7.1-T10.8 below, plus the folded advisory items and housekeeping listed with them.
Out: engine (#3), other subscription catalogs (#4-#7), site, checker, deploy.

## Constraints

- Strict TDD: enabled (source: user global `CLAUDE.md`, "Strict TDD Mode: enabled"; also
  `strict_tdd: true` in the frozen SDD state). Observed RED before GREEN, then REFACTOR.
- Test runner: Vitest through pnpm. Focused run:
  `pnpm --filter @gentle-ai/profile-data exec vitest run <pattern>`. Full: `pnpm test`.
- Delivery: stacked-to-main PR chain, one PR per slice, base = previous slice branch.
  Chain so far: #17 <- #18 <- #19 <- #20 <- #21 <- #22 <- #23 <- #24 <- #25 <- #26 <- #27.
- Receipt-driven development is on globally; native review runs per slice candidate with
  per-candidate consent (`--base-ref <previous branch> --committed-only`).
- Conventional commits, no AI attribution trailers. Commits split as test / data or code / docs.
- About 400 authored changed lines per slice is a planning heuristic only, never a gate.
- Catalog slices re-fetch https://opencode.ai/docs/go (`curl -sL`) before authoring rows.

## Tasks

### Slice 7 — catalog minimax/xiaomi/tencent/meituan/meta (branch `feat/2-catalog-minimax-xiaomi-tencent-meituan-meta`)

- [x] T7.1 Re-fetch https://opencode.ai/docs/go; confirm current caps and status for these 10 models; total catalog reaches 29.
- [x] T7.2 RED: extend `packages/data/test/catalog.test.ts` asserting exactly 29 files total, 19 `current` / 6 `legacy` / 4 `experimental`; `minimax-m2.5` has no numeric `requestsPer5h` on any plan and therefore cannot be `current` (code check); `muse-spark-1.2-contributor` and `muse-spark-1.3-contributor` declare `trainsOnData: true` and `logRetentionDays: null`.
- [x] T7.3 GREEN: create `minimax-m3.yaml` (minimax, `current`), `minimax-m2.7.yaml` and `minimax-m2.5.yaml` (minimax, `legacy`); `mimo-v2.5.yaml` and `mimo-v2.5-pro.yaml` (xiaomi, `current`); `hy3.yaml` (tencent, `current`) and `hy4-preview.yaml` (tencent, `experimental`); `longcat-2.0.yaml` (meituan, `current`); `muse-spark-1.2-contributor.yaml` and `muse-spark-1.3-contributor.yaml` (meta, `experimental`, `logRetentionDays: null`).
- [x] T7.4 Verify: focused catalog run asserts 29/29 files, 19 current / 6 legacy / 4 experimental.
- [x] T7.5 (WU6 advisory) Strengthen the promo-invariance test so it cannot pass vacuously.
- [x] T7.6 (housekeeping) Fix the `grok-4.5.yaml` header comment so it matches the 30-day retention value (WU5 advisory).

### Slice 8 — canonical phases (branch `feat/2-canonical-phases`)

- [x] T8.1 RED: `packages/data/test/phases.test.ts` globbing `data/phases/phases.yaml` asserting exactly 27 rows, ids match the canonical list, every row has `callPattern`, `weights` summing > 0, and `role`.
- [x] T8.2 GREEN: create `data/phases/phases.yaml` with 27 rows (`group`, `callPattern`, `role`, six-axis `weights`). Per-phase weights have no source document; propose them with a one-line rationale comment per phase, to be revisited when `packages/engine` consumes them (#3).
- [x] T8.3 (WU3 advisory) Assert phase-id uniqueness in code or test; the schema cannot reject duplicates.
- [x] T8.4 Verify: focused `phases` run.
- [x] T8.5 (slice 7 advisory, time-sensitive: the only live promo ends 2026-09-20) Decouple the promo-invariance test in `packages/data/test/catalog.test.ts` from live data: prove the invariant with a synthetic promo-bearing fixture so the test keeps passing once no catalog model carries a multiplier. REOPENED 2026-09-17: the slice 8 review showed the synthetic test is a tautology (two identical `deriveBudgetClass` calls) and the real-data scan lost its non-empty guard. Only the decoupling from the 2026-09-20 promo end was achieved. No production code reads `multiplier` yet, so the proof moves to T10.2b. CLOSED 2026-09-17 by T10.2b (commit `711fd39`).
- [x] T8.6 (slice 7 advisory) Fixture test calling `validateModel` directly for `checkCurrentRequiresCap`: a `current` model with several plans, some caps `null` and one numeric, is accepted; the all-null rejection asserts the message and the file, not only the `status` field.

### Slice 9 — runtime mappings (branch `feat/2-runtime-mappings`)

- [x] T9.1 Read live installs (read-only) at `~/.pi/agent/agents/`, `~/.config/opencode/opencode.json`, `~/.claude/agents/`, `~/.codex/agents/` to fill each `agentMap`.
- [x] T9.2 RED: `packages/data/test/runtime-mappings.test.ts` asserting `agentMap` entry counts Pi 24, OpenCode 21 (was 20; see slice 9 rationale), Claude Code 19, Codex 17; every `agentMap` value resolves to a phase id in `phases.yaml`; every `prefixMap` key is a known provider prefix.
- [x] T9.3 GREEN: create `data/runtimes/pi.yaml` (24 entries; `sdd-proposal` is the Pi phase mapped to canonical `sdd-propose`; `prefixMap` maps `openai` to `openai-codex`), `data/runtimes/opencode.yaml` (21), `data/runtimes/claude-code.yaml` (19), `data/runtimes/codex.yaml` (17).
- [x] T9.4 Verify: focused `runtime-mappings` run.
- [x] T9.5 (slice 8 advisory) `packages/data/test/phases.test.ts`: assert each id sits in its canonical group by iterating the per-group id constants.
- [x] T9.6 (slice 8 advisory) `phases.test.ts`: pin the judgment-call rows (`jd-fix-agent` implementer, `gentle-ai-worker` implementer, `gentle-ai-verify` verifier, `sdd-remediate` loop) and assert every `weights` map sums to 1.0, as the `phases.yaml` header states.
- [x] T9.7 (slice 8 advisory) `packages/data/test/validate.test.ts`: the all-null-caps rejection compares the full expected error list (field, message, count); the duplicate-id test also checks the "first declared at" index.

### Slice 10 — canonical JSON, bundle, cross-file integrity (branch `feat/2-bundle-hash`)

Split on 2026-09-17: the original slice 10 absorbed the reopened T8.5, the slice 9 advisory items, and the WU2 error-surface work, which forecasts well over the ~400 changed-line review budget. One slicing pass, same stacked-to-main strategy: slice 10 is the bundle and the cross-file checks it enables; slice 11 is the CLIs, the CI workflow, and the error surfaces. Task ids are kept stable.


- [x] T10.1 RED: `packages/data/test/canonical.property.test.ts` (fast-check over a generated dataset): shuffling object key order and array order yields an identical hash; changing any scalar changes it.
- [x] T10.2 GREEN: implement `packages/data/src/canonical.ts` (`canonicalJson`) and `packages/data/src/bundle.ts` (`hashPayload`, `buildBundle` injecting derived `budgetClass`).
- [x] T10.2b (reopened T8.5) Prove promo invariance where the cap is selected: pass a synthetic promo-bearing model document through `buildBundle` and assert the injected `budgetClass` comes from the base cap (RED-first: the multiplied cap must cross a threshold). Replace the tautological synthetic test in `catalog.test.ts`, and make the real-data scan skip explicitly when no catalog model carries a multiplier.
- [x] T10.3 RED: `packages/data/test/bundle.integration.test.ts` (temp dir): `buildBundle` -> write -> `loadBundle` round-trips; a tampered payload byte throws `BundleHashMismatchError`.
- [x] T10.4 GREEN: implement `loadBundle` in `bundle.ts`.
- [x] T10.10 (slice 9 advisory) Cross-file integrity, derived from the data files and never from hand-copied lists: every runtime `agentMap` value is a phase id in `data/phases/phases.yaml`; every `prefixMap` key is a subscription `providerPrefix`, with `openai` kept only as an explicit, commented example-only exception until a subscription file exists; `agentMap` values are unique within a runtime; the runtime files in `data/runtimes/` equal the ids the tests iterate. Prefer a code check where the whole dataset is loaded together, plus tests.
- [x] T10.11 (slice 9 advisory) Make the provenance comments in `data/runtimes/claude-code.yaml` and `packages/data/test/runtime-mappings.test.ts` agree about the older counts (design spec said Claude Code 18 / OpenCode 20; live counts are 19 / 21).
- [x] T10.12 Verify: focused `bundle`, `canonical`, `runtime-mappings`, and `catalog` runs; `pnpm -r typecheck`; `pnpm test`.

### Slice 11 — bundle hardening and loadData (branch `feat/2-bundle-hardening`)

Bundle hardening from the slice 10 review comes before the CLIs, which expose exactly these paths. Split 2026-09-18 from the CLI/CI work to keep each PR near the review budget.

- [x] T11.1 (slice 10 advisory) Locale-independent canonical order: replace `localeCompare` in `canonical.ts` with a code-unit comparison; extend the property test generators to mixed case, punctuation, and non-ASCII ids so the old comparison would have failed.
- [x] T11.2 (slice 10 advisory) Total order for collections: tie-break tied sort keys (overrides with the same tier/phase/model, duplicated or missing ids) deterministically, e.g. by the item's canonical JSON; property test with tied keys proves input order no longer changes the hash. Limit collection reordering to depth 0 as documented, and never throw on a `null` item.
- [x] T11.3 (slice 10 advisory) A model whose `subscription` does not resolve is an integrity error, never a degraded bundle; RED-first fixture. Also assert or branch on `budgetClass.derivedFrom` instead of always deriving from `requestsPer5h`.
- [x] T11.4 (slice 10 advisory) `loadBundle` validates the file shape and raises typed bundle errors for malformed JSON, missing `payload`, and missing `hash`, distinct from `BundleHashMismatchError`; RED-first tests for each.
- [x] T11.5 (slice 10 advisory) A test proves `buildBundle` throws `DataValidationError` on a failing `DataSet` (non-empty runtimes with a dangling phase id); broaden the "any scalar changes the hash" property test to a random leaf including sort-key fields.

- [x] T10.13 (slice 10 gap) Implement the design's `loadData` / `validateData`: assemble a real `DataSet` from `data/` on disk (today only tests hand-build one), so the CLIs can call `buildBundle` on the committed data. RED-first integration test: `loadData` over the repository's `data/` yields 1 subscription, 29 models, 27 phases, 4 runtimes, and `buildBundle` accepts it.
### Slice 12 — CLIs, CI workflow, error surfaces

- [x] T10.5 RED (threat matrix, CLI argument composition): a path argument containing a space and a `;` is validated as that literal directory or exits 2, never executed; assert no `child_process` import in `packages/data`.
- [x] T10.6 GREEN: create `packages/data/src/cli/validate.ts` (one positional path arg, no shell interpolation, exit 0/1/2 per design) and `packages/data/src/cli/build.ts`; wire root `package.json` scripts.
- [x] T10.7 Create `.github/workflows/ci.yml` (threat matrix, CI workflow trust): `on: pull_request` only, `permissions: { contents: read }`, `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `pnpm install --frozen-lockfile`, `pnpm validate`, `pnpm test`, `pnpm build`.
- [x] T10.8 (WU2 advisory) Error surfaces: Ajv `additionalProperties` errors name the offending field; review the remaining WU2 findings in Engram topic `sdd/scaffold-data-contract-go-catalog/advisory-findings-*` and fold what fits.
- [ ] T10.9 (local checks observed 2026-09-18; the workflow run on the slice's own PR is pending the push) Verify: focused `bundle` run; then `pnpm validate && pnpm test && pnpm build`; the workflow run on this slice's own PR is green.

### Close-out

- [ ] TC.1 Docs fix: `docs/superpowers/specs/2026-09-14-model-profile-site-design.md` line 87 thresholds vs the proposal.
- [ ] TC.3 Before archiving, correct the role summary sentence in the frozen `specs/canonical-phases/spec.md` (lines 49-52): it omits `jd-fix-agent: implementer`, `gentle-ai-verify: verifier`, and `gentle-ai-worker: implementer`, which the design spec table it defers to assigns.
- [ ] TC.4 Before archiving, correct the OpenCode count (20 -> 21, with `gentle-orchestrator`) in the frozen SDD spec, design, and tasks, and in `docs/superpowers/specs/2026-09-14-model-profile-site-design.md` section 3.2.
- [ ] TC.2 Run `sdd-archive` for `scaffold-data-contract-go-catalog` with final-state facts (requires explicit maintainer go-ahead).

## Acceptance criteria

- `pnpm validate && pnpm test && pnpm build` pass on the slice 10 branch.
- 29 catalog files: 19 current / 6 legacy / 4 experimental.
- `phases.yaml` has 27 unique phase ids; runtime maps count Pi 24, OpenCode 21, Claude Code 19, Codex 17.
- Bundle hash is order-invariant and tamper-evident; CI workflow green on its own PR.

## Per-slice checks

`pnpm -r typecheck`, `pnpm test`, diff stat against the previous slice branch, then native
review at the slice boundary, push, `gh pr create --base <previous branch>`.

## Progress

- 2026-09-16: document created; slices 1-6 already delivered under SDD (PRs #17-#23, all open, all review-approved).
- 2026-09-16: slice 7 implemented (T7.1-T7.6), commits `5823504..92d782f`. Observed RED: focused catalog run, 95 failed / 172 passed, all `YamlLoadError ... ENOENT` for the 10 new ids. Observed GREEN: focused catalog run 267/267; `pnpm -r typecheck` exit 0; `pnpm test` 300/300 (re-run by the parent); 29 files, 19 current / 6 legacy / 4 experimental. T7.5 had no reachable RED of its own: the invariant already held in committed data, so no data was corrupted to force one. Native review and PR for this slice: pending.
- 2026-09-17: slice 7 native review approved and acknowledged (lineage `review-c8dc7c69d1c641ee`, reliability lens); two informational findings folded as T8.5 and T8.6. Pushed; PR #24 opened against `feat/2-catalog-alibaba-deepseek`.
- 2026-09-17: slice 8 implemented (T8.1-T8.6), commits `e8f5cb6..3ecba14`. Observed RED: focused phases run 116/116 failed (`YamlLoadError ENOENT ... data/phases`); focused validate run 1/13 failed ("rejects a duplicate phase id", no uniqueness check yet). T8.5 and T8.6 had no reachable RED: they pin behavior that was already correct (`deriveBudgetClass` ignores the multiplier; `checkCurrentRequiresCap` accepts partial-null plans). Observed GREEN: phases 116/116; catalog 268/268; `pnpm -r typecheck` exit 0; `pnpm test` 420/420 (re-run by the parent). Diff vs slice 7: 10 files, 638 insertions, 15 deletions; over the ~400-line heuristic because `phases.yaml` carries a rationale comment per phase and the slice absorbed two advisory items; not split. Native review and PR: pending.
- 2026-09-17: slice 8 native review approved and acknowledged (lineage `review-c2712fe1cfe18541`, reliability lens); five informational findings. The parent verified the two promo findings against the source: T8.5 reopened and moved to T10.2b; the other three folded as T9.5-T9.7. Pushed; PR #25 opened against `feat/2-catalog-minimax-xiaomi-tencent-meituan-meta`.
- 2026-09-17: slice 9 implemented (T9.1-T9.7), commits `54dd1d3..HEAD` of `feat/2-runtime-mappings`. Observed RED: focused runtime-mappings run 26/26 failed (`YamlLoadError ENOENT ... data/runtimes`). T9.5-T9.7 pin already-correct behavior, so each new assertion was proven by a reverted local mutation (wrong group, wrong role, broken weight sum, extra fixture field, shifted duplicate index): every mutation made the new assertion fail. The parent's cross-check against the live `opencode.json` found the writer had dropped `gentle-orchestrator`; after the maintainer's decision a second RED was observed (2 failed: "expected 20 to be 21", "expected [] to deeply equal ['opencode']") and then GREEN. Final: runtime-mappings 27/27; `pnpm -r typecheck` exit 0; `pnpm test` all passing (run by the parent); no private strings in `data/runtimes/`. Native review and PR: pending.
- 2026-09-17: slice 9 native review approved and acknowledged (lineage `review-f556e8866254e282`, reliability lens); five informational findings, all about `runtime-mappings.test.ts` checking hand-copied lists instead of the data files; folded as T10.10 and T10.11. Pushed; PR #26 opened against `feat/2-canonical-phases`. Slice 10 split into slices 10 and 11.
- 2026-09-17: slice 10 implemented (T10.1-T10.4, T10.2b, T10.10-T10.12), commits `edf44e4..292ad8d`. Observed RED: `canonical.property.test.ts` and `bundle-cross-file-integrity.test.ts` failed on missing modules before the code existed; `bundle.integration.test.ts` failed both assertions against a throwing `loadBundle` stub; T10.2b failed against a deliberately wrong `buildBundle` that multiplied the cap (`expected 'volume' to be 'workhorse'`), reverted before commit; the three negative integrity fixtures failed against a neutered `checkCrossFileIntegrity`. Assertions with no natural RED (agentMap uniqueness, runtime directory listing) were proven by reverted mutations. Observed GREEN: canonical 3/3; bundle 7/7; runtime-mappings 25/25; catalog 268/268; `pnpm -r typecheck` exit 0; `pnpm test` 515/515 (re-run by the parent); no `child_process` in `packages/data/src`. Diff vs slice 9: 13 files, 905 insertions, 150 deletions; over the ~400-line guide after one slicing pass already moved the CLIs and CI to slice 11; not split further. Native review and PR: pending.
- 2026-09-18: slice 10 native review approved and acknowledged (lineage `review-4384fb190d896943`, reliability lens); eight informational findings, two verified by the parent against the source (locale-dependent sort, dangling subscription fallback); folded as T11.1-T11.5 ahead of the CLIs. Pushed; PR #27 opened against `feat/2-runtime-mappings`, labeled `size:exception`.
- 2026-09-18: slice 11 implemented (T11.1-T11.5, T10.13), commits `b25d8e1..bed996a`. Observed RED: 5 of 9 new canonical property tests failed against the old `localeCompare` order, nested reordering, null items, and tied keys; 3 dangling-subscription/derivedFrom assertions failed (the dangling case surfaced the real pre-fix bug: an untyped `Error("thresholds must end with a null max")`); 5 of 6 `loadBundle` shape tests failed with raw `SyntaxError` or a misleading `BundleHashMismatchError`; `load-data.test.ts` failed with `loadData is not a function`. Assertions with no natural RED (broadened "any scalar" property; the hash-mismatch regression case) were proven by reverted mutations. Observed GREEN: canonical 9/9; bundle 19/19; load-data 5/5; `pnpm -r typecheck` exit 0; `pnpm test` 538/538 (re-run by the parent); no `.localeCompare(` call and no `child_process` in `packages/data/src`. Diff vs slice 10: 11 files, 1010 insertions, 45 deletions; each fix sits with its tests, not split. Native review and PR: pending.
- 2026-09-18: native review for slice 11 declined by the maintainer for this candidate (lineage `review-ced255014c2a0e9d`, `consent: declined_this_candidate`; RDD stays on). Branch `feat/2-bundle-hardening` is committed locally and NOT pushed; no PR yet. Session paused here for a restart.
- 2026-09-18: slice 11 delivered without a native review receipt (declined above). The parent re-ran `pnpm test` before delivery: 13 files, 538/538. Pushed; PR #28 opened against `feat/2-bundle-hash`, labeled `size:exception` (diff vs slice 10: 11 files, 1019 insertions, 46 deletions, 542 added lines are tests). Slice 12 branch `feat/2-cli-ci-error-surfaces` created from `feat/2-bundle-hardening`.
- 2026-09-18: slice 12 implemented (T10.5-T10.8), route: delegated direct, one writer, then parent corrections inline. Commits `7d58451` (AGENTS.md), `b2315e3` (CLIs), `400c748` (CI workflow), `8d42ef1` (error surfaces). Observed RED: CLI tests failed with `Cannot find module '../../src/cli/build.js'` / `validate.js`; the `additionalProperties` test failed with `expected undefined to be defined`; the raw-fs test received a raw `EISDIR` error instead of `YamlLoadError`. Assertions with no natural RED (no-`child_process` scan, blank evidence) were proven by reverted mutations. A GGA pre-commit hook (local, installed 2026-09-18 13:45) first blocked every commit on a missing `AGENTS.md`; the maintainer chose to add one. Its first review then failed the CLI commit on a real defect: a failed bundle write escaped `runBuildCli` as a raw `fs` error and Node exited 1, the code reserved for invalid data. Parent fix, RED first: the write-failure test failed with a raw `EISDIR`; 4 new `io.test.ts` tests failed (`runGuarded is not a function`, error order depended on input order). Observed GREEN: cli 18/18; `pnpm -r typecheck` exit 0; `pnpm validate` exit 0; `pnpm test` 17 files, 559/559; `pnpm build` wrote `packages/data/build/data.json`, hash `be3e880d...`; no `child_process` in `packages/data/src`. Diff vs slice 11: 17 files, 886 insertions, 5 deletions. Native assessment: `high` (`process_boundary` on `cli/validate.ts`, `shell_source` on `ci.yml`). Native review and PR: pending.

## Rationale for accepted judgment calls (slice 12)

- `packages/data/package.json` scripts pass `../../data` explicitly: `pnpm -r run` executes with the package directory as cwd, so the design's literal `data` default would resolve to a nonexistent `packages/data/data`.
- `validate` takes one optional positional argument (data root); `build` takes two (data root, output path) so tests never write into the real `build/` directory. More arguments exit 2. `validate` prints nothing on success.
- `packages/data/src/cli/io.ts` holds what both CLIs share: exit codes, the stream shape, the root check, the error writer, and `runGuarded`, which turns an unexpected throw into exit 2 instead of Node's default exit 1.
- `AGENTS.md` is the rules file the local GGA hook reviews against. `.gga` stays untracked: it is local tool configuration and tracking it is the maintainer's call.
- WU2 findings folded: unknown-field naming, blank-evidence proof, raw `fs` errors typed as `YamlLoadError`. Not folded, still open: `R3-alias-bomb-fixture-unused` (test hygiene), `R3-budget-class-partial-validation` and `R3-threshold-schema-gap` (need a new code-level validator; `budget-class.ts` still throws a bare `Error`).

## Rationale for accepted judgment calls (slice 11)

- New error types `BundleParseError` and `BundleShapeError` (the design names only `DataError`, `DataValidationError`, `BundleHashMismatchError`). Unsupported `budgetClass.derivedFrom` and dangling `model.subscription` are integrity errors aggregated into `DataValidationError`, like the other cross-file checks.
- `loadData` / `validateData` are `async` per the design signatures but use synchronous `fs` internally, matching `readYamlFile`; a missing `data/overrides/` directory means zero overrides, consistent with the bundle spec ("Overrides collection is empty in this change").
- Testing gotcha recorded: under Vitest, importing a not-yet-defined named export yields `undefined` and `expect(fn).toThrow(undefined)` passes vacuously; scaffold the error class first so RED is real.

## Rationale for accepted judgment calls (slice 10)

- `canonicalJson` sorts object keys everywhere but reorders only the five id-bearing top-level collections (`subscriptions`, `models`, `phases`, `runtimes`, `overrides`), as the design's Loader API section states. Other arrays (`budgetClass.thresholds`, `effortVariants`, `requires`) keep authored order because their order carries meaning.
- `hashPayload` is SHA-256 over `canonicalJson(payload)`; the hash lives outside the payload. `loadBundle` re-hashes and throws `BundleHashMismatchError` on mismatch.
- `buildBundle` runs `checkCrossFileIntegrity` and throws `DataValidationError` on failure. The design's original signature did not specify this; it is the place where the whole dataset is together today. If `loadData` (T10.13) becomes the better home, move the call there.
- `openai` is accepted by the integrity check only as an explicit, commented example-only prefix until a subscription file exists (#4-#7).

## Rationale for accepted judgment calls (slice 9)

- OpenCode maps 21 agents, not 20 (maintainer decision 2026-09-17). The live config has 23 base agent keys (ignoring the `-oc-go*` tier variants); minus the builtins `explore` and `general` that is 21, including `gentle-orchestrator`. OpenCode is the only runtime where the orchestrator is a configured agent with its own model; in Pi, Claude Code, and Codex it is the active session model, so they carry no entry. A test pins that only OpenCode maps that phase.
- Known provider prefixes are `opencode-go` (the one committed subscription) and `openai` (the design's worked example; no `openai` subscription file exists yet). A later subscription slice (#4-#7) should confirm or replace the list.

## Rationale for accepted judgment calls (slice 8)

- The 27 canonical phase ids come from `docs/superpowers/specs/2026-09-14-model-profile-site-design.md` section 3.2 (lines 52-68); neither the frozen SDD spec nor its design enumerates them.
- Roles follow that design spec table, which the frozen spec names as the authority ("MUST follow the design spec's phase table"). The spec's own summary sentence is incomplete (see TC.3), so `jd-fix-agent` and `gentle-ai-worker` are `implementer` and `gentle-ai-verify` is `verifier`.
- `callPattern` is documented only for `gentle-orchestrator` and `sdd-apply` (`loop`). `sdd-remediate` is proposed as `loop` by analogy; the other 24 are proposed as `one-shot`. Weights are proposals. All of it is revisited when `packages/engine` consumes the file (#3).

## Rationale for accepted judgment calls (slice 7)

- `minimax-m2.5`: absent from the live model list, caps table, and training/retention table (present only in pricing and endpoint tables). Caps and `logRetentionDays` recorded as `null`; `trainsOnData: false` is inferred from its MiniMax siblings, not published. Open for maintainer confirmation.
- `hy3`: the 2026-08-19 source described an 8x promo; the live page fetched 2026-09-16 shows no promo annotation, so the file carries the flat 4,300 cap with no multiplier.
- New code check `checkCurrentRequiresCap` in `packages/data/src/validate.ts`: the schema types `requestsPer5h` as `number|null`, so it cannot reject a `current` model with no numeric cap.

## Next step

Slice 12 native review (assessed `high`), then on the maintainer's go-ahead push `feat/2-cli-ci-error-surfaces` and open PR #29 against `feat/2-bundle-hardening`; T10.9 closes when the CI workflow is green on that PR. Then close-out TC.1, TC.3, TC.4, and TC.2 (archive, needs explicit go-ahead).
