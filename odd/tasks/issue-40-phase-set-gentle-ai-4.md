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
- [ ] T1 RED: `phases.test.ts` asserts exactly the 13 ids, count 13, groups `orchestration`, `judgment-day`, `review`, `workers`, and the roles listed in the issue; observe the failure against the 27-row file. GREEN: remove the 14 `sdd-*` rows from `phases.yaml`; update its header comments (count, source: Gentle AI 4.0 roster, decision date).
- [ ] T2 RED: a fixture with `group: sdd` must be rejected by `validatePhases`. GREEN: drop `sdd` from the `group` enum in `phases.schema.json`.
- [ ] T3 RED: `runtime-mappings.test.ts` asserts Pi 10, OpenCode 13, Claude Code 8, Codex `<n>` (the count after dropping `sdd-*`), and that no `agentMap` value is an `sdd-*` id. GREEN: rewrite the four runtime files from the installs; Pi drops the `sdd-proposal` alias; Codex header states the pending sync; the OpenCode comment explains why `gentleman` is excluded.
- [ ] T4 `load-data.test.ts` and any other test pinning 27 or the old per-runtime counts follow (`rg -n "\b27\b|\b24\b|\b21\b|\b19\b|\b17\b" packages/data/test`).
- [ ] T5 Verify: `pnpm -r typecheck`; `pnpm validate`; `pnpm test`; `pnpm build` and record the NEW bundle hash (it changes: the payload changed); `rg -n "sdd-" data packages/data/test` returns only intentional negative fixtures, if any.

Slice B (branch `docs/40-phase-set-docs` from slice A), route: delegated, one writer.
- [ ] T6 `CONTEXT.md`: Profile = thirteen phase-to-model assignments; Phase = one of the 13 canonical Gentle AI agents (ODD roster); no SDD wording.
- [ ] T7 PRD and design spec: Phase list, counts, section 3.2 table, runtime counts; SDD references become ODD or are removed; keep the documents' structure.
- [ ] T8 `openspec/specs/canonical-phases/spec.md` and `runtime-mappings/spec.md`: requirements and scenarios for 13 Phases, four groups, the new counts, the Codex pending note.
- [ ] T9 Verify: `rg -n "sdd-|27 canonical|fourteen" CONTEXT.md docs openspec/specs` returns nothing load-bearing; `pnpm test` unchanged.

Parent, after both slices land:
- [ ] T10 Rewrite issues #3 and #8 against the 13-row Profile and `gentle-ai-worker` as the implementer (maintainer go-ahead per issue).

## Acceptance criteria

From #40: exactly the 13 Phases; a `group: sdd` row fails validation; runtime files match the
4.0 installs with Codex marked pending; `pnpm validate && pnpm test && pnpm build` pass and the
new hash is recorded; glossary, PRD, design spec, and main specs state 13 Phases; no `sdd-*` id
outside `openspec/changes/archive/`.

## Progress

- 2026-10-06: document created on branch `feat/40-phase-set-gentle-ai-4` from `main` (`d9c25ca`).

## Next step

Slice A, T1-T5, delegated to one writer.
