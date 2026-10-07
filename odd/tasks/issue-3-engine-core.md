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
  `one-shot`: sniper > semi > workhorse > volume), then higher `cheap` Strength, then higher base
  `requestsPer5h`, then model id. "Cheaper" never means money (ADR 0001). The duplicate-Subscription
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
- [ ] T1 Scaffold `packages/engine`: `package.json` (`@gentle-ai/profile-engine`, `type: module`, scripts `typecheck`, `test`, `build`; devDependencies only: typescript, vitest, fast-check, `@gentle-ai/profile-data` as `workspace:*` for types), `tsconfig.json`, `vitest.config.ts`, `src/index.ts`. `pnpm install` updates the lockfile. A test proves the package has no runtime dependencies.
- [ ] T2 Types (`src/types.ts`): `Tier`, `Selection`, `Profile`, `ProfileRow`, `Effort`, `ReasonFactor` and `Warning` unions, `Candidate` (internal). Phase ids come from the payload, not a hardcoded list.
- [ ] T3 Pool (`src/pool.ts`): candidates from the payload for the selection; RED-first scenarios on a hand-written fixture catalog (`test/fixtures/`): a Plan the model does not list excludes it; two Subscriptions offering the same model yield two candidates with distinct prefixed ids; `clientCode` drops trains-on-data models with a `constraint-pruned` reason; `maxLogRetentionDays` drops over-limit and `null` retention (`retention-unknown`).
- [ ] T4 Budget Class filter (`src/budget.ts`): `sniper` excluded from `loop` Phases with a `budget-filter` reason; `null` class excluded from `loop`, allowed for `one-shot` with `budget-unknown`; fit rank per call pattern as a pure function with a table test.
- [ ] T5 Verify: `pnpm -r typecheck`; `pnpm test` (data package unchanged at 510); the no-runtime-dependency test; `pnpm build` still prints the data hash `6d9e831c6b3644adf7001295012456a371b3a30401b12c373e65dd3b538c51ce`.

Slice 2 (branch `feat/3-engine-resolve` from slice 1), route: delegated, one writer.
- [ ] T6 Scoring (`src/score.ts`): the formula above; RED-first: LEAN prefers the cheaper of two equal-quality models; HIGH ignores `cheap`; BALANCED uses the authored weights; the renormalization keeps weights summing to 1.
- [ ] T7 Tiebreaks and the duplicate-Subscription rule; effort rules (`src/effort.ts`): HIGH gives `high` to a workhorse that lists the variant and `default` to a sniper.
- [ ] T8 Fallback Chain and rows (`src/resolve.ts`, `resolveProfile`): 2-10 fallbacks, `fallback-chain-short`, the empty row with `pool-empty` and `fill-candidate`; every row carries only typed Reason Factors (a test asserts no string field other than ids and codes). Phase order worker, fix-agent, then data order.
- [ ] T9 Verify as T5; `resolveProfile` over the hand-written catalog at each Tier matches the scenario expectations.

Slice 3 (branch `feat/3-engine-demo` from slice 2), route: delegated, one writer.
- [ ] T10 Property tests (`test/*.property.test.ts`, fast-check over generated catalogs): a sniper never appears in a loop Phase as primary or fallback; with at least three eligible survivors every chain has 2-10 entries; the result does not depend on model input order.
- [ ] T11 Real-data test: `resolveProfile` over `loadBundle(packages/data/build/data.json)` built in the test from `loadData('data')` + `buildBundle`, for OpenCode Go at each Tier, yields 13 rows, none empty, with no sniper in `gentle-orchestrator` or `gentle-ai-worker`.
- [ ] T12 Demo: `packages/engine/src/cli/demo-command.ts` (args and streams in, exit code out) plus `src/bin/demo.ts`; `pnpm --filter @gentle-ai/profile-engine demo` prints the 13-row Profile for OpenCode Go at each Tier; the data package's `tsx` pattern; the demo (not the engine) reads the bundle file. A short `packages/engine/README.md`.
- [ ] T13 Verify as T5 plus the demo run; record the printed primaries per Tier in this document.

## Acceptance criteria

From the issue: property tests prove a sniper never appears in a loop Phase as primary or
fallback and every Fallback Chain has 2-10 entries; scenario tests on hand-written catalogs prove
LEAN prefers the cheaper of two equal-Strength models, HIGH gives high effort to a workhorse with
that variant and default to a sniper, and a Phase with an empty pool names the Subscription that
would fill it; constraint pruning removes trains-on-data models when client code is on and models
over the retention limit; every row carries Reason Factors as codes with parameters and no
natural-language strings; the demo prints a full 13-row Profile for OpenCode Go at each Tier; the
package has zero runtime dependencies.

## Progress

- 2026-10-07: document created on branch `feat/3-engine-pool` from `main` (`060e871`) after a
  read-only exploration of the design spec and `packages/data`; the Tier formula was approved by
  the maintainer the same day.

## Next step

Slice 1, T1-T5, delegated to one writer.
