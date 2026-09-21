# Issue #33: CLI entrypoints must never load and do nothing

Locator: `odd/tasks/issue-33-cli-entrypoints.md`
Engram mirror: topic `odd/issue-33-cli-entrypoints/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/33

## Objective

Invoking `validate` or `build` always runs the CLI and returns its real exit code, whatever
path the script was reached through.

## Problem and why

`packages/data/src/cli/validate.ts` and `build.ts` run only when
`import.meta.url === pathToFileURL(process.argv[1]).href`. Through a path that contains a
symlink, `process.argv[1]` keeps the symlinked path and the module URL is the resolved real
path, so the comparison is false, nothing runs, and Node exits `0`. Reproduced on `main`
(2026-09-18): with `<link>` a symlink to the repository, from `<link>/packages/data`,
`node_modules/.bin/tsx <link>/packages/data/src/cli/validate.ts /definitely/missing` exits `0`
silently (contract: `2`); the relative path exits `2`. For `validate`, silence plus exit `0` is
what success looks like, so a caller cannot tell "valid" from "never ran".

## Scope

In: delete the `import.meta.url` guard. The testable functions (`runValidateCli`,
`runBuildCli`) stay in importable modules with no top-level side effects; the `process` wiring
moves to entry files that always run, and the `package.json` scripts point at them. Tests for
the entry files.
Out: #34 (atomic write), #35 (hardening list). No new flag, no config, no exit code change.

## Constraints

- Strict TDD: enabled (source: user global `CLAUDE.md`). Vertical slices, observed RED first.
- Test runner: Vitest through pnpm. Focused run:
  `pnpm --filter @gentle-ai/profile-data exec vitest run <pattern>`. Full: `pnpm test`.
- `AGENTS.md`: no `child_process` under `packages/data/src`. A test that spawns a process
  lives under `packages/data/test/` and is the only place allowed to import it.
- A local GGA pre-commit hook reviews staged `*.ts` against `AGENTS.md`. Never bypass it
  (`--no-verify` is forbidden). Stage explicit paths only; `.gga` stays untracked.
- Conventional commits, no AI attribution trailers.
- Delivery strategy: `ask-on-risk`. Forecast: about 150 authored changed lines, one PR to `main`.
- Receipt-driven development is on globally; the review candidate is the PR slice,
  `--base-ref origin/main --committed-only`.

## Tasks

- [x] T1 (route: delegated, one writer; trigger: 2+ non-trivial files) RED: a test under `packages/data/test/cli/` creates a symlink to the package in a temp dir, spawns the `validate` entry through the symlinked absolute path with a missing data root, and expects exit `2` and `cannot read data root` on stderr. Observed failing against the current guard (exit `0`).
- [x] T2 GREEN: entry files that always run (for example `packages/data/src/bin/validate.ts` and `build.ts`) wire `process.argv`, the streams, `runGuarded`, and `process.exitCode`; remove the guard and the entrypoint block from `src/cli/validate.ts` and `src/cli/build.ts`; point the `packages/data/package.json` scripts at the entry files.
- [x] T3 The same symlink test for the `build` entry.
- [x] T4 Importing `src/cli/validate.ts` or `src/cli/build.ts` has no side effect (the existing in-process tests keep importing them and never trigger a run).
- [x] T5 Verify: focused `cli` run; `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` with the bundle hash unchanged (`be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`); the no-`child_process` scan still passes; the manual reproduction exits `2`.
- [x] T6 (housekeeping, parent) `odd/tasks/issue-32-threshold-validation.md`: record that PR #36 merged (`509865c`) and #32 closed.

## Acceptance criteria

From the issue: a test invokes each CLI entry through a symlinked path and observes the real
exit code, failing first against the current guard; `pnpm validate`, `pnpm build`, and the CI
workflow keep working unchanged from the repository root; no `child_process` import under
`packages/data/src`.

## Rationale for accepted judgment calls

- Layout: `src/cli/validate.ts` and `src/cli/build.ts` export the testable functions and have no top-level side effects; `src/bin/validate.ts` and `src/bin/build.ts` are the entry files, each a single `runEntry(...)` call. `runEntry` lives in `src/cli/io.ts` and is the only place in the package that touches `process.argv`, the process streams, or `process.exitCode`.
- The spawn test imports `node:child_process` (`spawnSync`, argument array, no shell). `AGENTS.md` words the ban for all of `packages/data`; the enforcing scan covers `packages/data/src`. The test is the documented exception this issue asked for. Tightening the wording in `AGENTS.md` is left to #35.
- Not done: the pre-commit reviewer suggested a trailing `.catch` on `runEntry`'s promise chain in case `stderr.write` itself throws. `runGuarded` already catches every throw from the CLI core; the remaining case is speculative and not part of this issue.

## Progress

- 2026-09-18: document created on branch `fix/33-cli-entrypoints` from `main` (`509865c`).
- 2026-09-18: T1-T5 implemented by one delegated writer, commits `039787a` (fix + spawn test) and `0da7fe9` (comment accuracy, from a pre-commit review suggestion). Observed RED: `packages/data/test/cli/entry-symlink.test.ts`, pointed at the old entry `src/cli/validate.ts` through a symlinked absolute path, failed with `expected +0 to be 2` (exit 0, empty stderr). GREEN moved the wiring to `src/bin/validate.ts` and `src/bin/build.ts`; the test path followed, and the final test was proven load-bearing by re-adding the guard in `bin/validate.ts` (same failure), then reverting. The `build` symlink test passed at once, since the same change fixed both entries. Session paused before the parent gate.
- 2026-09-21: parent gate. Reflog clean (no reset, no bypassed commit); diff vs `main` is `packages/data/**` plus this document; no `child_process` under `packages/data/src`; `.gga` untracked. Re-run by the parent: `pnpm -r typecheck` clean; `pnpm validate` exit 0; `pnpm test` 18 files, 567/567; `pnpm build` hash `be3e880d...` unchanged. Manual reproduction through a symlink to the repository: `src/bin/validate.ts` and `src/bin/build.ts` both exit 2 with `error: cannot read data root "/definitely/missing"` (the old entry exited 0 silently).
- 2026-09-21: T6 done in this commit.
- 2026-09-21: native review (assessed `high`: `process_boundary` on `cli/validate.ts`) granted by the maintainer, four lenses, approved and acknowledged (lineage `review-4da7bd261524f525`, authority burned). 14 informational findings, none blocking; several lenses agree on four themes, all left as follow-up work for #35:
  - Stale entry path (`R4-stale-entry-silent-pass`, `R3-stale-entry-invocation`): the parent verified both halves. No caller in the repository references the old paths (scripts, workflow, docs, specs searched). But `tsx src/cli/validate.ts /definitely/missing` now loads the module, runs nothing, and exits 0: the same silent-success shape, reachable only by typing the old path by hand. Renaming the two function modules so the old path stops existing would make that loud.
  - `runEntry` has no rejection handler (`R1-unhandled-rejection-entry`, `R4-runentry-unhandled-rejection`, `R3-runentry-unhandled-rejection`, `R2-run-entry-fire-and-forget`): a throw from a stream write inside `runGuarded`'s own catch path would end as Node's unhandled-rejection exit 1. The same shape existed in the two deleted entrypoint blocks; this change relocated it.
  - The spawn test does not look at `result.error` or `result.signal` (`R4-spawn-failure-masked`, `R2-spawn-error-unchecked`, `R3-spawn-test-environment-coupling`, `R1-spawn-test-bin-path`): a missing `tsx` shim or the 15 s timeout reads as `expected null to be 2`, like a regression.
  - The two spawn tests assert the same usage-failure path (`R3-entry-tests-nondiscriminating`, `R2-duplicated-test-body`): wiring the wrong core into an entry file would not fail them.
  - Readability only: `R2-deleted-guard-comments`, `R2-import-format-drift`.
- 2026-09-21: pushed; PR #37 opened against `main` with `Closes #33` (9 files, 194 insertions, 37 deletions); CI job `validate-and-test` passed (run 35660520944).

## Next step

None: PR #37 merged on 2026-09-21 (`3c07a07`) and issue #33 closed. The four review themes recorded above are still to be folded into #35.
