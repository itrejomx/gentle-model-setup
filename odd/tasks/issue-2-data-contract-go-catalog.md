# Issue #2: data contract and OpenCode Go catalog (slices 7-10)

Locator: `odd/tasks/issue-2-data-contract-go-catalog.md`
Engram mirror: topic `odd/issue-2-data-contract-go-catalog/tasks`
Issue: https://github.com/itrejomx/gentle-model-setup/issues/2 (PRD #1, build step 1)

## Objective

Finish issue #2: complete the 29-model OpenCode Go catalog, the canonical phases, the four
runtime mappings, and the content-hashed bundle with its CLIs and CI workflow.

## Problem and why

The engine (#3), the site, and the checker all need a validated YAML contract and a
content-hashed bundle before they can be built. Slices 1-6 delivered the workspace, the
schemas, the loader, the Go subscription file, and 19 of 29 catalog models. Slices 7-10 remain.

## Route

Slices 1-6 ran under SDD as change `scaffold-data-contract-go-catalog`. On 2026-09-16 the
maintainer moved slices 7-10 to Organic Driven Development. The SDD change is frozen:
its `proposal.md`, `specs/`, `design.md`, and `tasks.md` are read-only reference for
requirements and design decisions, and its `tasks.md` / `apply-progress.md` are no longer
updated. Progress lives in this document. `sdd-archive` runs once, after slice 10, so
`openspec/specs/` never documents a capability that does not exist yet.

## Scope

In: tasks T7.1-T10.8 below, plus the folded advisory items and housekeeping listed with them.
Out: engine (#3), other subscription catalogs (#4-#7), site, checker, deploy.

## Constraints

- Strict TDD: enabled (source: user global `CLAUDE.md`, "Strict TDD Mode: enabled"; also
  `strict_tdd: true` in the frozen SDD state). Observed RED before GREEN, then REFACTOR.
- Test runner: Vitest through pnpm. Focused run:
  `pnpm --filter @gentle-ai/profile-data exec vitest run <pattern>`. Full: `pnpm test`.
- Delivery: stacked-to-main PR chain, one PR per slice, base = previous slice branch.
  Chain so far: #17 <- #18 <- #19 <- #20 <- #21 <- #22 <- #23 <- #24.
- Receipt-driven development is on globally; native review runs per slice candidate with
  per-candidate consent (`--base-ref <previous branch> --committed-only`).
- Conventional commits, no AI attribution trailers. Commits split as test / data or code / docs.
- About 400 authored changed lines per slice is a planning heuristic only, never a gate.
- Catalog slices re-fetch https://opencode.ai/docs/go (`curl -sL`) before authoring rows.

## Tasks

### Slice 7 — catalog minimax/xiaomi/tencent/meituan/meta (branch `feat/2-catalog-minimax-xiaomi-tencent-meituan-meta`)

- [x] T7.1 Re-fetch https://opencode.ai/docs/go; confirm current caps and status for these 10 models; total catalog reaches 29.
- [x] T7.2 RED: extend `packages/data/test/catalog.test.ts` asserting exactly 29 files total, 19 `current` / 6 `legacy` / 4 `experimental`; `minimax-m2.5` has no numeric `requestsPer5h` on any plan and therefore cannot be `current` (code check); `muse-spark-1.2-contributor` and `muse-spark-1.3-contributor` declare `trainsOnData: true` and `logRetentionDays: null`.
- [x] T7.3 GREEN: create `minimax-m3.yaml` (minimax, `current`), `minimax-m2.7.yaml` and `minimax-m2.5.yaml` (minimax, `legacy`); `mimo-v2.5.yaml` and `mimo-v2.5-pro.yaml` (xiaomi, `current`); `hy3.yaml` (tencent, `current`) and `hy4-preview.yaml` (tencent, `experimental`); `longcat-2.0.yaml` (meituan, `current`); `muse-spark-1.2-contributor.yaml` and `muse-spark-1.3-contributor.yaml` (meta, `experimental`, `logRetentionDays: null`).
- [x] T7.4 Verify: focused catalog run asserts 29/29 files, 19 current / 6 legacy / 4 experimental.
- [x] T7.5 (WU6 advisory) Strengthen the promo-invariance test so it cannot pass vacuously.
- [x] T7.6 (housekeeping) Fix the `grok-4.5.yaml` header comment so it matches the 30-day retention value (WU5 advisory).

### Slice 8 — canonical phases (branch `feat/2-canonical-phases`)

- [ ] T8.1 RED: `packages/data/test/phases.test.ts` globbing `data/phases/phases.yaml` asserting exactly 27 rows, ids match the canonical list, every row has `callPattern`, `weights` summing > 0, and `role`.
- [ ] T8.2 GREEN: create `data/phases/phases.yaml` with 27 rows (`group`, `callPattern`, `role`, six-axis `weights`). Per-phase weights have no source document; propose them with a one-line rationale comment per phase, to be revisited when `packages/engine` consumes them (#3).
- [ ] T8.3 (WU3 advisory) Assert phase-id uniqueness in code or test; the schema cannot reject duplicates.
- [ ] T8.4 Verify: focused `phases` run.
- [ ] T8.5 (slice 7 advisory, time-sensitive: the only live promo ends 2026-09-20) Decouple the promo-invariance test in `packages/data/test/catalog.test.ts` from live data: prove the invariant with a synthetic promo-bearing fixture so the test keeps passing once no catalog model carries a multiplier.
- [ ] T8.6 (slice 7 advisory) Fixture test calling `validateModel` directly for `checkCurrentRequiresCap`: a `current` model with several plans, some caps `null` and one numeric, is accepted; the all-null rejection asserts the message and the file, not only the `status` field.

### Slice 9 — runtime mappings

- [ ] T9.1 Read live installs (read-only) at `~/.pi/agent/agents/`, `~/.config/opencode/opencode.json`, `~/.claude/agents/`, `~/.codex/agents/` to fill each `agentMap`.
- [ ] T9.2 RED: `packages/data/test/runtime-mappings.test.ts` asserting `agentMap` entry counts Pi 24, OpenCode 20, Claude Code 19, Codex 17; every `agentMap` value resolves to a phase id in `phases.yaml`; every `prefixMap` key is a known provider prefix.
- [ ] T9.3 GREEN: create `data/runtimes/pi.yaml` (24 entries; `sdd-proposal` is the Pi phase mapped to canonical `sdd-propose`; `prefixMap` maps `openai` to `openai-codex`), `data/runtimes/opencode.yaml` (20), `data/runtimes/claude-code.yaml` (19), `data/runtimes/codex.yaml` (17).
- [ ] T9.4 Verify: focused `runtime-mappings` run.

### Slice 10 — bundle, CLI, CI

- [ ] T10.1 RED: `packages/data/test/canonical.property.test.ts` (fast-check over a generated dataset): shuffling object key order and array order yields an identical hash; changing any scalar changes it.
- [ ] T10.2 GREEN: implement `packages/data/src/canonical.ts` (`canonicalJson`) and `packages/data/src/bundle.ts` (`hashPayload`, `buildBundle` injecting derived `budgetClass`).
- [ ] T10.3 RED: `packages/data/test/bundle.integration.test.ts` (temp dir): `buildBundle` -> write -> `loadBundle` round-trips; a tampered payload byte throws `BundleHashMismatchError`.
- [ ] T10.4 GREEN: implement `loadBundle` in `bundle.ts`.
- [ ] T10.5 RED (threat matrix, CLI argument composition): a path argument containing a space and a `;` is validated as that literal directory or exits 2, never executed; assert no `child_process` import in `packages/data`.
- [ ] T10.6 GREEN: create `packages/data/src/cli/validate.ts` (one positional path arg, no shell interpolation, exit 0/1/2 per design) and `packages/data/src/cli/build.ts`; wire root `package.json` scripts.
- [ ] T10.7 Create `.github/workflows/ci.yml` (threat matrix, CI workflow trust): `on: pull_request` only, `permissions: { contents: read }`, `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `pnpm install --frozen-lockfile`, `pnpm validate`, `pnpm test`, `pnpm build`.
- [ ] T10.8 (WU2 advisory) Error surfaces: Ajv `additionalProperties` errors name the offending field; review the remaining WU2 findings in Engram topic `sdd/scaffold-data-contract-go-catalog/advisory-findings-*` and fold what fits.
- [ ] T10.9 Verify: focused `bundle` run; then `pnpm validate && pnpm test && pnpm build`; the workflow run on this slice's own PR is green.

### Close-out

- [ ] TC.1 Docs fix: `docs/superpowers/specs/2026-09-14-model-profile-site-design.md` line 87 thresholds vs the proposal.
- [ ] TC.2 Run `sdd-archive` for `scaffold-data-contract-go-catalog` with final-state facts (requires explicit maintainer go-ahead).

## Acceptance criteria

- `pnpm validate && pnpm test && pnpm build` pass on the slice 10 branch.
- 29 catalog files: 19 current / 6 legacy / 4 experimental.
- `phases.yaml` has 27 unique phase ids; runtime maps count Pi 24, OpenCode 20, Claude Code 19, Codex 17.
- Bundle hash is order-invariant and tamper-evident; CI workflow green on its own PR.

## Per-slice checks

`pnpm -r typecheck`, `pnpm test`, diff stat against the previous slice branch, then native
review at the slice boundary, push, `gh pr create --base <previous branch>`.

## Progress

- 2026-09-16: document created; slices 1-6 already delivered under SDD (PRs #17-#23, all open, all review-approved).
- 2026-09-16: slice 7 implemented (T7.1-T7.6), commits `5823504..92d782f`. Observed RED: focused catalog run, 95 failed / 172 passed, all `YamlLoadError ... ENOENT` for the 10 new ids. Observed GREEN: focused catalog run 267/267; `pnpm -r typecheck` exit 0; `pnpm test` 300/300 (re-run by the parent); 29 files, 19 current / 6 legacy / 4 experimental. T7.5 had no reachable RED of its own: the invariant already held in committed data, so no data was corrupted to force one. Native review and PR for this slice: pending.
- 2026-09-17: slice 7 native review approved and acknowledged (lineage `review-c8dc7c69d1c641ee`, reliability lens); two informational findings folded as T8.5 and T8.6. Pushed; PR #24 opened against `feat/2-catalog-alibaba-deepseek`.

## Rationale for accepted judgment calls (slice 7)

- `minimax-m2.5`: absent from the live model list, caps table, and training/retention table (present only in pricing and endpoint tables). Caps and `logRetentionDays` recorded as `null`; `trainsOnData: false` is inferred from its MiniMax siblings, not published. Open for maintainer confirmation.
- `hy3`: the 2026-08-19 source described an 8x promo; the live page fetched 2026-09-16 shows no promo annotation, so the file carries the flat 4,300 cap with no multiplier.
- New code check `checkCurrentRequiresCap` in `packages/data/src/validate.ts`: the schema types `requestsPer5h` as `number|null`, so it cannot reject a `current` model with no numeric cap.

## Next step

Slice 8, T8.1.
