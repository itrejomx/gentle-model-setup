# Design: Scaffold data contract and OpenCode Go catalog

## Technical Approach

One new workspace member, `packages/data` (`@gentle-ai/profile-data`), owns every I/O and validation
concern for the YAML contract: parse, Ajv validation against hand-written JSON Schema 2020-12, the
code-level Strength-3 axis check, Budget Class derivation, canonical JSON, and the SHA-256 bundle.
`data/` holds the schemas and the catalog. Nothing else is scaffolded, so `packages/engine` stays
absent until issue #3 gives it a test. Two CLI entry points in the same package back `pnpm validate`
and `pnpm build`; CI runs them on `pull_request`.

## Architecture Decisions

### Decision: Loader home is `packages/data`

**Choice**: new package `@gentle-ai/profile-data` holding loader, validator, derivation, and bundle.
**Alternatives considered**: put it in `packages/engine`; a root `scripts/` directory.
**Rationale**: ADR 0001 and the PRD fix `packages/engine` as pure, zero-dependency, no-I/O. A loader
needs `node:fs`, `yaml`, and Ajv. A root `scripts/` folder gets no package boundary, no published
artifact, and no clean test target. The design spec (section 8) names no home for this code; this
closes that gap.

### Decision: Ajv over hand-written JSON Schema 2020-12, plus a code-level Strength-3 check

**Choice**: the `.json` schema files are the source of truth. The six-axis
"strength 3 requires evidence" rule is expressed twice: as six `if/then` blocks in the schema, and as
a post-validation code check that names the violating axis.
**Alternatives considered**: Zod with `zod-to-json-schema`; TypeBox.
**Rationale**: the checker (issue #8+) feeds these schema files to an LLM drafter and re-validates the
response, so they must stand alone. Zod's `superRefine` does not survive translation, which would put
the project's headline rule only in TypeScript. TypeBox compiles to real JSON Schema but adds a second
source of truth for a five-file contract. Ajv's `instancePath` gives the field name for free; the code
check exists only because Ajv's `if/then` failure cannot say which of the six axes broke.

### Decision: Budget Class is derived by the loader and written into the bundle, never into YAML

**Choice**: source YAML carries caps only; `additionalProperties: false` on the plan-evidence object
makes a hand-written `budgetClass` a schema error naming the field. `buildBundle()` writes the derived
`plans.<plan>.budgetClass` into the bundle.
**Alternatives considered**: store it in YAML; leave derivation to the engine.
**Rationale**: ADR 0001 says the engine sees only Budget Class and never reasons about money. A bundle
without the derived class would force the engine to read caps and thresholds, which is exactly the
reasoning the ADR forbids. A stored class in YAML would let evidence and class drift apart.

### Decision: hash canonical JSON of the payload, not the YAML bytes

**Choice**: `hash = sha256(canonicalJson(payload))`, `hash` sits beside `payload`, never inside it; no
timestamp enters the hashed value.
**Alternatives considered**: hash the concatenated YAML sources; include a build timestamp.
**Rationale**: "same data, same hash" must survive reformatting a YAML file and unstable filesystem
glob order. Hashing source bytes breaks on whitespace; a timestamp breaks it on every build.

### Decision: one Plan `go`, per-Plan map kept anyway

**Choice**: `plans` stays a map in both schemas even though OpenCode Go has exactly one plan.
**Alternatives considered**: flatten to a single evidence block for this slice.
**Rationale**: ChatGPT-via-Codex (a launch subscription) is multi-plan. Flattening now means a schema
migration and a full catalog rewrite at that issue.

### Decision: `grok-4.5` ships as `legacy`, not deleted

**Choice**: keep the row with its 2026-08-19 evidence and `status: legacy`; add `grok-4.6` as `current`.
**Alternatives considered**: delete it; mark it `retired`.
**Rationale**: research C18 found no changelog confirming a rename, and `status` has no `retired`
member. `legacy` keeps it out of the candidate pool while old shared URLs keep resolving (PRD story 55).

### Decision: validation errors are diagnostics, not Reason Factors

**Choice**: `DataError` is an English developer-facing string triple. No Reason Factor code is emitted
anywhere in this slice.
**Rationale**: `rules.design` keeps Reason Factors typed codes inside the engine. The engine does not
exist yet; conflating a CI error message with the engine's typed-factor vocabulary would leak prose
into that contract later.

## Data Flow

    data/**/*.yaml ─→ parseYaml ─→ validate*() ─→ DataError[]
                                        │              │
                                        ▼              └─→ CLI validate → stderr, exit 1
                                   DataSet (typed)
                                        │
                        deriveBudgetClass(caps, thresholds)
                                        │
                                        ▼
                             buildBundle → canonicalJson → sha256
                                        │
                                        ▼
                              build/data.json { hash, payload }
                                        │
                                  loadBundle() re-hashes → mismatch throws

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json` | Create | Root, private, `packageManager: pnpm@10`, scripts `validate`/`build`/`test`/`typecheck` via `pnpm -r` |
| `pnpm-workspace.yaml` | Create | Globs `packages/*` and `apps/*` so later members need no edit |
| `tsconfig.base.json` | Create | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `module: nodenext`, `target: es2023` |
| `.nvmrc`, `.gitignore` | Create | Node `22`; ignore `node_modules`, `dist`, `build/` |
| `packages/data/package.json` | Create | `@gentle-ai/profile-data`, `"type": "module"`, deps `ajv`, `ajv-formats`, `yaml`; dev `vitest`, `fast-check`, `tsx`, `typescript` |
| `packages/data/tsconfig.json`, `vitest.config.ts` | Create | Extends base; Vitest node env, `test/**/*.test.ts` |
| `packages/data/src/{types,errors,yaml,validate,budget-class,canonical,bundle,index}.ts` | Create | Loader internals and public surface |
| `packages/data/src/cli/{validate,build}.ts` | Create | Two entry points |
| `packages/data/test/**` | Create | Unit, property, data-driven tests and fixtures |
| `data/schemas/{subscription,model,phases,override,runtime}.schema.json` | Create | Five schemas |
| `data/subscriptions/opencode-go.yaml` | Create | Billing model, thresholds, Plan `go`, catalog source |
| `data/models/opencode-go/*.yaml` | Create | 29 model files |
| `data/phases/phases.yaml` | Create | 27 canonical rows |
| `data/runtimes/{pi,opencode,claude-code,codex}.yaml` | Create | Agent map + prefix map |
| `data/sources/*.md` | Create | Two pandoc GFM fixtures (evidence, never golden output) |
| `.github/workflows/ci.yml` | Create | `pull_request`: install, validate, test, build |

## Interfaces / Contracts

### Schemas

`$id` base `https://itrejomx.github.io/gentle-model-setup/schemas/<name>.schema.json`,
`$schema: https://json-schema.org/draft/2020-12/schema`, `additionalProperties: false` everywhere.

| Schema | Required fields | Enums / notable types |
|---|---|---|
| `subscription` | `id`, `displayName`, `providerPrefix`, `billingModel`, `budgetClass`, `catalogSourceUrl`, `verifiedAt` | `billingModel: capped\|metered`; `catalogSourceUrl` string, `format: uri`; `budgetClass.derivedFrom: requestsPer5h\|pricePerMTok`; `thresholds` array of `{class, max:int\|null}`; `if billingModel==capped then required: [plans]` |
| `model` | `id`, `subscription`, `displayName`, `lab`, `strengths`, `privacy`, `effortVariants`, `status`, `plans` | `lab` enum incl. `moonshot zhipu xai openai deepseek alibaba minimax xiaomi tencent meituan meta`; `status: current\|legacy\|experimental`; `effortVariants` items `low\|medium\|high`, unique |
| `phases` | `phases[]` each `id`, `group`, `callPattern`, `role`, `weights` | `group: orchestration\|sdd\|judgment-day\|review\|workers`; `callPattern: one-shot\|loop`; `role: implementer\|verifier\|judge-a\|judge-b\|neutral`; `weights` all six axes, `number 0..1` |
| `override` | `tier`, `phase`, `requires`, `model`, `effort`, `reason`, `author`, `pr` | `tier: HIGH\|BALANCED\|LEAN`; `requires` minItems 1; `pr` `format: uri` |
| `runtime` | `id`, `displayName`, `agentMap`, `prefixMap` | `agentMap` (runtime agent name → canonical phase) and `prefixMap` (subscription provider prefix → runtime prefix) are objects (`additionalProperties: {type: string}`, `minProperties: 1`) so key uniqueness is free |

The six strength axes are fixed keys: `oneShotReasoning`, `sustainedReasoning`, `codingTools`,
`longContext`, `multimodal`, `cheap`, each `integer, 0..3`. `evidence` is an object keyed by the same
six axis names, each value a non-empty string (`minLength: 1`); an axis appears there only when it is
rated `3`. The string is free prose and may carry a URL and a date inline. The Strength-3 rule is six
`allOf` entries:

```json
{ "if":   { "required": ["strengths"],
            "properties": { "strengths": { "required": ["codingTools"],
                            "properties": { "codingTools": { "const": 3 } } } } },
  "then": { "required": ["evidence"],
            "properties": { "evidence": { "required": ["codingTools"] } } } }
```

The code-level check re-runs the same rule over the parsed document and emits one error per offending
axis: `{ file, field: "strengths.codingTools", message: "strength 3 on axis \"codingTools\" requires a non-empty evidence.codingTools string" }`.
The schema rejects the document; the code check explains which axis, satisfying the criterion twice.

The exact 27-row count is asserted by a **test**, not by `minItems/maxItems`, so adding a phase stays a
data change (PRD story 49) rather than a schema change.

### Loader API

```ts
export type BudgetClass = 'sniper' | 'semi' | 'workhorse' | 'volume';
export interface DataError { file: string; field: string; message: string }
export class DataValidationError extends Error { readonly errors: DataError[] }
export class BundleHashMismatchError extends Error { readonly expected: string; readonly actual: string }

// Pure: parsed document in, errors out. Never throws, never touches disk.
export function validateSubscription(doc: unknown, file: string): DataError[];
export function validateModel(doc: unknown, file: string): DataError[];
export function validatePhases(doc: unknown, file: string): DataError[];
export function validateOverride(doc: unknown, file: string): DataError[];
export function validateRuntime(doc: unknown, file: string): DataError[];

// Pure. null caps (unpublished) yield null; thresholds must ascend or it throws.
export function deriveBudgetClass(requestsPer5h: number | null, thresholds: Threshold[]): BudgetClass | null;

export function canonicalJson(value: unknown): string;   // sorted keys, arrays sorted by id, no timestamps
export function hashPayload(payload: BundlePayload): string;  // sha256 hex, node:crypto
export function buildBundle(data: DataSet): Bundle;      // { hash, payload }, derived budgetClass injected
export function loadBundle(file: string): Promise<Bundle>;    // re-hashes payload, throws on mismatch

export function loadData(rootDir: string): Promise<DataSet>;  // throws DataValidationError with ALL errors
export function validateData(rootDir: string): Promise<DataError[]>; // [] means valid
```

`loadData` aggregates rather than fails fast: a contributor fixes every field in one pass.
`field` is Ajv's `instancePath` rendered dotted (`plans.go.requestsPer5h`); a YAML parse failure uses
`field: "<document>"`. `canonicalJson` sorts object keys lexicographically, sorts arrays of objects by
`id` (subscriptions, models by `subscription` then `id`, phases, runtimes; overrides by
`tier`,`phase`,`model`), and emits `JSON.stringify` with no spacing. Phase *presentation* order is
derived from `group`, not from file order, because canonicalization re-sorts by `id`.

### Data shapes

```yaml
# data/subscriptions/opencode-go.yaml
id: opencode-go
displayName: OpenCode Go
providerPrefix: opencode-go
billingModel: capped
budgetClass:
  derivedFrom: requestsPer5h
  thresholds:                       # ascending, inclusive max; last entry max: null
    - { class: sniper,    max: 199 }
    - { class: semi,      max: 499 }
    - { class: workhorse, max: 5000 }
    - { class: volume,    max: null }
plans:
  - { id: go, displayName: Go, priceUsdPerMonth: 10 }
catalogSourceUrl: https://opencode.ai/docs/go
verifiedAt: 2026-09-14
```

```yaml
# data/models/opencode-go/glm-5.2.yaml  (derived budgetClass: workhorse — never written here)
id: glm-5.2
subscription: opencode-go
displayName: GLM-5.2
lab: zhipu
status: current
strengths: { oneShotReasoning: 2, sustainedReasoning: 2, codingTools: 3, longContext: 2, multimodal: 0, cheap: 2 }
evidence:
  codingTools: >-
    Highest 5-hour cap among $60-bucket coding models in the Go catalog
    (https://opencode.ai/docs/go, verified 2026-09-14).
privacy: { trainsOnData: false, logRetentionDays: 0 }
effortVariants: [low, medium, high]
plans:
  go:
    requestsPer5h: 880
    requestsPerWeek: 2150
    requestsPerMonth: 4300
    monthlyUsdBucket: 60
    source: https://opencode.ai/docs/go
    verifiedAt: 2026-09-14
```

`logRetentionDays: null` means unpublished (Muse Spark), distinct from `0` (zero retention).
`multiplier` / `multiplierExpiresAt` are optional evidence on a plan entry (deepseek-v4.1-flash, 4x
through 2026-09-20); derivation uses the base `requestsPer5h`, so a promo never re-tiers a model.
A model with no numeric `requestsPer5h` on any plan (minimax-m2.5) cannot be `current` — a code check,
because the schema cannot see the subscription's plan list.

```yaml
# data/phases/phases.yaml
phases:
  - id: sdd-apply
    group: sdd
    callPattern: loop
    role: implementer
    weights: { oneShotReasoning: 0.1, sustainedReasoning: 0.25, codingTools: 0.4, longContext: 0.15, multimodal: 0, cheap: 0.1 }
```

```yaml
# data/runtimes/claude-code.yaml   (19 agentMap entries; Pi 24, OpenCode 21, Codex 17)
id: claude-code
displayName: Claude Code
agentMap:          # runtime agent name -> canonical phase (Pi: sdd-proposal -> sdd-propose)
  sdd-propose: sdd-propose
  sdd-research: sdd-research
prefixMap:         # subscription provider prefix -> runtime prefix (Pi: openai -> openai-codex)
  opencode-go: opencode-go
```

### CLI

| Script | Entry | Behavior |
|---|---|---|
| `pnpm validate` | `packages/data/src/cli/validate.ts` (`tsx`) | `validateData('data')`; prints `<file>:<field>: <message>` per error to stderr sorted by file then field, then `N error(s) in M file(s)` |
| `pnpm build` | `packages/data/src/cli/build.ts` (`tsx`) | Validates first, then writes `build/data.json` (gitignored) and prints the hash to stdout |

Exit codes: `0` success; `1` data invalid (includes YAML parse failure and hash mismatch); `2` usage or
environment failure (data root missing, unreadable directory). Nothing is written on a non-zero exit.

## Testing Strategy

Strict TDD, vertical slices: one RED test, one minimal implementation, repeat. No bulk test-writing.

| Capability | Layer | What to test | Approach |
|---|---|---|---|
| `data-loader` | Unit | Valid fixture loads; wrong field type names file and field | Fixture pair per case |
| `data-loader` | Property | Strength 3 without evidence fails and the message names exactly the offending axes | fast-check over records of six ints 0..3 crossed with evidence subsets |
| `data-loader` | Unit | Budget Class boundaries 199/200/499/500/5000/5001, `null` caps | Table test |
| `data-loader` | Property | Monotonicity: a higher `requestsPer5h` never yields a lower-ranked class | fast-check over ascending thresholds and caps |
| `data-bundle` | Property | Shuffling object key order and array order yields an identical hash; changing any scalar changes it | fast-check over a generated dataset |
| `data-bundle` | Integration | `buildBundle` → write → `loadBundle` round-trips; a tampered payload byte throws `BundleHashMismatchError` | Temp dir |
| `opencode-go-catalog` | Data-driven | Every committed model file validates; every `current` model has a numeric `requestsPer5h` on plan `go`, six strengths, privacy, `verifiedAt`; 29 files total | Glob the real `data/` tree |
| `canonical-phases` | Data-driven | Exactly 27 rows; ids match the canonical list; every row has call pattern, weights summing > 0, role | Glob |
| `runtime-mappings` | Data-driven | `agentMap` entry counts Pi 24, OpenCode 21, Claude Code 19, Codex 17; every `agentMap` value resolves to a phase id in `phases.yaml`; every `prefixMap` key is a known provider prefix | Glob |
| `workspace-scaffold` | Smoke | `pnpm -r typecheck` and `pnpm test` run green from a clean install | CI |
| `ci-validation` | Integration | The workflow itself runs on this slice's PR | Verified by the run, not by a unit test |

Fixture layout: `packages/data/test/fixtures/{valid,invalid}/<case-name>/` mirrors the `data/` tree.
Each invalid case carries `expected-errors.json` with `{file, field, message}` triples; `message` is
compared by substring so wording can improve without breaking the test. Committed catalog data is
tested by globbing the real tree, never by copying it into fixtures.

Claude Code's count is **19**, amended from the PRD's 18: `sdd-research` is installed and is a
canonical phase. The runtime file is the single place that changes if a count moves.

## Threat Matrix

CI and CLI subprocess boundaries exist; VCS/PR automation does not (that is the checker, issue #8+).

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, executable Markdown/MDX, `README.sh` | N/A — nothing under `data/` is ever executed or classified as executable; `data/sources/*.md` is committed evidence that no code reads | None | None |
| Untrusted data parsing (contributor PR YAML) | alias/merge bomb, oversized document, `id` or filename with `../`, symlink escaping `data/` | Applicable — `data/` is the contribution surface; a fork PR runs `pnpm validate` | `yaml` parsed with `{ schema: 'core', merge: false, maxAliasCount: 100 }` (no code-constructing tags); `rootDir` resolved via `path.resolve`, every discovered file `realpath`-contained under it or rejected with exit 2; model `id` constrained by `pattern: ^[a-z0-9][a-z0-9.\-]*$` | Alias-bomb fixture rejected without hang; symlinked file outside `data/` rejected; `id: "../escape"` fails schema naming `id` |
| Git repository selection | `git -C`, relative and absolute paths | N/A — no git invocation in this slice | None | None |
| Commit state | staged, `commit -a`, empty index | N/A — no code commits anything | None | None |
| Push state | tracking branch, first push, explicit refspec | N/A — no code pushes | None | None |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A — no `gh`/PR automation; CI only runs pnpm scripts | None | None |
| CLI argument and subprocess composition | shell metacharacters in the path argument, injected env | Applicable — CI invokes the CLIs through pnpm scripts | `packages/data` imports no `child_process`; the CLI takes one positional path and never interpolates it into a shell; no secrets read | CLI given a path containing a space and a `;` validates that directory or exits 2, never executes anything |
| CI workflow trust | fork PR with modified workflow, secret exfiltration, unpinned action | Applicable — `pull_request` trigger | `on: pull_request` only (never `pull_request_target`); `permissions: { contents: read }`; no secrets; `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`; `pnpm install --frozen-lockfile` | Verified by the workflow run on this slice's own PR |

## Migration / Rollout

No migration — the repository has no source code. Rollout is the ten-slice stacked chain below.

Each slice is one PR targeting `main`, merged in order, rebased onto `main` after its predecessor
lands so its diff carries only its own work unit. Authored lines exclude `build/data.json`,
`pnpm-lock.yaml`, and the `data/sources/*.md` pandoc fixtures.

| # | Slice | Finish line | Authored lines |
|---|---|---|---|
| 1 | Workspace scaffold: root configs, `packages/data` skeleton, one smoke test | `pnpm install && pnpm test` green | ~180 |
| 2 | subscription + model schemas, YAML parse, Ajv wiring, `DataError`, Strength-3 axis check, `deriveBudgetClass` | Invalid fixture names file, field, and axis; boundary tests pass | ~380 |
| 3 | phases, runtime, override schemas + validators | Each validator rejects a crafted invalid fixture | ~260 |
| 4 | Go subscription file + both source fixtures | Subscription validates; thresholds ascend; `capped` + Plan `go` asserted | ~120 |
| 5 | Catalog: moonshot (3), zhipu (4), xai (2), openai (1) — 10 models | All 10 validate; data-driven test green | ~380 |
| 6 | Catalog: alibaba (5), deepseek (4) — 9 models | All 9 validate, promo multiplier does not re-tier | ~330 |
| 7 | Catalog: minimax (3), xiaomi (2), tencent (2), meituan (1), meta/Muse Spark (2) — 10 models | 29 files total; unpublished retention and uncapped rows handled | ~370 |
| 8 | `phases.yaml` | Exactly 27 rows with call pattern, weights, role | ~330 |
| 9 | Four runtime mappings | `agentMap` counts 24/21/19/17; every `agentMap` value resolves to a phase id; Pi maps `sdd-proposal` → `sdd-propose` and `openai` → `openai-codex` | ~220 |
| 10 | Canonical JSON, hash, `buildBundle`/`loadBundle`, build CLI, `ci.yml` | `pnpm build` emits `build/data.json`; round-trip and determinism tests green; CI runs on the PR | ~320 |

`Decision needed before apply: No` — `auto-chain` is cached and every slice fits the 400-line budget.
Slices 5-7 carry the only real overrun risk; if the live catalog grew since 2026-09-14, split the
offending slice again by lab rather than compressing files.

## Open Questions

- [ ] Strength values for all 29 models are drafted from the two source documents plus research
      evidence; each `strengths: 3` needs a reviewer-checkable `evidence.<axis>` string at apply time.
- [ ] `grok-4.5` versus `grok-4.6` remains an observed table change, not a confirmed rename
      (research C18). Shipping `grok-4.5` as `legacy` is reversible in a one-file PR.
- [ ] Per-phase `weights` are not fixed by any existing document; slice 8 must propose them and they
      become engine inputs at issue #3.
