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

- [ ] T1 (route: delegated, one writer; trigger: 2+ non-trivial files) RED: with an existing good output file, a write that fails partway leaves the original file byte-identical, exits `2` with `error: cannot write ...`, and leaves no temporary file in the output directory. Observed failing against the in-place write.
- [ ] T2 GREEN: temporary sibling file, then rename over the final path; cleanup on failure.
- [ ] T3 A failed rename (for example the final path is an existing directory) also exits `2`, leaves no temporary file, and keeps the existing write-failure test passing.
- [ ] T4 The build success test loads the written file back through `loadBundle` and compares its hash with stdout.
- [ ] T5 Verify: focused `cli` and `bundle` runs; `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` with the bundle hash unchanged (`be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`) and no temporary file left in `packages/data/build/`.
- [ ] T6 (housekeeping, parent) `odd/tasks/issue-33-cli-entrypoints.md`: record that PR #37 merged (`3c07a07`) and #33 closed.

## Acceptance criteria

From the issue: a test starts with an existing good output file, forces the write to fail, and
finds the original byte-identical afterwards, with exit `2` and no temporary file left behind,
observed failing first; the build success test reads the output back with `loadBundle`; the
bundle hash for the committed `data/` does not change.

## Progress

- 2026-09-21: document created on branch `feat/34-atomic-bundle-write` from `main` (`3c07a07`).

## Next step

T1, delegated to one writer.
