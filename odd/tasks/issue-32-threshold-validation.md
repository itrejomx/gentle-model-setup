# Issue #32: validate Budget Class thresholds on load

Locator: `odd/tasks/issue-32-threshold-validation.md`
Engram mirror: topic `odd/issue-32-threshold-validation/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/32

## Objective

A Subscription with a malformed `budgetClass.thresholds` list fails `pnpm validate` and
`pnpm build` with exit `1`, naming the file and the field.

## Problem and why

The threshold rules (strictly ascending `max`, last entry `max: null`) are enforced only inside
`deriveBudgetClass` (`packages/data/src/budget-class.ts`), lazily, with a bare `Error`.
`validateData` never runs that code. Reproduced on `main` (2026-09-18) with the last entry
changed to `{ class: volume, max: 9000 }`: `validate` exits `0` silently; `build` exits `2` with
`error: thresholds must end with a null max ...`, no file, no field. A broken list that no
current cap reaches is not reported at all. ADR 0001 makes each Subscription file the owner of
its thresholds, so a broken list must be a data error at the door.

## Scope

In: a code-level check called from `validateSubscription`, JSON Schema tightening where the
schema can express the rule, fixtures, unit and CLI tests.
Out: #33 (entrypoint guard), #34 (atomic write), #35 (hardening list). No new error type, no
new exit code, no change to `deriveBudgetClass` results for valid data.

## Constraints

- Strict TDD: enabled (source: user global `CLAUDE.md`, "Strict TDD Mode: enabled"). Vertical
  slices: one failing test, observed, then the minimal code, then the next test.
- Test runner: Vitest through pnpm. Focused run:
  `pnpm --filter @gentle-ai/profile-data exec vitest run <pattern>`. Full: `pnpm test`.
- A local GGA pre-commit hook reviews staged `*.ts` against `AGENTS.md`. Never bypass it.
- Stage explicit paths only. `.gga` is untracked on purpose and must stay out of every commit.
- Conventional commits, no AI attribution trailers.
- Delivery strategy: `ask-on-risk`. Forecast: about 200 authored changed lines, one PR to `main`.
- Receipt-driven development is on globally; the review candidate is the PR slice,
  `--base-ref origin/main --committed-only`.

## Tasks

- [x] T1 (route: delegated, one writer; trigger: 2+ non-trivial files) A last entry whose `max` is not `null` makes `validateSubscription` return a `DataError` with field `budgetClass.thresholds`. RED first, with a fixture under `test/fixtures/invalid/`.
- [x] T2 `max` values that are not strictly ascending are rejected the same way.
- [x] T3 A `null` `max` before the last entry is rejected.
- [x] T4 An empty list is rejected (schema `minItems` if the schema can carry it, otherwise the code check).
- [x] T5 CLI: `validate` and `build` both exit `1` on a data root with a malformed threshold list; `build` writes nothing; the printed line names the file and `budgetClass.thresholds`.
- [x] T6 `deriveBudgetClass`: the two bare `Error` throws become unreachable for loaded data. Keep them as internal assertions and say so in their comment; do not add a second error path.
- [x] T7 Verify: focused runs; `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` with the bundle hash unchanged (`be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`).
- [x] T8 (housekeeping) `odd/tasks/issue-2-data-contract-go-catalog.md`: its "Next step" still says to merge #31 and close #2. Record that #31 merged (`b29a59f`), #2 closed, and the follow-ups are #32-#35.

## Acceptance criteria

From the issue: a fixture per malformed case returns a `DataError` naming the file and
`budgetClass.thresholds`, each observed failing first; `validate` and `build` exit `1` and
`build` writes nothing; the committed `data/` still validates and the hash does not change; no
new error type and no new exit code.

## Rationale for accepted judgment calls

- The JSON Schema is unchanged: `minItems: 1` already rejected an empty list, and JSON Schema 2020-12 cannot express ordering across items. The three ordering rules live in one code check, `checkThresholds` in `packages/data/src/validate.ts`, next to `checkCurrentRequiresCap`.
- `checkThresholds` reports the first violation it finds, not every one: once one entry is out of order, judging the rest of the list is unreliable. The pre-commit reviewer raised this as a non-blocking suggestion.
- The two bare `Error` throws in `deriveBudgetClass` stay as internal assertions; their comment now says they are unreachable for data that passed validation. The existing `budget-class.test.ts` case that calls the function directly with a malformed list still passes.

## Progress

- 2026-09-18: document created on branch `fix/32-threshold-validation` from `main` (`b29a59f`).
- 2026-09-18: T1-T7 implemented by one delegated writer, commits `f55c7d9` (fix + unit tests + 4 fixtures) and `1a3ce9d` (CLI tests). Vertical slices. Observed RED: T1 and T2 failed with `expected false to be true` (no matching error); T3 failed because the draft check bailed out on a non-number `max` and returned `[]`. No natural RED for T4 (the schema already had `minItems: 1`) or for the two CLI tests (wiring follows from T1-T4): each was proven by a reverted mutation (dropping `minItems`, dropping the `checkThresholds` call made the CLI return `0`). Observed GREEN: validate 31/31; cli 20/20; budget-class 9/9; `pnpm -r typecheck` clean; `pnpm validate` exit 0; `pnpm test` 17 files, 565/565 (re-run by the parent); `pnpm build` hash `be3e880d...` unchanged. Reproduction repeated by the parent on the branch: `validate` exit 1 (was 0) printing `<copy>/subscriptions/opencode-go.yaml:budgetClass.thresholds: the last threshold's max must be null ..., got 9000`; `build` exit 1 (was 2), nothing written. Diff vs `main`: `packages/data/**` only, plus this document; `.gga` still untracked.
- 2026-09-18: process note. The writer's first fix commit (`58c5232`) was made with `--no-verify`, against its instructions. It noticed, undid it with `git reset --soft HEAD~1`, and recommitted the same content through the hook (`f55c7d9`); the reflog shows the sequence. The bypassed commit is on no branch.
- 2026-09-18: T8 done in this commit.
- 2026-09-18: native review (assessed `medium`: executable change in `budget-class.ts`) granted by the maintainer, reliability lens, approved and acknowledged (lineage `review-76b81014c6a9098b`, authority burned). Two informational findings. `R3-nan-ordering` (a NaN `max` would slip through the ascending check): the parent tested it, `max: .nan` is already rejected by the schema (`budgetClass.thresholds.1.max: must be integer,null`, exit 1), so the code check never sees it; not acted on. `R3-missing-max-duplicate` (a last entry with no `max` key gets the schema's required-property error plus a redundant `got undefined` message from `checkThresholds`): true but cosmetic, left for #35.
- 2026-09-18: pushed; PR #36 opened against `main` with `Closes #32` (14 files, 375 insertions, 2 deletions); CI job `validate-and-test` passed (run 35407055732).

## Next step

None: PR #36 merged on 2026-09-18 (`509865c`) and issue #32 closed.
