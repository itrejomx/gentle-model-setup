# Tasks: Scaffold data contract and OpenCode Go catalog

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180-380 authored lines per PR across 10 slices (design Delivery table); ~2960 authored lines total, excluding `data.json`, the pnpm lockfile, and `data/sources/*.md` |
| 400-line budget risk | Medium — slices 5-7 (catalog) carry the only real overrun risk if the live catalog grew since 2026-09-14 |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 → PR 8 → PR 9 → PR 10 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

```text
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium
```

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Workspace scaffold: root configs + `packages/data` skeleton + smoke test | PR 1 | `pnpm -r typecheck && pnpm test` | N/A — pure config scaffold, no runtime behavior yet | Revert PR 1; nothing downstream depends on scaffold internals |
| 2 | Subscription+model schemas, YAML parse, Ajv, `DataError`, Strength-3 check, `deriveBudgetClass` | PR 2 | `pnpm --filter @gentle-ai/profile-data test -- validate budget-class` | N/A — unit/property tests call loader functions directly | Revert PR 2; additive, nothing consumes it yet |
| 3 | phases/runtime/override schemas + validators | PR 3 | `pnpm --filter @gentle-ai/profile-data test -- validate` | N/A — unit tests only | Revert PR 3; independent schema files |
| 4 | Go subscription file + source fixtures | PR 4 | `pnpm --filter @gentle-ai/profile-data test -- subscription-opencode-go` | N/A — validated via loader API, no network call | Revert PR 4; single file + fixtures, no model files depend on it |
| 5 | Catalog moonshot(3)/zhipu(4)/xai(2)/openai(1) — 10 models | PR 5 | `pnpm --filter @gentle-ai/profile-data test -- catalog` | Re-fetch https://opencode.ai/docs/go before authoring these 10 rows | Revert PR 5; 10 files independent of other labs |
| 6 | Catalog alibaba(5)/deepseek(4) — 9 models | PR 6 | `pnpm --filter @gentle-ai/profile-data test -- catalog` | Re-fetch https://opencode.ai/docs/go before authoring these 9 rows | Revert PR 6; 9 files independent |
| 7 | Catalog minimax(3)/xiaomi(2)/tencent(2)/meituan(1)/meta(2) — 10 models, 29 total | PR 7 | `pnpm --filter @gentle-ai/profile-data test -- catalog` | Re-fetch https://opencode.ai/docs/go before authoring these 10 rows | Revert PR 7; 10 files independent |
| 8 | `phases.yaml` — 27 rows | PR 8 | `pnpm --filter @gentle-ai/profile-data test -- phases` | N/A — data-driven glob test | Revert PR 8; single file |
| 9 | Four runtime mappings | PR 9 | `pnpm --filter @gentle-ai/profile-data test -- runtime-mappings` | Read live installs (read-only) at `~/.pi/agent/agents/`, `~/.config/opencode/opencode.json`, `~/.claude/agents/`, `~/.codex/agents/` before authoring | Revert PR 9; 4 independent files |
| 10 | Canonical JSON, hash, `buildBundle`/`loadBundle`, CLIs, `ci.yml` | PR 10 | `pnpm --filter @gentle-ai/profile-data test -- bundle`; then `pnpm validate && pnpm test && pnpm build` | CI workflow runs on this slice's own PR (`.github/workflows/ci.yml`, `pull_request` trigger) | Revert PR 10; additive, no earlier slice depends on it |

## Phase 1: Workspace Scaffold (Work Unit 1, PR 1)

- [ ] 1.1 Create root `package.json` (private, `packageManager: pnpm@10`, scripts `validate`/`build`/`test`/`typecheck` via `pnpm -r`), `pnpm-workspace.yaml` (globs `packages/*`, `apps/*`), `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `module: nodenext`, `target: es2023`), `.nvmrc` (22), `.gitignore` (`node_modules`, `dist`, `build/`).
- [ ] 1.2 Create `packages/data/package.json` (`@gentle-ai/profile-data`, `"type": "module"`, deps `ajv`/`ajv-formats`/`yaml`, dev `vitest`/`fast-check`/`tsx`/`typescript`), `packages/data/tsconfig.json` (extends base), `packages/data/vitest.config.ts` (node env, `test/**/*.test.ts`).
- [ ] 1.3 RED: write `packages/data/test/index.test.ts` asserting `packages/data/src/index.ts` exports a `VERSION` string — fails, module does not exist.
- [ ] 1.4 GREEN: create `packages/data/src/index.ts` exporting `VERSION` to pass 1.3; run `pnpm install`.
- [ ] 1.5 Verify: `pnpm -r typecheck && pnpm test` green from a clean install; confirm the PR diff contains only scaffold files.

## Phase 2: Subscription+Model Schemas, Loader Core (Work Unit 2, PR 2)

- [ ] 2.1 Create `data/schemas/subscription.schema.json`, `data/schemas/model.schema.json` (2020-12, `additionalProperties: false`, six strength axes `integer 0..3`, six `allOf` Strength-3 evidence blocks, `id` pattern `^[a-z0-9][a-z0-9.\-]*$`).
- [ ] 2.2 RED: fixture pairs under `packages/data/test/fixtures/{valid,invalid}/` plus `packages/data/test/validate.test.ts` asserting `validateSubscription`/`validateModel` reject a wrong-field-type fixture naming file and field — fails, functions do not exist.
- [ ] 2.3 GREEN: implement `packages/data/src/types.ts`, `errors.ts` (`DataError`, `DataValidationError`), `yaml.ts` (parse with `{ schema: 'core', merge: false, maxAliasCount: 100 }`, no code-constructing tags), `validate.ts` (Ajv, `instancePath` rendered as dotted `field`) to pass 2.2.
- [ ] 2.4 RED (threat matrix — untrusted contributor YAML): fixture test — an alias-bomb YAML is rejected without hanging; a symlinked file outside `data/` is rejected via `path.resolve` + `realpath` containment; `id: "../escape"` fails schema validation naming `id` — fails, no containment check yet.
- [ ] 2.5 GREEN: implement `rootDir` resolution and realpath containment plus the alias-bomb guard in `yaml.ts`/loader entrypoint to pass 2.4.
- [ ] 2.6 RED: property test `packages/data/test/strength-evidence.property.test.ts` (fast-check over six 0..3 ints crossed with evidence subsets) asserting a strength-3 axis without a non-empty `evidence.<axis>` fails, naming exactly the offending axis.
- [ ] 2.7 GREEN: add the code-level Strength-3 axis check to `validate.ts` to pass 2.6.
- [ ] 2.8 RED: table test `packages/data/test/budget-class.test.ts` for boundaries 199/200/499/500/5000/5001 and `null` caps; property test for monotonicity (fast-check over ascending thresholds and caps).
- [ ] 2.9 GREEN: implement `packages/data/src/budget-class.ts` (`deriveBudgetClass`, pure, no I/O) to pass 2.8.
- [ ] 2.10 Verify: `pnpm --filter @gentle-ai/profile-data test` and `pnpm -r typecheck` green.

## Phase 3: Phases/Runtime/Override Schemas (Work Unit 3, PR 3)

- [ ] 3.1 Create `data/schemas/phases.schema.json`, `data/schemas/runtime.schema.json`, `data/schemas/override.schema.json` (group/callPattern/role/weights enums; `agentMap`/`prefixMap` as `additionalProperties: {type: string}, minProperties: 1`; `tier`/`requires`/`pr` enums).
- [ ] 3.2 RED: fixture pairs plus a test asserting `validatePhases`, `validateRuntime`, `validateOverride` each reject a crafted invalid fixture (missing a `weights` axis; non-string `agentMap` value; `tier` outside enum).
- [ ] 3.3 GREEN: implement the three validator functions in `validate.ts`/`index.ts` to pass 3.2.
- [ ] 3.4 Verify: `pnpm --filter @gentle-ai/profile-data test` green.

## Phase 4: Go Subscription + Source Fixtures (Work Unit 4, PR 4)

- [ ] 4.1 RED: `packages/data/test/subscription-opencode-go.test.ts` asserting `data/subscriptions/opencode-go.yaml` validates, `billingModel: capped`, thresholds ascend (sniper<200, semi<500, workhorse<=5000, volume>5000), Plan `go` present, `deriveBudgetClass(220, thresholds)` yields `semi` — fails, file missing.
- [ ] 4.2 GREEN: create `data/subscriptions/opencode-go.yaml` per the design data shape, `catalogSourceUrl: https://opencode.ai/docs/go`, `verifiedAt: 2026-09-14`.
- [ ] 4.3 Copy pandoc GFM conversions of `~/Downloads/Perfiles_SDD_OpenCode_Go_Only_v2.2.docx` (read-only) and `~/Downloads/Gentle AI OpenCode GPT 5.6.docx` (read-only), already converted at `/private/tmp/claude-501/-Users-itrejomx-Code-gentle-model-setup/7e64237b-ca39-4b00-b699-5ec00c06b60f/scratchpad/sources/*.md` (read-only), into `data/sources/*.md`.
- [ ] 4.4 Verify: `pnpm --filter @gentle-ai/profile-data test -- subscription-opencode-go`.

## Phase 5: Catalog — moonshot/zhipu/xai/openai (Work Unit 5, PR 5)

- [ ] 5.1 Re-fetch https://opencode.ai/docs/go; confirm current caps and status for these 10 models before authoring (design risk 1).
- [ ] 5.2 RED: extend `packages/data/test/catalog.test.ts` (globs `data/models/opencode-go/*.yaml`) asserting these 10 files exist, validate, and each carries `verifiedAt: 2026-09-14`.
- [ ] 5.3 GREEN: create `data/models/opencode-go/{kimi-k3,kimi-k2.7-code}.yaml` (moonshot, `status: current`) and `kimi-k2.6.yaml` (moonshot, `status: legacy`); `{glm-5.3-flash,glm-5.3,glm-5.2}.yaml` (zhipu, `current`) and `glm-5.1.yaml` (zhipu, `legacy`); `grok-4.6.yaml` (xai, `current`) and `grok-4.5.yaml` (xai, `legacy`); `gpt-5.6-luna.yaml` (openai, `current`) — each with `lab`, six strengths, `evidence` for any axis rated `3`, `privacy`, `effortVariants`, `plans.go` with `verifiedAt: 2026-09-14`.
- [ ] 5.4 Verify: `pnpm --filter @gentle-ai/profile-data test -- catalog`.

## Phase 6: Catalog — alibaba/deepseek (Work Unit 6, PR 6)

- [ ] 6.1 Re-fetch https://opencode.ai/docs/go; confirm current caps and status for these 9 models.
- [ ] 6.2 RED: extend the catalog test for these 9 files plus a case asserting `deepseek-v4.1-flash`'s promo `multiplier`/`multiplierExpiresAt` (4x through 2026-09-20) does not change its derived Budget Class (derivation uses base `requestsPer5h`).
- [ ] 6.3 GREEN: create `{qwen3.8-max,qwen3.8-flash,qwen3.7-max,qwen3.7-plus}.yaml` (alibaba, `current`) and `qwen3.6-plus.yaml` (alibaba, `legacy`); `{deepseek-v4.1-flash,deepseek-v4-pro,deepseek-v4-flash}.yaml` (deepseek, `current`) and `deepseek-v4-flash-vision-exp.yaml` (deepseek, `experimental`, `trainsOnData: true`).
- [ ] 6.4 Verify: `pnpm --filter @gentle-ai/profile-data test -- catalog`.

## Phase 7: Catalog — minimax/xiaomi/tencent/meituan/meta (Work Unit 7, PR 7)

- [ ] 7.1 Re-fetch https://opencode.ai/docs/go; confirm current caps and status for these 10 models; total catalog reaches 29.
- [ ] 7.2 RED: extend the catalog test asserting exactly 29 files total, 19 `current`/6 `legacy`/4 `experimental`; `minimax-m2.5` has no numeric `requestsPer5h` on any plan and therefore cannot be `current` (code check, schema cannot see the subscription's plan list); `muse-spark-1.2-contributor` and `muse-spark-1.3-contributor` declare `trainsOnData: true` and `logRetentionDays: null`.
- [ ] 7.3 GREEN: create `minimax-m3.yaml` (minimax, `current`) and `{minimax-m2.7,minimax-m2.5}.yaml` (minimax, `legacy`); `{mimo-v2.5,mimo-v2.5-pro}.yaml` (xiaomi, `current`); `hy3.yaml` (tencent, `current`) and `hy4-preview.yaml` (tencent, `experimental`); `longcat-2.0.yaml` (meituan, `current`); `{muse-spark-1.2-contributor,muse-spark-1.3-contributor}.yaml` (meta, `experimental`, `logRetentionDays: null`).
- [ ] 7.4 Verify: `pnpm --filter @gentle-ai/profile-data test -- catalog` asserts 29/29 files, 19 current / 6 legacy / 4 experimental.

## Phase 8: Canonical Phases (Work Unit 8, PR 8)

- [ ] 8.1 RED: `packages/data/test/phases.test.ts` globbing `data/phases/phases.yaml` asserting exactly 27 rows, ids match the canonical list, every row has `callPattern`, `weights` summing > 0, and `role`.
- [ ] 8.2 GREEN: create `data/phases/phases.yaml` with 27 rows (`group`, `callPattern`, `role`, six-axis `weights`). Per-phase weights have no source document; propose them here with a one-line rationale comment per phase in the YAML (design open question), to be revisited when `packages/engine` consumes them (#3).
- [ ] 8.3 Verify: `pnpm --filter @gentle-ai/profile-data test -- phases`.

## Phase 9: Runtime Mappings (Work Unit 9, PR 9)

- [ ] 9.1 Read live installs (read-only) at `~/.pi/agent/agents/`, `~/.config/opencode/opencode.json`, `~/.claude/agents/`, `~/.codex/agents/` to fill each `agentMap`.
- [ ] 9.2 RED: `packages/data/test/runtime-mappings.test.ts` asserting `agentMap` entry counts Pi 24, OpenCode 20, Claude Code 19, Codex 17; every `agentMap` value resolves to a phase id in `phases.yaml`; every `prefixMap` key is a known provider prefix.
- [ ] 9.3 GREEN: create `data/runtimes/pi.yaml` (24 entries; `sdd-proposal` names the Pi phase mapped to canonical `sdd-propose`; `prefixMap` maps `openai` → `openai-codex`), `data/runtimes/opencode.yaml` (20), `data/runtimes/claude-code.yaml` (19), `data/runtimes/codex.yaml` (17).
- [ ] 9.4 Verify: `pnpm --filter @gentle-ai/profile-data test -- runtime-mappings`.

## Phase 10: Bundle + CLI + CI (Work Unit 10, PR 10)

- [ ] 10.1 RED: `packages/data/test/canonical.property.test.ts` (fast-check over a generated dataset) — shuffling object key order and array order yields an identical hash; changing any scalar changes it.
- [ ] 10.2 GREEN: implement `packages/data/src/canonical.ts` (`canonicalJson`) and `packages/data/src/bundle.ts` (`hashPayload`, `buildBundle` injecting derived `budgetClass`) to pass 10.1.
- [ ] 10.3 RED: `packages/data/test/bundle.integration.test.ts` (temp dir) — `buildBundle` → write → `loadBundle` round-trips; a tampered payload byte throws `BundleHashMismatchError`.
- [ ] 10.4 GREEN: implement `loadBundle` in `bundle.ts` to pass 10.3.
- [ ] 10.5 RED (threat matrix — CLI argument composition): a path argument containing a space and a `;` is validated as that literal directory or exits 2, never executed; assert no `child_process` import in `packages/data`.
- [ ] 10.6 GREEN: create `packages/data/src/cli/validate.ts` (one positional path arg, no shell interpolation, exit 0/1/2 per design) and `packages/data/src/cli/build.ts` to pass 10.5; wire root `package.json` scripts to them.
- [ ] 10.7 Create `.github/workflows/ci.yml` (threat matrix — CI workflow trust): `on: pull_request` only, `permissions: { contents: read }`, `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `pnpm install --frozen-lockfile`, `pnpm validate`, `pnpm test`, `pnpm build`.
- [ ] 10.8 Verify: `pnpm --filter @gentle-ai/profile-data test -- bundle`; then `pnpm validate && pnpm test && pnpm build`; confirm the workflow run on this slice's own PR is green.
