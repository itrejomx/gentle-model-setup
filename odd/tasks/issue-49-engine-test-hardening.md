# Issue #49: engine test hardening from the #47 review

Locator: `odd/tasks/issue-49-engine-test-hardening.md`
Engram mirror: topic `odd/issue-49-engine-test-hardening/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/49

## Objective

Close the five advisory findings of the slice 3 review of #3 without changing engine behavior.

## Scope

In: `packages/engine/test/**`, and `packages/engine/src/rank.ts` only for a comment if one is
needed. Out: any behavior change, any file outside `packages/engine`, the data package.

## Constraints

- Test-first: each item has a test observed failing first, or a reverted mutation where the
  behavior already holds. Runner: Vitest through pnpm (`export PATH=/opt/homebrew/bin:$PATH`).
- Baseline on `main` (`383769e`): engine 10 files, 104 tests; data 510; hash
  `6d9e831c6b3644adf7001295012456a371b3a30401b12c373e65dd3b538c51ce`.
- GGA pre-commit hook: never bypass. Explicit-path staging; `.gga` untracked. Conventional commits.
- Delivery: one PR to `main` with `Closes #49`; forecast under 200 lines.

## Tasks

Route: delegated, one writer (five test files).
- [x] T1 `rank.test.ts`: x capped, y capped, z metered, same score and fit, no rows held: the winner stays `x`, the group yields one `duplicate-tiebreak` with `kept: x`, `dropped: z`, rule `capped-over-metered`.
- [x] T2 `dependencies.test.ts`: a semicolon-less `export { X } from "@gentle-ai/profile-data"` after an `import type` line is counted as a violation; anchor the type-only pattern on any statement start; prove with a reverted mutation of the pattern.
- [x] T3 `real-data.test.ts`: the sniper set is derived from the payload (`budgetClass === 'sniper'` on the `go` Plan of current models), asserted non-empty, and used for the loop-row invariant; the hardcoded four ids go away.
- [x] T4 `real-data.test.ts`: assert that no row carries `fallback-chain-short` on the committed data and that every row has exactly 10 fallbacks.
- [x] T5 `demo-command.test.ts` (the document named `cli/demo.test.ts`; the demo tests live in `test/demo-command.test.ts`): a bundle built over a payload without the `opencode-go` Subscription makes the demo exit `1` with the `InvalidSelectionError` message on stderr.
- [x] T6 Verify: `pnpm --filter @gentle-ai/profile-engine test`; `pnpm -r typecheck`; `pnpm test`; `pnpm build` (hash unchanged); no change under `packages/engine/src` except comments.

## Progress

- 2026-10-08: document created on branch `test/49-engine-hardening` from `main` (`383769e`).
- 2026-10-08: T1-T6 done by one delegated writer, commit `5c380a6`, test files only (`git diff main..HEAD -- packages/engine/src` is empty; `rank.ts` needed no comment). Evidence: T1 passed on first run (behavior already correct) and was proven by a reverted mutation of the `dropped` selection (`dropped: z` became `y`); T2 failed 1 of 7 against the old pattern, the lookahead now rejects both `import` and `export`; T3 the derived sniper set failed under a reverted mutation that let snipers into loop (`gentle-ai-worker: opencode-go/qwen3.8-max: expected true to be false`); T4 failed at all three Tiers with `MAX_FALLBACKS` 9 (`got 9`), reverted; T5 first failed with a `DataValidationError` because `buildBundle` rejects a dangling `prefixMap.opencode-go` once the Subscription is dropped (the test drops the prefix too), then passed, and a mutation that rethrows every error proved it. GREEN: engine 10 files, 110 tests (104 before); data 510 unchanged; typecheck clean; hash `6d9e831c...` unchanged. Parent gate re-ran the checks with the same results.
- Open point from the writer: the type-only pattern still allows a newline directly before `from` (a legal multi-line `import type`), so a stricter newline rule was not added. Accepted: multi-line `import type` is valid TypeScript and the scan's job is the specifier count, not formatting.
- 2026-10-08: native review (assessed `medium`: executable change in `demo-command.test.ts`) granted by the maintainer, reliability lens, approved and acknowledged (lineage `review-09eaf86348bc20ed`, authority burned). One informational finding, `R3-derived-sniper-oracle`: deriving the sniper set from the payload proves the engine honors the data, not that the data marks the expected models; the issue asked for that trade-off. Accepted as is: pinning which models are snipers is a data-package concern (its catalog tests already pin caps), and #48 re-rates the catalog anyway.

## Next step

On the maintainer's go-ahead push `test/49-engine-hardening` and open the PR against `main` with `Closes #49`.
