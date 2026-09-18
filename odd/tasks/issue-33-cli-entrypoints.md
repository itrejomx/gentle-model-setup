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

- [ ] T1 (route: delegated, one writer; trigger: 2+ non-trivial files) RED: a test under `packages/data/test/cli/` creates a symlink to the package in a temp dir, spawns the `validate` entry through the symlinked absolute path with a missing data root, and expects exit `2` and `cannot read data root` on stderr. Observed failing against the current guard (exit `0`).
- [ ] T2 GREEN: entry files that always run (for example `packages/data/src/bin/validate.ts` and `build.ts`) wire `process.argv`, the streams, `runGuarded`, and `process.exitCode`; remove the guard and the entrypoint block from `src/cli/validate.ts` and `src/cli/build.ts`; point the `packages/data/package.json` scripts at the entry files.
- [ ] T3 The same symlink test for the `build` entry.
- [ ] T4 Importing `src/cli/validate.ts` or `src/cli/build.ts` has no side effect (the existing in-process tests keep importing them and never trigger a run).
- [ ] T5 Verify: focused `cli` run; `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` with the bundle hash unchanged (`be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`); the no-`child_process` scan still passes; the manual reproduction exits `2`.
- [ ] T6 (housekeeping, parent) `odd/tasks/issue-32-threshold-validation.md`: record that PR #36 merged (`509865c`) and #32 closed.

## Acceptance criteria

From the issue: a test invokes each CLI entry through a symlinked path and observes the real
exit code, failing first against the current guard; `pnpm validate`, `pnpm build`, and the CI
workflow keep working unchanged from the repository root; no `child_process` import under
`packages/data/src`.

## Progress

- 2026-09-18: document created on branch `fix/33-cli-entrypoints` from `main` (`509865c`).

## Next step

T1, delegated to one writer.
