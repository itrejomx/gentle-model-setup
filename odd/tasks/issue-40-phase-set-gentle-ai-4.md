# Issue #40: rescope the canonical Phase set to the Gentle AI 4.0 roster

Locator: `odd/tasks/issue-40-phase-set-gentle-ai-4.md`
Engram mirror: topic `odd/issue-40-phase-set-gentle-ai-4/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/40

## Objective

The data contract models the 13 Phases Gentle AI 4.0 ships, the four Runtime Mappings match
the 4.0 installs, and every test, glossary entry, and spec says so.

## Problem and why

Gentle AI v4.0.0 (2026-10-01) retired SDD. 14 of the repo's 27 Phases are `sdd-*` and no longer
exist; the runtime files were read from pre-4.0 installs. The engine (#3) must not resolve
models for agents nobody runs. Maintainer decision 2026-10-06: keep the project, rescope to the
13 non-`sdd` ids already in `phases.yaml`; union across runtimes stays; OpenCode's `gentleman`
primary agent is not a Phase (no model of its own).

## Scope

In: `data/phases/phases.yaml`, `data/schemas/phases.schema.json`, the four `data/runtimes/*.yaml`,
the tests that pin them, `CONTEXT.md`, `docs/prd/2026-09-14-model-profile-site.md`,
`docs/superpowers/specs/2026-09-14-model-profile-site-design.md`,
`openspec/specs/canonical-phases/spec.md`, `openspec/specs/runtime-mappings/spec.md`.
Out: `openspec/changes/archive/**` (history), `data/models/**`, `data/subscriptions/**`,
`packages/data/src/**` (reads phases from data; no change expected), issues #3 and #8 (parent
rewrites them after this lands, with the maintainer's go-ahead).

## Constraints

- Test-first: observed RED before each behavior change; a reverted mutation where no natural RED
  exists. Runner: Vitest through pnpm (`export PATH=/opt/homebrew/bin:$PATH` first in zsh).
- Runtime facts come from the installs on this machine, read-only: `~/.claude/agents/*.md` (only
  the eight files dated 2026-10-04; the `sdd-*.md` files are preserved leftovers),
  `~/.config/opencode/opencode.json` `agent` keys without a tier suffix and without `sdd-`,
  `~/.pi/agent/agents/*.md` (10). Codex (`~/.codex/agents/*.toml`) predates 4.0 (2026-07-20):
  drop its `sdd-*` entries, keep the rest, and state in the file header that it awaits a
  `gentle-ai sync` for Codex. Never run `gentle-ai sync`, `install`, or any mutating command.
- `prefixMap` keys must stay known Subscription prefixes (`opencode-go`; `openai` is the documented
  example exception). Pi's live profiles also use `mistral`; do not add it until a Mistral
  Subscription file exists (#6). Record it in the Pi header as a pending prefix.
- Weights and `callPattern` of the 13 kept rows do not change.
- A local GGA pre-commit hook reviews staged `*.ts` against `AGENTS.md`; never bypass it. Stage
  explicit paths only; `.gga` stays untracked. Conventional commits, no AI attribution.
- Delivery: forecast about 700 changed lines (mostly deletions and doc edits). Strategy
  `ask-on-risk` with the chain strategy cached from #2, `stacked-to-main`: slice A (data, schema,
  tests) and slice B (docs and specs) as two PRs, B stacked on A.
- Receipt-driven development is on; the review candidate is each PR slice,
  `--base-ref <base> --committed-only`.

## Tasks

Slice A (branch `feat/40-phase-set-gentle-ai-4`), route: delegated, one writer.
- [x] T1 RED: `phases.test.ts` asserts exactly the 13 ids, count 13, groups `orchestration`, `judgment-day`, `review`, `workers`, and the roles listed in the issue; observe the failure against the 27-row file. GREEN: remove the 14 `sdd-*` rows from `phases.yaml`; update its header comments (count, source: Gentle AI 4.0 roster, decision date).
- [x] T2 RED: a fixture with `group: sdd` must be rejected by `validatePhases`. GREEN: drop `sdd` from the `group` enum in `phases.schema.json`.
- [x] T3 RED: `runtime-mappings.test.ts` asserts Pi 10, OpenCode 13, Claude Code 8, Codex `<n>` (the count after dropping `sdd-*`), and that no `agentMap` value is an `sdd-*` id. GREEN: rewrite the four runtime files from the installs; Pi drops the `sdd-proposal` alias; Codex header states the pending sync; the OpenCode comment explains why `gentleman` is excluded.
- [x] T4 `load-data.test.ts` and any other test pinning 27 or the old per-runtime counts follow (`rg -n "\b27\b|\b24\b|\b21\b|\b19\b|\b17\b" packages/data/test`).
- [x] T5b (slice A review) `runtime-mappings.test.ts`: assert that the union of all `agentMap` values equals the set of Phase ids in `phases.yaml`, RED-first by a reverted mutation (drop a Phase's last mapping). Lands with slice B.
- [x] T5 Verify: `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` and record the NEW bundle hash (it changes: the payload changed); `rg -n "sdd-" data packages/data/test` returns only intentional negative fixtures, if any.

Slice B (branch `docs/40-phase-set-docs` from slice A), route: delegated, one writer.
- [x] T6 `CONTEXT.md`: Profile = thirteen phase-to-model assignments; Phase = one of the 13 canonical Gentle AI agents (ODD roster); no SDD wording.
- [x] T7 PRD and design spec: Phase list, counts, section 3.2 table, runtime counts; SDD references become ODD or are removed; keep the documents' structure.
- [x] T8 `openspec/specs/canonical-phases/spec.md` and `runtime-mappings/spec.md`: requirements and scenarios for 13 Phases, four groups, the new counts, the Codex pending note.
- [x] T9 Verify: `rg -n "sdd-|27 canonical|fourteen" CONTEXT.md docs openspec/specs` returns nothing load-bearing; `pnpm test` unchanged.

Parent, after both slices land:
- [ ] T10 Rewrite issues #3 and #8 against the 13-row Profile and `gentle-ai-worker` as the implementer (maintainer go-ahead per issue).

## Acceptance criteria

From #40: exactly the 13 Phases; a `group: sdd` row fails validation; runtime files match the
4.0 installs with Codex marked pending; `pnpm validate && pnpm test && pnpm build` pass and the
new hash is recorded; glossary, PRD, design spec, and main specs state 13 Phases; no `sdd-*` id
outside `openspec/changes/archive/`.

## Rationale for accepted judgment calls

- One commit for T1-T4: Phases and Runtime Mappings are one contract under the integrity check.
- Rosters recorded from the installs on 2026-10-06: Claude Code the eight agent files dated 2026-10-04 (the `sdd-*.md` leftovers were not mapped); OpenCode the 14 base keys minus `gentleman`; Pi the 10 agent files dated 2026-10-04, `sdd-proposal` alias gone; Codex the seven non-`sdd` entries of an install dated 2026-07-20, header marked pending a `gentle-ai sync`.
- Test fixtures that use `sdd-*` strings as arbitrary ids were left alone: renaming them touches `validate.test.ts` and the override fixtures for no behavioral gain. Cosmetic follow-up at most.
- The T2 schema test lives in `phases.test.ts` (inline document) rather than `validate.test.ts`.

## Progress

- 2026-10-06: document created on branch `feat/40-phase-set-gentle-ai-4` from `main` (`d9c25ca`).
- 2026-10-06: slice A (T1-T5) implemented by one delegated writer in one commit, `0799aa5` (`feat(data)!`): the cross-file integrity check rejects an `agentMap` value that is not a Phase id, so the Phase removal and the runtime rewrite cannot be green apart. Observed RED: T1 `expected 27 to be 13` with the 14 `sdd-*` ids as the list diff; T2 `expected false to be true` for a `group: sdd` row; T3 the four counts (`24→10`, `21→13`, `19→8`, `17→7`), the no-`sdd-` assertion on all four runtimes, and 46 cross-file integrity errors; T4 `load-data` 27→13. The new role assertions for `gentle-ai-explore` and the review lenses pin behavior that already held; no mutation was run for them. Observed GREEN: phases 95/95; `pnpm -r typecheck` clean; `pnpm validate` exit 0; `pnpm test` 20 files, 507/507 (583 before: the per-Phase cases shrank with the roster); new bundle hash `13f9e5a9cc0931e887ccc180f949515077ad2e9068b939dea1654f059e5d8b8b`.
- 2026-10-06: parent gate. Reflog clean; `.gga` untracked; 14 files vs `main`, all inside the slice except `packages/data/test/fixtures/valid/phases/phases.yaml`, where the writer changed two `group: sdd` rows to `group: workers` because the retired enum value broke the valid fixture. Accepted: minimal, reported, and the only way to keep `validate.test.ts` green. Re-run by the parent: counts 13 / Pi 10 / OpenCode 13 / Claude Code 8 / Codex 7; typecheck clean; validate exit 0; 507/507; hash `13f9e5a9...`. Remaining `sdd` hits are intentional: file headers that explain the retirement, the negative assertion, test fixtures that use `sdd-*` strings as arbitrary ids, and model-file citations of the source document `perfiles-sdd-opencode-go-only-v2.2.md`.
- 2026-10-06: slice A native review (assessed `medium`: configuration change in `phases.yaml`) granted by the maintainer, reliability lens, approved and acknowledged (lineage `review-b1c2e654404dd9fb`, authority burned). One informational finding, `R3-union-coverage-unpinned`: no test asserts that the union of the four `agentMap` value sets equals the canonical Phase set, so a runtime edit that dropped the last mapping of a Phase would stay green. The parent confirmed no such assertion exists (only a comment in `phases.test.ts:10` states the rule). Folded as T5b for slice B's branch, since the current candidate is frozen.
- 2026-10-06: slice A pushed; PR #41 opened against `main` (`Refs #40`, 14 files, 227 insertions, 319 deletions); CI job `validate-and-test` passed (run 37538348917). Slice B branch `docs/40-phase-set-docs` created from slice A.
- 2026-10-06: slice B (T5b, T6-T9) implemented by one delegated writer, commits `237bdfb` (union test) and `4f25479` (docs). T5b RED by a reverted mutation: with `review-validator` removed from `opencode.yaml` (its only mapper) the new union test failed `expected [...11 ids] to deeply equal [...12]` and the OpenCode count test failed `expected 12 to be 13`; the data file was restored (`git diff data/` empty) and 29/29 passed. Docs: `CONTEXT.md` Profile = thirteen assignments, Phase = one of the 13 canonical agents (ODD roster); design spec section 3.2 has 13 rows in four groups plus the runtime counts, and the Independence invariant anchors on `gentle-ai-verify` and the `gentle-ai-worker` primary; PRD problem statement, story 12, Phases and Independence bullets, runtime counts; `canonical-phases/spec.md` and `runtime-mappings/spec.md` rewritten with the exact ids, the four groups, the `group: sdd` rejection, the no-`sdd-` scenario, the counts, the OpenCode-maps-all-13 fact, the `gentleman` exclusion, the Codex pending note, and the union rule. The design spec's exporter bullet dropped the old `sdd-{phase}-{profile}` OpenCode naming instead of inventing a 4.0 shape (the exporter issue, #13, settles it).
- 2026-10-06: parent gate. Reflog clean; six files, all inside the surface; `data/` and `openspec/changes/` untouched; glossary read back; the only remaining `sdd-` mention outside negative scenarios is itself a negative scenario (`runtime-mappings/spec.md:80`). Re-run by the parent: `pnpm test` 20 files, 508/508; hash `13f9e5a9...` unchanged.
- 2026-10-06: slice B native review (assessed `medium`: `canonical-phases/spec.md` classed as an executable change) granted by the maintainer, reliability lens, approved and acknowledged (lineage `review-1e2738942ab1f152`, authority burned). Two informational findings. `R3-sdd-key-check-unproved`: refuted by the parent, `runtime-mappings.test.ts:133` builds the list from both `Object.keys` and `Object.values`, so keys are covered. `R3-codex-header-unasserted`: true, the Codex pending-sync header is a MUST in `runtime-mappings/spec.md:57-62` with no test on the raw file; it is a temporary note that disappears once Codex is re-read, so the spec wording is left as is and the gap is accepted.
- 2026-10-06: slice B pushed; PR #42 opened against `feat/40-phase-set-gentle-ai-4` (`Refs #40`, 7 files, 146 insertions, 65 deletions); CI job `validate-and-test` passed (run 37539464630).

## Next step

Maintainer merges #41, then #42 (retarget to `main` first). T10: rewrite issues #3 and #8 against the 13-row Profile and `gentle-ai-worker` as the implementer, one issue at a time, with the maintainer's go-ahead on each draft.
