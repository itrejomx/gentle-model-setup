# Issue #35: loader, CLI, and CI hardening

Locator: `odd/tasks/issue-35-hardening.md`
Engram mirror: topic `odd/issue-35-hardening/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/35 (body plus the 2026-09-22 comment)

## Objective

Close the advisory findings left by the reviews of #19, #29, #36, #37, and #38. No behavior
changes on valid data; the bundle hash does not change.

## Problem and why

Each finding is small; together they are the difference between a CLI that fails loudly and
one whose failure modes look like success or like each other. Grouped here so they land in one
reviewable slice instead of nine.

## Scope

In: the items in the task list, all under `packages/data/**`, `.github/workflows/ci.yml`, and
one wording fix in `AGENTS.md`.
Out: any new capability, flag, config, exit code, or error type. Nothing under `data/`.

## Constraints

- Strict TDD: enabled (source: user global `CLAUDE.md`). Vertical slices, observed RED first;
  a reverted mutation where an assertion has no natural RED.
- Test runner: Vitest through pnpm. Full: `pnpm test` (baseline 18 files, 569 tests).
- A local GGA pre-commit hook reviews staged `*.ts` against `AGENTS.md`. Never bypass it
  (`--no-verify` is forbidden). Stage explicit paths only; `.gga` stays untracked.
- Conventional commits, one work unit per commit, no AI attribution trailers.
- Delivery strategy: `ask-on-risk`. Forecast: about 350 authored changed lines, one PR to `main`.
- Receipt-driven development is on globally; the review candidate is the PR slice,
  `--base-ref origin/main --committed-only`.

## Tasks

Route for T1-T11: delegated, one writer (trigger: 2+ non-trivial files).

Errors and messages:
- [ ] T1 `yaml.ts`: replace the three `(cause as Error).message` casts with the narrowing `errorMessage` helper; move that helper to a shared place (`errors.ts`) so `cli/io.ts` and `yaml.ts` use one. RED: a thrown non-`Error` value must not print `undefined`.
- [ ] T2 A YAML parse failure prints a multi-line message (the parser's code frame), breaking the one-line `<file>:<field>: <message>` format. Keep the first line. RED: the CLI output for malformed YAML has one line per error.
- [ ] T3 `checkThresholds`: a last entry with no `max` key gets the schema's required-property error plus a redundant `got undefined`. Skip the code check for an entry the schema already rejected, or narrow the message. RED-first fixture.
- [ ] T4 `EXIT_USAGE` is returned for bad arguments, failed output writes, and unexpected throws; rename or split the constant so `return EXIT_USAGE` after a failed write is not misleading. The exit code `2` stays. Also share the `"<document>"` sentinel between `instancePathToField` and the `additionalProperties` branch as one constant.

Entry files and `runEntry`:
- [ ] T5 Rename `src/cli/validate.ts` and `src/cli/build.ts` (for example `validate-command.ts`, `build-command.ts`) so the old module paths no longer exist; update imports. RED: spawning the old path must fail (module not found), not exit `0`.
- [ ] T6 `runEntry`: add a trailing `.catch` that reports the error and sets `process.exitCode = 2`. RED: a `run` whose streams throw while reporting must still end with exit code `2`, not an unhandled rejection.
- [ ] T7 `entry-symlink.test.ts`: assert `result.error` is undefined before the status check; add one success-path case per entry that distinguishes the two cores (for example `build` prints a 64-hex hash, `validate` prints nothing), so a swapped core fails.

Atomic write:
- [ ] T8 `writeFileAtomic`: write through a file descriptor and `fsyncSync` before the rename, or state the crash boundary in the doc comment. Choose the `fsync` unless it needs a second seam; then document.
- [ ] T9 Test the cleanup-failure path: an injected `rmSync` that throws next to a failing write yields exit `2` and the original write error on stderr.

Tests and CI:
- [ ] T10 Add CLI tests for malformed YAML (exit `1` on both CLIs); make the unknown-field test assert the exact field for a top-level and a nested key; move the duplicated stream-capture, temp-dir, and fixture helpers from `build.test.ts` and `validate.test.ts` into one shared test helper; use or delete the unused `alias-bomb` fixture.
- [ ] T11 `.github/workflows/ci.yml`: `timeout-minutes` on the job (the job takes about 20 s). `AGENTS.md`: align the `child_process` wording with the scan (`packages/data/src`, spawn tests under `test/` excepted).
- [ ] T12 Verify: `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` with the hash unchanged (`be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`); `rg "as Error" packages/data/src` empty; every CLI data-error line single-line.
- [ ] T13 (housekeeping, parent) `odd/tasks/issue-34-atomic-bundle-write.md`: record that PR #38 merged (`d200093`) and #34 closed.

## Acceptance criteria

From the issue: no `as Error` cast under `packages/data/src`; every CLI data-error line is
single-line, including a YAML parse failure; CLI tests pin exit `1` for malformed YAML; the CI
job declares `timeout-minutes`; `pnpm validate && pnpm test && pnpm build` pass and the hash
does not change. Plus, from the comment: the old module paths fail loudly; `runEntry` never
ends in an unhandled rejection; the spawn tests distinguish the two entries.

## Progress

- 2026-09-22: document created on branch `refactor/35-hardening` from `main` (`d200093`).

## Next step

T1-T11, delegated to one writer.
