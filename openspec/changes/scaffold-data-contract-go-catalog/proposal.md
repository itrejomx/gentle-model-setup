# Proposal: Scaffold data contract and OpenCode Go catalog

Issue: https://github.com/itrejomx/gentle-model-setup/issues/2 (PRD #1, build step 1)

## Intent

The repo is docs-only. Engine (#3), site, and checker all need a validated YAML contract and a content-hashed bundle first. Success: `pnpm validate` names file and field on bad data, `pnpm build` emits `data.json` with a stable hash, and the Go catalog matches docs/go as of 2026-09-14.

## Scope

### In Scope
- Workspace root; `packages/data` (loader, validator, Budget Class derivation, bundle)
- Five JSON Schemas; Go subscription file; 29 model files; 27 phases; four runtime mappings
- Both source docx as pandoc GFM fixtures
- CI on `pull_request`

### Out of Scope
- `packages/engine`, `packages/checker`, `apps/site` (issues #3+)
- Overrides data (schema only; bundle carries `overrides: []`)
- OpenCode Black; other subscriptions

## Capabilities

### New Capabilities
- `workspace-scaffold`: pnpm workspace globbing `packages/*` and `apps/*`; TypeScript, Vitest, fast-check
- `data-schemas`: subscription, model, phases, override, runtime
- `data-loader`: YAML load, Ajv errors naming file and field, Strength-3 check naming the axis, Budget Class per Plan
- `opencode-go-catalog`: subscription thresholds, 29 models, source fixtures
- `canonical-phases`: 27 rows with call pattern, weights, role
- `runtime-mappings`: Pi 24, OpenCode 20, Claude Code 19, Codex 17
- `data-bundle`: canonical JSON, SHA-256, `loadBundle()` round-trip
- `ci-validation`: install, validate, test, build

### Modified Capabilities
None.

## Approach

| Decision | Choice | Why |
|---|---|---|
| Loader home | `packages/data` (`@gentle-ai/profile-data`) | Owns I/O, Ajv, and Budget Class derivation (ADR 0001); engine stays zero-dependency |
| Schema | Ajv over hand-written JSON Schema 2020-12, plus a code check naming the violating strength axis | Schema files feed the checker's LLM drafter; TypeBox adds a second source of truth |
| Layout | Root, `data/`, `packages/data` only | PRD build order; strict TDD forbids empty packages; globs admit later members |
| Catalog | 28 live rows plus `grok-4.5` | `current` (19); `legacy`: kimi-k2.6, minimax-m2.7, glm-5.1, qwen3.6-plus, minimax-m2.5 (no caps), grok-4.5 (2026-08-19 evidence); `experimental`: hy4-preview, deepseek-v4-flash-vision-exp, muse-spark-1.2/1.3-contributor (`trainsOnData: true`, retention `null` = unpublished) |
| Plans | One Plan `go`; `plans.go` holds 5h/weekly/monthly caps, $ bucket, multiplier, `verifiedAt` | Budget Class derives from `requestsPer5h` thresholds in the subscription file (sniper <200, semi <500, workhorse ≤5000, volume >5000); $ bucket and promo multipliers are evidence only |
| Hash | SHA-256 over canonical JSON (sorted keys, arrays by id, no timestamps); `hash` outside payload; `loadBundle()` re-hashes | Same data, same hash |
| CI | `install --frozen-lockfile`, `validate`, `test`, `build` | Later issues extend the file |

Delivery: `auto-chain`, `stacked-to-main`, 400 authored lines per PR (`data.json`, lockfile, pandoc fixtures excluded). Slices: (1) scaffold; (2) subscription and model schemas, loader, Strength-3 check, derivation; (3) phases, runtime, override schemas; (4) Go subscription and fixtures; (5) catalog moonshot/zhipu/xai/openai; (6) catalog alibaba/deepseek; (7) catalog minimax/xiaomi/tencent/meituan/meta; (8) phases; (9) runtime mappings; (10) bundle and CI.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` | New | Root |
| `packages/data/` | New | Loader, validator, bundle |
| `data/schemas/*.schema.json` | New | Five schemas |
| `data/subscriptions/opencode-go.yaml`, `data/models/opencode-go/*.yaml` | New | Plan, thresholds, 29 models |
| `data/phases/phases.yaml`, `data/runtimes/*.yaml` | New | 27 phases, 4 runtimes |
| `data/sources/*.md` | New | Fixtures |
| `.github/workflows/ci.yml` | New | CI |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Catalog drift before apply | High | Per-row `verifiedAt`; re-fetch docs/go at slice 5 |
| Catalog slice over 400 lines | Med | Split again by lab |
| grok-4.5 rename unconfirmed | Med | `legacy`; checker revisits |

## Rollback Plan

Each slice is one stacked PR; revert it. Data slices revert file-by-file without touching the loader.

## Dependencies

- Node 22, pnpm, TypeScript, Vitest, fast-check, Ajv, ajv-formats, yaml
- Live docs/go re-fetch during apply

## Success Criteria

- [ ] Bad data fails naming file and field; Strength 3 without evidence fails naming the axis
- [ ] Go subscription exposes `capped`, thresholds, Plan `go`, catalog source
- [ ] Every Go model has Lab, six Strengths, privacy, status, `plans.go` evidence with `verifiedAt`
- [ ] `phases.yaml` has exactly 27 rows
- [ ] Runtime mappings: Pi 24, OpenCode 20, Claude Code 19 (amended from 18; `sdd-research` is installed), Codex 17
- [ ] `pnpm build` emits `data.json` with a hash; `loadBundle()` reads it back; identical data yields identical hash
- [ ] CI runs on pull requests
