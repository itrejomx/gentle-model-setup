# Issue #3: engine core, resolve a Go-only Profile

Locator: `odd/tasks/issue-3-engine-core.md`
Engram mirror: topic `odd/issue-3-engine-core/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/3 (rewritten 2026-10-07 for the 13-Phase roster)

## Objective

`packages/engine` (`@gentle-ai/profile-engine`): a pure function that takes the data bundle
payload and a selection (Subscriptions with Plans, Tier, constraints) and returns a Profile of
13 rows, each with primary, effort, 2-10 fallbacks, and typed Reason Factors; a demo prints the
Profile for OpenCode Go at each Tier.

## Problem and why

Everything downstream (site, checker, exporters) consumes a resolved Profile. The data contract
(#2, #40) is on `main`; the engine is the first consumer and the place where the design's
resolution rules become code. Independence (#8), Overrides (#9), and Pins (#12) are later slices:
the engine leaves typed hooks and implements none of them.

## Decisions (design spec `docs/superpowers/specs/2026-09-14-model-profile-site-design.md`, issue #3, and the maintainer, 2026-10-07)

- Signature: `resolveProfile(payload: BundlePayload, selection: Selection): Profile`. The design
  omits the catalog argument; the engine is pure, so the payload is passed in. `Selection =
  { subscriptions: { id, plan }[], tier: 'HIGH' | 'BALANCED' | 'LEAN', constraints: { clientCode,
  maxLogRetentionDays? }, pins? }`; `pins` is typed and ignored in this issue.
- Row: `{ phase, primary, effort, fallbacks, reasons, warnings, override?, pin? }`; `primary` and
  each fallback are prefixed model ids (`<subscription>/<model>`); an empty row has `primary: null`.
- Pool: every `current` model offered on the selected Plan of each selected Subscription; a model
  offered by two Subscriptions is two candidates. `clientCode: true` drops `trainsOnData: true`;
  `maxLogRetentionDays` drops models whose `logRetentionDays` exceeds it, and drops `null`
  retention too (unknown fails closed, with a Reason Factor).
- Budget Class is a hard filter against `callPattern`: `sniper` never serves a `loop` Phase as
  primary or fallback; a `null` Budget Class is ineligible for `loop` and allowed for `one-shot`
  with a warning.
- Score (maintainer, 2026-10-07): `sum(weight[axis] * strength[axis])` over the six axes with the
  Phase's weights, where the Tier multiplies the `cheap` weight by HIGH 0, BALANCED 1, LEAN 3 and
  the weights are renormalized to sum 1. Strength keys are camelCase as in the data.
- Tiebreaks, in order: Budget Class fit for the call pattern (`loop`: volume > workhorse > semi;
  `one-shot`: sniper > semi > workhorse > volume), then higher `cheap` Strength, then prefixed
  model id. "Cheaper" never means money, and the engine never reads a raw cap: ADR 0001 says it
  sees only Budget Class, so a `requestsPer5h` tiebreak proposed on 2026-10-07 was dropped the
  same day when the pre-commit review flagged it. The duplicate-Subscription
  rule from the design (higher Budget Class for the pattern, capped over metered, the Subscription
  holding more rows) is implemented and tested on a hand-written two-Subscription catalog; it is
  moot for Go-only.
- Effort: `sniper` and `semi` always `default`; `workhorse` and `volume` get `high` in HIGH when the
  model lists that variant, otherwise `default`; BALANCED and LEAN always `default`.
- Fallback Chain: the next survivors in score order, same filters, at most ten; fewer than two
  yields the chain that exists plus a `fallback-chain-short` warning, never an invented entry;
  an empty pool yields the empty row with a `pool-empty` reason and `fill-candidate` reasons naming
  the Subscriptions in the payload that offer an eligible model, sorted by id (no price order;
  revisit with #5).
- Reason Factors are a closed union of `{ code, params }` with no prose: `strength-score`,
  `tier-applied`, `budget-filter`, `budget-fit`, `constraint-pruned`, `effort-high`, `effort-default`,
  `duplicate-tiebreak`, `pool-empty`, `fill-candidate`; warnings: `fallback-chain-short`,
  `budget-unknown`, `retention-unknown`. Independence codes come with #8.
- Phase order: `gentle-ai-worker`, `jd-fix-agent`, then `phases.yaml` order. The weights in
  `phases.yaml` are accepted as inputs.
- Zero runtime dependencies: `import type` from `@gentle-ai/profile-data` only; no I/O in the
  engine; the demo loads `packages/data/build/data.json` through `loadBundle` and lives in the demo
  entry, not the engine.

## Scope

In: `packages/engine/**` (new), its tests and fixtures, `pnpm-lock.yaml`, the demo script, a short
engine README. Out: Independence, Overrides, Pins behavior; any change under `data/`,
`packages/data/src`, `openspec/`, `docs/` beyond a one-line README pointer if needed.

## Constraints

- Test-first: observed RED before each behavior; a reverted mutation where no natural RED exists.
  Runner: Vitest through pnpm (`export PATH=/opt/homebrew/bin:$PATH` first in zsh). Property
  tests with `fast-check`, as `packages/data` does.
- `AGENTS.md` rules: strict TypeScript, no `any`, `.js` relative imports, `import type`, typed
  errors, deterministic total orders with explicit tie-breaks, glossary terms, no money reasoning.
- A local GGA pre-commit hook reviews staged `*.ts` against `AGENTS.md`; never bypass it. Stage
  explicit paths only; `.gga` stays untracked. Conventional commits, no AI attribution.
- Delivery: `ask-on-risk` with the cached chain strategy `stacked-to-main`; forecast about 1100
  authored lines in three slices, one PR each, stacked.
- Receipt-driven development is on; the review candidate is each PR slice.

## Tasks

Slice 1 (branch `feat/3-engine-pool`), route: delegated, one writer.
- [x] T1 Scaffold `packages/engine`: `package.json` (`@gentle-ai/profile-engine`, `type: module`, scripts `typecheck`, `test`, `build`; devDependencies only: typescript, vitest, fast-check, `@gentle-ai/profile-data` as `workspace:*` for types), `tsconfig.json`, `vitest.config.ts`, `src/index.ts`. `pnpm install` updates the lockfile. A test proves the package has no runtime dependencies.
- [x] T2 Types (`src/types.ts`): `Tier`, `Selection`, `Profile`, `ProfileRow`, `Effort`, `ReasonFactor` and `Warning` unions, `Candidate` (internal). Phase ids come from the payload, not a hardcoded list.
- [x] T3 Pool (`src/pool.ts`): candidates from the payload for the selection; RED-first scenarios on a hand-written fixture catalog (`test/fixtures/`): a Plan the model does not list excludes it; two Subscriptions offering the same model yield two candidates with distinct prefixed ids; `clientCode` drops trains-on-data models with a `constraint-pruned` reason; `maxLogRetentionDays` drops over-limit and `null` retention (`retention-unknown`).
- [x] T4 Budget Class filter (`src/budget.ts`): `sniper` excluded from `loop` Phases with a `budget-filter` reason; `null` class excluded from `loop`, allowed for `one-shot` with `budget-unknown`; fit rank per call pattern as a pure function with a table test.
- [x] T5 Verify: `pnpm -r typecheck`; `pnpm test` (data package unchanged at 510); the no-runtime-dependency test; `pnpm build` still prints the data hash `6d9e831c6b3644adf7001295012456a371b3a30401b12c373e65dd3b538c51ce`.

Slice 2 (branch `feat/3-engine-resolve` from slice 1), route: delegated, one writer.
- [x] T5b (slice 1 review) Selection validation in `buildPool`: a Subscription id not in the payload, or a Plan the Subscription does not declare, raises a typed engine error naming the id; the same Subscription listed twice (any Plans) is rejected the same way, so a prefixed candidate id is unique in the pool. RED-first on the fixture catalog.
- [x] T5c (slice 1 review) `filterByCallPattern` copies kept candidates too (or the doc comment stops claiming it); a test appends a reason to a kept candidate and checks the pool candidate is untouched.
- [x] T5d (slice 1 review) `dependencies.test.ts` also fails on a bare side-effect import or a dynamic `import()` of the data package; proven by a reverted mutation.
- [x] T6 Scoring (`src/score.ts`): the formula above; RED-first: LEAN prefers the cheaper of two equal-quality models; HIGH ignores `cheap`; BALANCED uses the authored weights; the renormalization keeps weights summing to 1.
- [x] T7 Tiebreaks and the duplicate-Subscription rule; effort rules (`src/effort.ts`): HIGH gives `high` to a workhorse that lists the variant and `default` to a sniper.
- [x] T8 Fallback Chain and rows (`src/resolve.ts`, `resolveProfile`): 2-10 fallbacks, `fallback-chain-short`, the empty row with `pool-empty` and `fill-candidate`; every row carries only typed Reason Factors (a test asserts no string field other than ids and codes). Phase order worker, fix-agent, then data order.
- [x] T9 Verify as T5; `resolveProfile` over the hand-written catalog at each Tier matches the scenario expectations.

Slice 3 (branch `feat/3-engine-demo` from slice 2), route: delegated, one writer.
- [x] T9b (slice 2 review, WARNING) Duplicate-Subscription rule with three or more Subscriptions offering the same model at the same score: `rank.ts` compares the group's first two entries instead of the winner against the current top, so a metered candidate can stay primary over two capped duplicates with no `duplicate-tiebreak`. RED-first with x metered, y and z capped, same score and fit; fix so the best of the group takes the top position.
- [x] T9c (slice 2 review) `dependencies.test.ts`: anchor the type-only import pattern to one statement so the proof does not depend on semicolon style; prove by a reverted mutation (a value import after an `import type` line without a semicolon).
- [x] T9d (slice 2 review) `pool.test.ts`: a Subscription that declares a Plan named `constructor` which no model lists yields an empty pool (reaches the `Object.hasOwn` guard again).
- [x] T10 Property tests (`test/*.property.test.ts`, fast-check over generated catalogs): a sniper never appears in a loop Phase as primary or fallback; with at least three eligible survivors every chain has 2-10 entries; the result does not depend on model input order.
- [x] T11 Real-data test: `resolveProfile` over `loadBundle(packages/data/build/data.json)` built in the test from `loadData('data')` + `buildBundle`, for OpenCode Go at each Tier, yields 13 rows, none empty, with no sniper in `gentle-orchestrator` or `gentle-ai-worker`.
- [x] T12 Demo: `packages/engine/src/cli/demo-command.ts` (args and streams in, exit code out) plus `src/bin/demo.ts`; `pnpm --filter @gentle-ai/profile-engine demo` prints the 13-row Profile for OpenCode Go at each Tier; the data package's `tsx` pattern; the demo (not the engine) reads the bundle file. A short `packages/engine/README.md`.
- [x] T13 Verify as T5 plus the demo run; record the printed primaries per Tier in this document.

## Acceptance criteria

From the issue: property tests prove a sniper never appears in a loop Phase as primary or
fallback and every Fallback Chain has 2-10 entries; scenario tests on hand-written catalogs prove
LEAN prefers the cheaper of two equal-Strength models, HIGH gives high effort to a workhorse with
that variant and default to a sniper, and a Phase with an empty pool names the Subscription that
would fill it; constraint pruning removes trains-on-data models when client code is on and models
over the retention limit; every row carries Reason Factors as codes with parameters and no
natural-language strings; the demo prints a full 13-row Profile for OpenCode Go at each Tier; the
package has zero runtime dependencies.

## Rationale for accepted judgment calls (slice 1)

- `packages/data` declares `main`/`types` under `dist` but never emits it, so the engine's
  `tsconfig.json` maps `@gentle-ai/profile-data` to `../data/src/index.ts` through `paths` and sets
  `noEmit: true`; the engine's `build` script is a typecheck. Whether either package should emit
  declarations is a packaging decision for the publish slice (#14), not for the engine core.
- `UnknownCallPatternError` is defined in the engine: importing the data package's error classes
  would be a runtime import, which the zero-dependency rule forbids.
- A `null` Budget Class excluded from `loop` carries only the `budget-unknown` warning; a candidate
  with `null` retention under a limit carries `constraint-pruned` plus `retention-unknown`; a
  candidate that breaks both constraints carries two `constraint-pruned` reasons.
- `Profile` is `{ tier, rows }`; `Effort` is `'default' | 'high'`; `override?` and `pin?` are typed
  as `{ model: string }` and never set in this issue. `filterByCallPattern` returns `{ kept,
  excluded }` and never mutates its input.
- Plan lookup uses `Object.hasOwn`: a Plan named like an inherited property (`constructor`) must
  offer nothing.

## Rationale for accepted judgment calls (slice 2)

- `Candidate` carries `billingModel` from its Subscription so the duplicate rule can prefer
  `capped` over `metered`. The duplicate rule applies to the top position only, after the general
  total-order sort, which keeps the comparator transitive; `duplicate-tiebreak` is emitted only
  when one of its three rules decides.
- Row reasons are ordered: the primary's candidate reasons (`budget-fit`, `strength-score`), then
  the effort reason, then Phase-level reasons (`tier-applied`, then any `duplicate-tiebreak`).
  `tier-applied` params are `{ tier, multiplier, cheapWeight }`.
- `fill-candidate` reuses `buildPool` and `filterByCallPattern` per Plan of every Subscription in
  the payload, so the suggestion respects the selection's constraints.
- An invalid selection throws `InvalidSelectionError` from `resolveProfile`.
- A payload without `gentle-ai-worker` or `jd-fix-agent` simply has no such rows; the pre-commit
  reviewer suggested a warning or moving the lead order into data. Left as specified: the real
  payload always has both, and the fixture's two Phases exercise the fallback order.

## Rationale for accepted judgment calls (slice 3)

- The real-data test and the demo import the data package's runtime API (`loadData`, `buildBundle`,
  `loadBundle`); the dependency test allows value imports only under `src/cli/` and `src/bin/`
  and keeps the engine core type-only. Vitest resolves `@gentle-ai/profile-data` through an alias
  to `../data/src/index.ts` because the data package never emits `dist`.
- The duplicate rule's `dropped` param is the duplicate the deciding rule separates from the
  winner (the old top when the winner displaces it); unchanged for two-candidate groups.
- Property tests run with a fixed seed (20261007) and 300 runs; catalogs span up to three
  Subscriptions, fourteen models each, every Budget Class including `null`.

## Progress

- 2026-10-07: document created on branch `feat/3-engine-pool` from `main` (`060e871`) after a
  read-only exploration of the design spec and `packages/data`; the Tier formula was approved by
  the maintainer the same day.
- 2026-10-07: slice 1 (T1-T5) implemented by one delegated writer, commits `b8a5976` (scaffold, types, dependency test) and `73b58d4` (pool, Budget Class filter). Observed RED: the dependency test failed with ENOENT on `package.json` before the scaffold; `tsc` failed `TS2307: Cannot find module '@gentle-ai/profile-data'` before the `paths` mapping; the pool tests failed `Cannot find module '../src/pool.js'`, then the `constructor` Plan case failed `expected [ ...(4) ] to deeply equal []` until `Object.hasOwn`; the clientCode and four retention cases failed before their rules; the budget tests failed on the missing module. Reverted mutations proved the legacy exclusion, the duplicate-Subscription candidates, the `import type` scan, and the fit-order call. Observed GREEN: engine 3 files, 31 tests; `pnpm -r typecheck` clean; `pnpm test` data 510 unchanged plus engine 31; `pnpm build` data hash `6d9e831c...` unchanged; `pnpm validate` exit 0; no price, Usd, or money token in the engine; the three data imports are `import type`.
- 2026-10-07: parent gate. Reflog clean; files inside `packages/engine/**`, `pnpm-lock.yaml`, and this document; no stray emitted file under `packages/data/src` (the writer's one `tsc` emit was cleaned up); `package.json` has no `dependencies`; checks re-run by the parent with the same results. Fixture catalog: Subscriptions `alpha` (Plans `basic`, `pro`) and `beta` (`standard`); six models covering sniper, workhorse with a `high` variant, legacy, trains-on-data volume, pro-only null cap and null retention, and a duplicate id on `beta`; Phases `loop-phase` and `one-shot-phase`.
- 2026-10-07: slice 1 native review (assessed `medium`: configuration change in `packages/engine/package.json`) granted by the maintainer, reliability lens, approved and acknowledged (lineage `review-87efe405e9562879`, authority burned). Three informational findings, all accepted as true and folded into slice 2 as T5b-T5d: `R3-pool-duplicate-selection-ids` (WARNING: a Subscription listed twice yields candidates sharing one prefixed id; an unknown Subscription or undeclared Plan gives an empty pool silently); `R3-budget-kept-aliasing` (kept candidates are pushed by reference while the doc says copied); `R3-import-type-scan-gaps` (the scan misses side-effect and dynamic imports).
- 2026-10-07: slice 1 pushed; PR #45 opened against `main` (`Refs #3`; 13 files, 861 insertions excluding the lockfile); CI job `validate-and-test` passed (run 37684713736). Slice 2 branch `feat/3-engine-resolve` created from slice 1.
- 2026-10-07: slice 2 writer stopped at the T6-T7 commit: the GGA pre-commit review rejected a `requestsPer5h` tiebreak in `rank.ts` under the `AGENTS.md` rule "no code outside the derivation reasons about prices, money, or raw caps" (ADR 0001). The tiebreak was the parent's default, not a maintainer decision; the parent dropped it (Decisions amended above) and resumed the writer. T5b-T5d are committed (`897d5f4`).
- 2026-10-07: slice 2 done by the resumed writer, commits `b27519a` (scoring, tiebreaks, effort) and `ea840a9` (`resolveProfile`). Observed RED: `score.js` and `effort.js` missing on first run; each tiebreak (fit, `cheap`, id) failed before its code; duplicate-Subscription tests 4 of 5 failing at once (written together, a vertical-slice deviation the writer reported); `resolveProfile` Phase order wrong, reasons `expected [] to deeply equal [Array(4)]`, chain-short and empty-row cases 2 each, rows-held `expected 'x/work-horse' to be 'y/work-horse'`. Reverted mutations: `LEAN: 1` and `HIGH: 1` broke the Tier tests; the always-eligible effort check broke the sniper test; dropping warnings, raising the chain cap to 11, and dropping rows-held tracking each broke their test; the free-string walk needed an all-pruned selection before a prose mutation in `pool-empty` was caught. Observed GREEN: engine 7 files, 79 tests; `pnpm -r typecheck` clean; data 510 unchanged; data hash `6d9e831c...` unchanged; `pnpm validate` exit 0; no `requestsPer5h`, price, money, or `localeCompare` token in the engine; six data imports, all `import type`. Fixture Profiles: plain catalog, every Tier, `loop-phase` -> `alpha/trainer` default with fallbacks `alpha/work-horse`, `beta/work-horse`; `one-shot-phase` -> `alpha/sniper-one` default. Variant with a stronger workhorse and a cheaper volume model, alpha `pro`, `loop-phase`: HIGH `alpha/work-horse` high; BALANCED `alpha/work-horse` default; LEAN `alpha/trainer` default.
- 2026-10-07: parent gate. Reflog clean; three commits, only `packages/engine/**`; forbidden-token scan empty; checks re-run with the same results; `resolveProfile(payload, selection)` exported from `index.ts`.
- 2026-10-07: slice 2 native review (assessed `medium`: executable change in `budget.ts`) granted by the maintainer, reliability lens, approved and acknowledged (lineage `review-0ab916227e5c6857`, authority burned). Three findings, all accepted and folded into slice 3 as T9b-T9d: `R3-duplicate-rule-three-way-group` (WARNING, a real defect reachable only with three Subscriptions offering the same model: the rule compares the group's first two entries, not the winner against the current top); `R3-type-only-import-regex-spans-statements`; `R3-hasown-plan-guard-now-unexercised`.
- 2026-10-07: slice 3 (T9b-T9d, T10-T13) implemented by one delegated writer, commits `bace291` (review findings), `6b65c37` (property and real-data tests), `f09fe2f` (demo, README). Observed RED: the three-way duplicate case received `[x, y, z]`, expected `[y, x, z]`; the semicolon-less import case counted the value import as type-only until the pattern was anchored; the `constructor` Plan case returned four models with `in` instead of `Object.hasOwn`; the property tests each failed under a reverted mutation (sniper allowed in loop, `MAX_FALLBACKS = 11` gave `expected 11 to be less than or equal to 10`, dropping the id tiebreak broke order independence) with shrunk counterexamples; the real-data test first failed `Failed to resolve entry for package "@gentle-ai/profile-data"` until the Vitest alias; the demo test failed `Cannot find module '../src/cli/demo-command.js'`. Observed GREEN: engine 10 files, 104 tests; `pnpm -r typecheck` clean; data 510 unchanged; data hash `6d9e831c...` unchanged; `pnpm validate` exit 0; the only value import of the data package in `src/` is `src/cli/demo-command.ts`.
- 2026-10-07: parent gate. Reflog clean; files inside `packages/engine/**` and `pnpm-lock.yaml`; forbidden-token scan empty; checks re-run with the same results; demo run by the parent: three tables of 13 rows. Result for OpenCode Go, Plan Go: every row at every Tier resolves to `opencode-go/glm-5.2` with 10 fallbacks; HIGH gives `high` effort on all 13 rows, BALANCED and LEAN `default`. The engine behaves as specified; the lack of Phase differentiation comes from the data: `glm-5.2` has the strongest Strengths in the catalog (`codingTools` 3, the rest 2) and `phases.yaml` says its weights are proposals to revisit once the engine consumes them. That revisit is a data follow-up, not an engine change.
- 2026-10-07: slice 2 pushed; PR #46 opened against `feat/3-engine-pool` (`Refs #3`; 18 files, 1072 insertions, 27 deletions); CI job `validate-and-test` passed (run 37693412339). Slice 3 branch `feat/3-engine-demo` created from slice 2.

## Next step

Native review for slice 3 (`--base-ref feat/3-engine-resolve --committed-only`), then on the maintainer's go-ahead push and open its PR stacked on #46. Merge order #45, #46, slice 3. Then a follow-up issue for the Phase weights and Strength ratings, so the Profile differentiates by Phase (data, with the maintainer).
