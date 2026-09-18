# Archive Report: Scaffold Data Contract and OpenCode Go Catalog

**Change**: `scaffold-data-contract-go-catalog`  
**Archived**: 2026-09-18  
**Repository**: `itrejomx/gentle-model-setup`  
**Issue**: https://github.com/itrejomx/gentle-model-setup/issues/2  

## Final State Summary

**Status**: COMPLETE — All implementation delivered and merged to `main`.

Implementation spanned 12 work units delivered across two routes:
- **SDD phase** (2026-09-01 to 2026-09-16): Work Units 1–6 (slices 1–6) under `scaffold-data-contract-go-catalog`
- **ODD phase** (2026-09-16 to 2026-09-18): Work Units 7–12 (slices 7–12) under `odd/tasks/issue-2-data-contract-go-catalog.md` after maintainer moved remaining work
- **Close-out** (2026-09-18): Docs corrections on `docs/2-close-out`

All 14 PRs merged to `main` in order (#17–#30). Merged commits:
- #17 `518f201` (planning/proposal)
- #18 `610a0b6` (workspace scaffold, WU1)
- #19 `add3b61` (schemas/loader/Budget Class, WU2)
- #20 `f71cf10` (phases/runtime/override, WU3)
- #21 `bb17190` (Go subscription + fixtures, WU4)
- #22 `9cbb318` (catalog moonshot/zhipu/xai/openai, WU5)
- #23 `12d7424` (catalog alibaba/deepseek, WU6)
- #24 `b36d70f` (catalog minimax/xiaomi/tencent/meituan/meta, WU7)
- #25 `642cc9f` (canonical phases, WU8)
- #26 `4433e0c` (runtime mappings, WU9)
- #27 `b496702` (bundle JSON + hash, split WU10)
- #28 `583c25d` (bundle hardening + `loadData`, split WU10+WU11)
- #29 `67817b5` (CLIs, CI workflow, error surfaces, WU12)
- #30 `0782aff` (docs close-out, TC.1/TC.3/TC.4)

## Implementation Progress

### SDD Phase (Frozen 2026-09-16)

**Tasks**: 31 of 50 checked in `tasks.md` (Phase 1–6, Work Units 1–6).
- Phase 1 (WU1): 5 tasks ✓
- Phase 2 (WU2): 10 tasks ✓
- Phase 3 (WU3): 4 tasks ✓
- Phase 4 (WU4): 4 tasks ✓
- Phase 5 (WU5): 4 tasks ✓
- Phase 6 (WU6): 4 tasks ✓
- Phases 7–10 (WU7–10): 19 tasks not checked — moved to ODD by maintainer decision 2026-09-16

**Note**: The frozen `tasks.md` remains in the archive as written. SDD tasks are historical reference; active progress was recorded in `odd/tasks/issue-2-data-contract-go-catalog.md` from 2026-09-16 onward.

### ODD Phase (2026-09-16 to 2026-09-18)

**Authoritative record**: `odd/tasks/issue-2-data-contract-go-catalog.md` (in active project, not archived).

All 19 remaining tasks completed:
- Slice 7 (WU7: catalog minimax/xiaomi/tencent/meituan/meta): T7.1–T7.6 ✓
- Slice 8 (WU8: canonical phases): T8.1–T8.6 ✓
- Slice 9 (WU9: runtime mappings): T9.1–T9.7 ✓
- Slice 10 (WU10: bundle core): T10.1–T10.4, T10.2b, T10.10–T10.12 ✓
- Slice 11 (WU11: bundle hardening + `loadData`): T11.1–T11.5, T10.13 ✓
- Slice 12 (WU12: CLIs, CI, error surfaces): T10.5–T10.9 ✓

**Per-slice evidence**:
- Slice 7: RED observed (95 failed / 172 passed on missing models), GREEN observed (267/267 pass; 29 files, 19 current / 6 legacy / 4 experimental). Native review approved.
- Slice 8: RED observed (116/116 failed on missing phases file), GREEN observed (420/420 pass). Native review approved.
- Slice 9: RED observed (26/26 failed on missing runtimes), GREEN observed (27/27 pass; counts verified: Pi 24, OpenCode 21, Claude Code 19, Codex 17). Native review approved.
- Slice 10: RED observed (canonical/bundle/cross-file tests failed), GREEN observed (515/515 pass). Native review approved; eight findings folded as T11.1–T11.5.
- Slice 11: RED observed (5 of 9 canonical tests, 3 of 6 `loadBundle` shape, 1 `loadData` failed against old behavior), GREEN observed (538/538 pass). Native review declined by maintainer (candidate-scoped, RDD stays on).
- Slice 12: RED observed (CLI tests, additionalProperties test failed), GREEN observed (559/559 pass; CLI validated 18/18). Native review granted, approved, acknowledged; fourteen informational findings recorded.

**Integration verification on main (post-merge, 2026-09-18)**:
- `pnpm -r typecheck`: exit 0, clean
- `pnpm validate`: exit 0, no errors
- `pnpm test`: 17 files, 559 tests passed
- `pnpm build`: exit 0, wrote `packages/data/build/data.json`, hash `be3e880d3e67ab47d3f9cdd92cf1240bf3bfdd417eac10aa750962a75a52a241`
- GitHub CI workflow: passed on PRs #29 (slice 12) and #30 (docs close-out)

### Close-out (2026-09-18)

**Tasks**: TC.1, TC.3, TC.4 completed; TC.2 (this archive) now running.
- TC.1: `docs/superpowers/specs/2026-09-14-model-profile-site-design.md` line 87 corrected (thresholds formula)
- TC.3: Role summary in frozen spec amended (added `jd-fix-agent: implementer`, `gentle-ai-verify: verifier`, `gentle-ai-worker: implementer`)
- TC.4: OpenCode count corrected (20 → 21 with `gentle-orchestrator`); Claude Code count verified (18 → 19 after `sdd-research` installed); counts verified in spec, design, tasks, proposal, and design doc section 3.2

## Specifications Synced to Main Specs

Eight delta specs merged into `openspec/specs/`. Target state on archive:

| Domain | Action | Requirements | Details |
|--------|--------|--------------|---------|
| `workspace-scaffold` | Created | New | Root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `packages/data/` scaffold, smoke test |
| `data-schemas` | Created | New | Five JSON Schema 2020-12 files: subscription, model, phases, override, runtime; `additionalProperties: false` everywhere |
| `data-loader` | Created | New | YAML parse with alias-bomb guard; Ajv validation naming file and field; code-level Strength-3 evidence check; pure Budget Class derivation |
| `opencode-go-catalog` | Created | New | 29 model files (19 current / 6 legacy / 4 experimental); Go subscription file; fixtures from source docx; data-driven tests |
| `canonical-phases` | Created | New | 27 phase rows with group, callPattern, role, six-axis weights; test asserting exact count and id uniqueness |
| `runtime-mappings` | Created | New | Four runtime files (Pi 24, OpenCode 21, Claude Code 19, Codex 17 `agentMap` entries); integrity checks for dangling references |
| `data-bundle` | Created | New | Canonical JSON (sorted keys, sorted arrays by id); SHA-256 hash; `buildBundle`/`loadBundle` with round-trip verification; `BundleHashMismatchError` and shape errors |
| `ci-validation` | Created | New | GitHub Actions workflow: `pull_request` trigger, `pnpm install --frozen-lockfile`, `pnpm validate`, `pnpm test`, `pnpm build` |

**Merge method**: All specs copied mechanically to `openspec/specs/` with shell `cp` and verified by `diff -r`. No main specs existed before; all are new.

## Archive Contents

✓ `proposal.md` — Present; 89 lines; original proposal with intent, scope, approach, risks, rollback plan, dependencies, success criteria  
✓ `design.md` — Present; 339 lines; technical approach, architecture decisions, data flow, file changes, interfaces, testing strategy, threat matrix, migration/rollout  
✓ `tasks.md` — Present; frozen after WU6; 31 of 50 tasks marked `[x]`; remaining 19 tasks moved to ODD on 2026-09-16  
✓ `specs/` — Present; 8 domain directories, each with `spec.md`  
✓ `apply-progress.md` — Present; historical record of WU1–6 implementation and verification  
✓ `exploration.md` — Present; 13k; exploration phase context  
✓ `research.md` — Present; 11k; research phase context  
✓ `preproposal.json` — Present; 2.4k; preproposal structure  
✓ `state.yaml` — Present; 436 bytes; state tracking  
✗ `verify-report.md` — Absent; no formal verify phase report generated; verification evidence is per-slice in ODD document  

## Known Open Follow-ups

**Not completed; recorded for future work**:
- R4-build-nonatomic-write / R3-nonatomic-bundle-write: Write to temp file, then rename
- R4-runguarded-drops-stack-and-misclassifies: Bare `Error` from `budget-class.ts` exits 2 (data problem but generic error type)
- R3-entrypoint-guard-fails-open / R4-validate-silent-success-fail-open: `import.meta.url` guard exits 0 silently if it mismatches
- R3-yaml-parse-exit-code-unproved: No CLI test feeds malformed YAML to prove exit 1
- R3-bundle-roundtrip-unproved: Load the written file back through `loadBundle`
- R3-unknown-field-assertion-loose: `additionalProperties` error naming improvements
- R2-exit-usage-name-overloaded: Exit code 2 covers both usage and environment failure
- R2-cli-test-helpers-duplicated: `runGuarded` logic duplicated in test code
- R2-document-sentinel-coupling: Tight coupling of error message strings
- R4-ci-no-job-timeout: GitHub Actions job has no `timeout-minutes`
- R3-alias-bomb-fixture-unused: Test fixture `alias-bomb.yaml` created but not fed to a test
- R3-budget-class-partial-validation: `deriveBudgetClass` throws bare `Error` on non-ascending thresholds
- R3-threshold-schema-gap: Schema cannot validate that thresholds are ascending
- Additional advisory items from per-slice reviews: see `odd/tasks/issue-2-data-contract-go-catalog.md` for details on each slice's findings and judgments

## Deviation Summary

**Scope additions beyond original design** (all merged):
- Error types `BundleParseError` and `BundleShapeError` (design named only three error types; these four aggregate shape/integrity failures)
- Code check `checkCurrentRequiresCap` (schema cannot see subscription plan list; code enforces that `current` models have a numeric cap somewhere)
- `packages/data/src/cli/io.ts` (shared CLI infrastructure: `runGuarded` for exit-code dispatch)
- `AGENTS.md` (installed local GGA pre-commit hook rules file; added 2026-09-18 per hook requirement)
- Locale-independent total canonical order (replaces `localeCompare`; committed in slice 11)

**Corrections made during archive close-out** (TC.1, TC.3, TC.4):
- Design spec line 87 threshold formula corrected
- Role summary amended to include three omitted role assignments
- OpenCode count corrected 20 → 21 (adds `gentle-orchestrator`); Claude Code verified 19 (after `sdd-research` install)

## Route and Review

**SDD Route**: Change-driven (manual SDD 2026-09-01 to 2026-09-16); split to ODD on 2026-09-16.

**Verification Approach**:
- SDD WU1–6: Intermediate `apply-progress.md` updated; per-WU verification via `pnpm` commands recorded
- ODD WU7–12: Per-slice verification and native review receipts in `odd/tasks/issue-2-data-contract-go-catalog.md`
- Final integration: `pnpm -r typecheck`, `pnpm validate`, `pnpm test`, `pnpm build`, CI workflow verified on main

**Review Mode**: Receipt-driven development enabled. Native review lineages per ODD document:
- Slice 7: `review-c8dc7c69d1c641ee` (reliability lens, approved)
- Slice 8: `review-c2712fe1cfe18541` (reliability lens, approved)
- Slice 9: `review-f556e8866254e282` (reliability lens, approved)
- Slice 10: `review-4384fb190d896943` (reliability lens, approved)
- Slice 11: `review-ced255014c2a0e9d` (consent declined by maintainer, candidate-scoped)
- Slice 12: `review-de28a9550889c61f` (four lenses: risk, resilience, readability, reliability; approved)
- Docs: `review-08245139e52d01c6` (reliability lens, approved)

## Archive Readiness

✓ All implementation merged to `main`  
✓ All test assertions GREEN on `main`  
✓ CI workflow verified passing on PRs #29 and #30  
✓ Delta specs moved to main specs with empty `diff -r`  
✓ Change folder moved to archive with empty `diff -r`  
✓ No artifacts lost  
✓ Honest record of SDD tasks (31 checked, 19 moved to ODD) preserved  

## Timeline

- **2026-09-01**: Initial SDD proposal and planning (PR #17)
- **2026-09-02 to 2026-09-16**: SDD work units 1–6, six slices, six PRs (#18–#23), all merged
- **2026-09-16**: Maintainer decision to move remaining work (WU7–12) to ODD route
- **2026-09-17**: ODD implementation slices 7–10, review cycles, PR #24–#27 merged
- **2026-09-18**: ODD implementation slices 11–12, docs close-out, PRs #28–#30 merged, all tests passing on main
- **2026-09-18**: Archive executed; specs synced, change folder moved, archive report created

## Dependencies Closed

All dependencies are merged and satisfied:

- Node 22, pnpm, TypeScript, Vitest, fast-check, Ajv, ajv-formats, yaml: installed and verified
- Live `opencode.ai/docs/go` re-fetched at each catalog slice: verified in ODD document
- Four runtime config sources read at WU9: live counts extracted and verified
- All source YAML files parse without error: `pnpm validate` exit 0 on main

---

**This archive report generated by `sdd-archive` executor on 2026-09-18.**  
**Status**: Complete. All implementation delivered, verified, and merged.  
**Next Phase**: None. Change is closed.
