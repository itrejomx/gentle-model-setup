# Issue #34: write the bundle atomically and round-trip it in the build test

Locator: `odd/tasks/issue-34-atomic-bundle-write.md`
Engram mirror: topic `odd/issue-34-atomic-bundle-write/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/34

## Objective

A failed `pnpm build` leaves the previous bundle untouched, and the build test proves the file
on disk is a loadable bundle.

## Problem and why

`runBuildCli` (`packages/data/src/cli/build.ts`) writes the bundle in place with
`writeFileSync(outputPath, ...)`. A write that fails partway (disk full, I/O error) exits `2`
but can leave a truncated `data.json` where the last good bundle was; a consumer that reads it
later gets corrupt JSON. The build success test compares the hash inside the written file with
the hash printed on stdout; both come from the same in-memory object, so it proves consistency,
not that the file is a loadable bundle.

## Scope

In: write to a temporary sibling file in the output directory, rename it over the final path,
remove the temporary file when the write fails; tests for the failure path and a `loadBundle`
round trip in the success test.
Out: #35 (hardening list, including the review themes of #37). No new flag, config, exit code,
or error type. The bundle bytes and hash do not change.

## Constraints

- Strict TDD: enabled (source: user global `CLAUDE.md`). Vertical slices, observed RED first.
- Test runner: Vitest through pnpm. Focused run:
  `pnpm --filter @gentle-ai/profile-data exec vitest run <pattern>`. Full: `pnpm test`.
- A partial write cannot be forced through the real filesystem deterministically. A fake is
  acceptable only at the system boundary (the `fs` operations the writer uses), injected
  through a parameter; no mocking of internal collaborators, no module mocking.
- `AGENTS.md`: determinism rules apply to the bundle hash, not to a temporary file name; no
  `child_process` under `packages/data/src`.
- A local GGA pre-commit hook reviews staged `*.ts` against `AGENTS.md`. Never bypass it
  (`--no-verify` is forbidden). Stage explicit paths only; `.gga` stays untracked.
- Conventional commits, no AI attribution trailers.
- Delivery strategy: `ask-on-risk`. Forecast: about 200 authored changed lines, one PR to `main`.
- Receipt-driven development is on globally; the review candidate is the PR slice,
  `--base-ref origin/main --committed-only`.

## Tasks

- [x] T1 (route: delegated, one writer; trigger: 2+ non-trivial files) RED: with an existing good output file, a write that fails partway leaves the original file byte-identical, exits `2` with `error: cannot write ...`, and leaves no temporary file in the output directory. Observed failing against the in-place write.
- [x] T2 GREEN: temporary sibling file, then rename over the final path; cleanup on failure.
- [x] T3 A failed rename (for example the final path is an existing directory) also exits `2`, leaves no temporary file, and keeps the existing write-failure test passing.
- [x] T4 The build success test loads the written file back through `loadBundle` and compares its hash with stdout.
- [x] T5 Verify: focused `cli` and `bundle` runs; `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` with the bundle hash unchanged (`be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`) and no temporary file left in `packages/data/build/`.
- [x] T6 (housekeeping, parent) `odd/tasks/issue-33-cli-entrypoints.md`: record that PR #37 merged (`3c07a07`) and #33 closed.

## Acceptance criteria

From the issue: a test starts with an existing good output file, forces the write to fail, and
finds the original byte-identical afterwards, with exit `2` and no temporary file left behind,
observed failing first; the build success test reads the output back with `loadBundle`; the
bundle hash for the committed `data/` does not change.

## Rationale for accepted judgment calls

- New module `packages/data/src/cli/atomic-write.ts`: `writeFileAtomic(path, content, ops?)` and the `AtomicWriteOps` type (`writeFileSync`, `renameSync`, `rmSync`), defaulting to `node:fs`. `runBuildCli` takes the same optional `ops` as a third parameter and passes it through; `bin/build.ts` is unchanged. `mkdirSync` for the output directory stays in `build.ts`: it is not part of the write/rename seam.
- Temporary name: `.<basename>.<pid>.<uuid>.tmp` in the output file's own directory, so the rename stays on one filesystem and concurrent builds of the same output never collide. It is never part of the bundle, so the hash determinism rules do not apply to it.
- Cleanup uses `rmSync(tempPath, { force: true })` inside its own `try`/`catch`: a cleanup failure never replaces the write or rename error the caller reports.
- The existing "output path is an existing directory" test now exercises a real rename failure.

## Progress

- 2026-09-21: document created on branch `feat/34-atomic-bundle-write` from `main` (`3c07a07`).
- 2026-09-21: T1-T5 implemented by one delegated writer, commits `0043e94` (atomic write + failure tests) and `12a74e4` (round trip). The injection seam went in first as a refactor with the in-place write kept and every existing test green. Observed RED for T1: with an existing `{"hash":"existing-good-bundle"}` output and a write op that writes half the content and throws, the in-place implementation failed `expected '{\n  "hash": "5a96a282...' to be '{"hash":"existing-good-bundle"}'`: the original had been overwritten. GREEN with temp sibling + rename + cleanup. T3 (failed rename) and T4 (round trip) had no natural RED and were proven by reverted mutations: with the cleanup call disabled both failure tests found a leftover `.data.json.<pid>.<uuid>.tmp`; with the written hash corrupted the round trip failed with `BundleHashMismatchError`.
- 2026-09-21: parent gate. Reflog clean; diff vs `main` is `packages/data/src/cli/atomic-write.ts`, `src/cli/build.ts`, `test/cli/build.test.ts`, and this document; `.gga` untracked. Re-run by the parent: `pnpm -r typecheck` clean; `pnpm validate` exit 0; `pnpm test` 18 files, 569/569; `pnpm build` hash `be3e880d...` unchanged, and `packages/data/build/` holds only `data.json`; no `child_process` under `packages/data/src`.
- 2026-09-21: T6 done in this commit.

## Next step

Native review assessment for the PR slice (`--base-ref origin/main --committed-only`), then on the maintainer's go-ahead push and open the PR against `main` with `Closes #34`.
