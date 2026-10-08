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
- [ ] T1 `rank.test.ts`: x capped, y capped, z metered, same score and fit, no rows held: the winner stays `x`, the group yields one `duplicate-tiebreak` with `kept: x`, `dropped: z`, rule `capped-over-metered`.
- [ ] T2 `dependencies.test.ts`: a semicolon-less `export { X } from "@gentle-ai/profile-data"` after an `import type` line is counted as a violation; anchor the type-only pattern on any statement start; prove with a reverted mutation of the pattern.
- [ ] T3 `real-data.test.ts`: the sniper set is derived from the payload (`budgetClass === 'sniper'` on the `go` Plan of current models), asserted non-empty, and used for the loop-row invariant; the hardcoded four ids go away.
- [ ] T4 `real-data.test.ts`: assert that no row carries `fallback-chain-short` on the committed data and that every row has exactly 10 fallbacks.
- [ ] T5 `cli/demo.test.ts`: a bundle built over a payload without the `opencode-go` Subscription makes the demo exit `1` with the `InvalidSelectionError` message on stderr.
- [ ] T6 Verify: `pnpm --filter @gentle-ai/profile-engine test`; `pnpm -r typecheck`; `pnpm test`; `pnpm build` (hash unchanged); no change under `packages/engine/src` except comments.

## Progress

- 2026-10-08: document created on branch `test/49-engine-hardening` from `main` (`383769e`).

## Next step

T1-T6, delegated to one writer.
