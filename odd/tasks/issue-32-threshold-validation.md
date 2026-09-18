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

- [ ] T1 (route: delegated, one writer; trigger: 2+ non-trivial files) A last entry whose `max` is not `null` makes `validateSubscription` return a `DataError` with field `budgetClass.thresholds`. RED first, with a fixture under `test/fixtures/invalid/`.
- [ ] T2 `max` values that are not strictly ascending are rejected the same way.
- [ ] T3 A `null` `max` before the last entry is rejected.
- [ ] T4 An empty list is rejected (schema `minItems` if the schema can carry it, otherwise the code check).
- [ ] T5 CLI: `validate` and `build` both exit `1` on a data root with a malformed threshold list; `build` writes nothing; the printed line names the file and `budgetClass.thresholds`.
- [ ] T6 `deriveBudgetClass`: the two bare `Error` throws become unreachable for loaded data. Keep them as internal assertions and say so in their comment; do not add a second error path.
- [ ] T7 Verify: focused runs; `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` with the bundle hash unchanged (`be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`).
- [ ] T8 (housekeeping) `odd/tasks/issue-2-data-contract-go-catalog.md`: its "Next step" still says to merge #31 and close #2. Record that #31 merged (`b29a59f`), #2 closed, and the follow-ups are #32-#35.

## Acceptance criteria

From the issue: a fixture per malformed case returns a `DataError` naming the file and
`budgetClass.thresholds`, each observed failing first; `validate` and `build` exit `1` and
`build` writes nothing; the committed `data/` still validates and the hash does not change; no
new error type and no new exit code.

## Progress

- 2026-09-18: document created on branch `fix/32-threshold-validation` from `main` (`b29a59f`).

## Next step

T1, delegated to one writer.
