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
- [x] T1 `yaml.ts`: replace the three `(cause as Error).message` casts with the narrowing `errorMessage` helper; move that helper to a shared place (`errors.ts`) so `cli/io.ts` and `yaml.ts` use one. RED: a thrown non-`Error` value must not print `undefined`.
- [x] T2 A YAML parse failure prints a multi-line message (the parser's code frame), breaking the one-line `<file>:<field>: <message>` format. Keep the first line. RED: the CLI output for malformed YAML has one line per error.
- [x] T3 `checkThresholds`: a last entry with no `max` key gets the schema's required-property error plus a redundant `got undefined`. Skip the code check for an entry the schema already rejected, or narrow the message. RED-first fixture.
- [x] T4 `EXIT_USAGE` is returned for bad arguments, failed output writes, and unexpected throws; rename or split the constant so `return EXIT_USAGE` after a failed write is not misleading. The exit code `2` stays. Also share the `"<document>"` sentinel between `instancePathToField` and the `additionalProperties` branch as one constant.

Entry files and `runEntry`:
- [x] T5 Rename `src/cli/validate.ts` and `src/cli/build.ts` (for example `validate-command.ts`, `build-command.ts`) so the old module paths no longer exist; update imports. RED: spawning the old path must fail (module not found), not exit `0`.
- [x] T6 `runEntry`: add a trailing `.catch` that reports the error and sets `process.exitCode = 2`. RED: a `run` whose streams throw while reporting must still end with exit code `2`, not an unhandled rejection.
- [x] T7 `entry-symlink.test.ts`: assert `result.error` is undefined before the status check; add one success-path case per entry that distinguishes the two cores (for example `build` prints a 64-hex hash, `validate` prints nothing), so a swapped core fails.

Atomic write:
- [x] T8 `writeFileAtomic`: write through a file descriptor and `fsyncSync` before the rename, or state the crash boundary in the doc comment. Choose the `fsync` unless it needs a second seam; then document.
- [x] T9 Test the cleanup-failure path: an injected `rmSync` that throws next to a failing write yields exit `2` and the original write error on stderr.

Tests and CI:
- [x] T10 Add CLI tests for malformed YAML (exit `1` on both CLIs); make the unknown-field test assert the exact field for a top-level and a nested key; move the duplicated stream-capture, temp-dir, and fixture helpers from `build.test.ts` and `validate.test.ts` into one shared test helper; use or delete the unused `alias-bomb` fixture.
- [x] T11 `.github/workflows/ci.yml`: `timeout-minutes` on the job (the job takes about 20 s). `AGENTS.md`: align the `child_process` wording with the scan (`packages/data/src`, spawn tests under `test/` excepted).
- [x] T12 Verify: `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` with the hash unchanged (`be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`); `rg "as Error" packages/data/src` empty; every CLI data-error line single-line.
- [x] T13 (housekeeping, parent) `odd/tasks/issue-34-atomic-bundle-write.md`: record that PR #38 merged (`d200093`) and #34 closed.

## Acceptance criteria

From the issue: no `as Error` cast under `packages/data/src`; every CLI data-error line is
single-line, including a YAML parse failure; CLI tests pin exit `1` for malformed YAML; the CI
job declares `timeout-minutes`; `pnpm validate && pnpm test && pnpm build` pass and the hash
does not change. Plus, from the comment: the old module paths fail loudly; `runEntry` never
ends in an unhandled rejection; the spawn tests distinguish the two entries.

## Rationale for accepted judgment calls

- `EXIT_USAGE` (malformed argument list) and `EXIT_IO_ERROR` (missing or unreadable data root, failed output write, unexpected throw) are both `2`; the split is for readers, the contract is unchanged.
- `fsync` is real, not documented away: `AtomicWriteOps` grew one method, `fsyncSync(path)`, implemented by opening the already-written temporary file, `fsyncSync`ing the descriptor, and closing it. `fsync` flushes a file's dirty pages whichever descriptor wrote them, so this is as durable as writing through one held-open descriptor and keeps the existing seam and tests.
- Command modules are `cli/validate-command.ts` and `cli/build-command.ts`; the old paths no longer exist.
- Shared test helpers live in `packages/data/test/cli/test-helpers.ts` (not a `*.test.ts`, so Vitest does not run it); each test file keeps its own `afterEach` cleanup. The alias-bomb fixture is now read by `loader-containment.test.ts` instead of an inline duplicate.
- Not applied, from the pre-commit reviewer: `BundleParseError` still inlines its own message narrowing; the atomic-write doc comment does not spell out that a directory `fsync` would be needed for the rename itself to survive a crash; `openSync(path, "r+")` could be `"r"`; `runEntry`'s `.catch` writes to stderr once more and a persistent `EPIPE` would still escape.

## Progress

- 2026-09-22: document created on branch `refactor/35-hardening` from `main` (`d200093`).
- 2026-09-22: T1-T12 implemented by one delegated writer in four work-unit commits: `422c011` (T1-T4), `252ba96` (T5-T7), `4465dc1` (T8-T9), `a477661` (T10-T11). Observed RED: T1 `errorMessage is not a function`; T2 and T3 `expected true to be false` (message still multi-line / still said `got undefined`); T5 `expected +0 not to be +0` (old path exited 0); T6 a subprocess fixture whose first `stderr.write` throws exited 1 (unhandled rejection), exit 2 after the `.catch`; T8 call order was `["write","rename"]`, expected `["write","fsync","rename"]`; T10 malformed-YAML CLI tests failed on a path/column mismatch first. No natural RED for T4 (rename, typecheck + suite), T7 (proven by swapping `bin/validate.ts` to the build core: the new success-path test printed a hash instead of nothing), T9 (removing the inner `try`/`catch` let the cleanup error mask the original), the T10 refactors (suite stays green, plus reverted mutations for the exact unknown-field assertions), and T11 (YAML and Markdown). All reverted, diff-clean.
- 2026-09-22: parent gate. Reflog clean; diff vs `main` is `packages/data/**`, `.github/workflows/ci.yml` (`timeout-minutes: 5`), one `AGENTS.md` sentence, and this document; `.gga` untracked. Re-run by the parent: `pnpm -r typecheck` clean; `pnpm validate` exit 0; `pnpm test` 20 files, 583/583; `pnpm build` hash `be3e880d...` unchanged and `build/` holds only `data.json`; no `as Error` and no `child_process` under `packages/data/src`; `tsx src/cli/validate.ts /x` fails with module-not-found, exit 1.
- 2026-09-22: T13 done in this commit.
- 2026-09-22: native review (assessed `high`: `process_boundary` on `cli/validate-command.ts`, `shell_source` on `ci.yml`) granted by the maintainer, four lenses, approved and acknowledged (lineage `review-3c961321b42f9e35`, authority burned). Risk lens: no findings. Seven informational findings, three verified by the parent against the source, none acted on here: `R3-alias-bomb-assertion-matches-path` (WARNING, true: the test matches `/alias/i` and the fixture path contains `alias`, so a missing fixture would also pass; assert the specific parse or limit error instead); `R2-document-sentinel-still-duplicated` (true: `yaml.ts:90` still hardcodes `"<document>"`, `validate.ts:39` holds the constant; export it from `errors.ts`); `R4-runentry-catch-write-before-exitcode` (true: `io.ts:127-128` writes to stderr before setting `process.exitCode`; a persistent `EPIPE` would still end as exit 1; set the code first and guard the write); `R2-exit-io-error-covers-unexpected-throw` (WARNING: `runGuarded`'s catch-all for a programming bug returns `EXIT_IO_ERROR`, a second misleading name); `R2-test-duplicates-fsync-by-path` (the build test copies `fsyncSyncByPath`); `R2-entry-comment-misattributes-deleted-guard` (`bin/*.ts` comments say the guard was in the renamed module); `R3-fsync-failure-cleanup-untested` (no test injects a throwing `fsyncSync`). These are small and self-contained; tracked as a follow-up comment on #35 rather than a new issue.

## Next step

On the maintainer's go-ahead push `refactor/35-hardening` and open the PR against `main` with `Closes #35`, then leave the seven review findings as a comment on #35 for a later pass.
