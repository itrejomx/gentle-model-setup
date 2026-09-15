## Exploration: Repo scaffold, data contract, OpenCode Go catalog, content-hashed bundle (issue #2)

### Current State
Repo is docs-only: `CONTEXT.md`, `docs/adr/0001-*`, `docs/prd/2026-09-14-model-profile-site.md`, `docs/superpowers/specs/2026-09-14-model-profile-site-design.md`, and a fresh `openspec/` bootstrap (`config.yaml`, empty `specs/`, `changes/archive/`). No `package.json`, no `pnpm-workspace.yaml`, no source code, no lockfile. The design spec (secs 3-5, 8) and PRD ("Implementation Decisions") already specify the data model, engine contract, and repo layout in detail; grill-session Engram decisions (#671 overrides keying, #673 per-Plan model map, #670 strengths ordinal+evidence, #666 fallback chain shape, #677 typed reason factors, #669 effort rules) refine them further. The two golden source docx files that seed OpenCode Go catalog evidence live OUTSIDE the repo (`~/Downloads/Perfiles_SDD_OpenCode_Go_Only_v2.2.docx` and a volatile `~/Library/Caches/...` path per Engram `source-profile-docs`) and were not reachable/converted in this exploration.

### Affected Areas (to be created; none exist yet)
- `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json` — workspace root, needed by every later issue.
- `data/subscriptions/opencode-go.yaml`, `data/models/opencode-go/*.yaml`, `data/phases/phases.yaml`, `data/runtimes/{opencode,pi,claude-code,codex}.yaml` — the YAML contract this issue must produce.
- `data/schemas/*.schema.json` (5 files: subscription, model, phases, override, runtime) — validated by CI.
- A new package (name TBD by sdd-propose, e.g. `packages/data-loader`) — hosts the YAML loader/validator and the bundle build. `packages/engine` is explicitly "no I/O" per ADR 0001/PRD, so the loader cannot live there; the design spec's repo layout (sec 8) does not name a home for it at all — this is a genuine gap for sdd-propose to close.
- `.github/workflows/ci.yml` — validate + bundle build on PR (scoped subset of the eventual full CI; engine tests and site build are later issues' job).
- `packages/engine`, `packages/checker`, `apps/site` — per PRD build order ("(1) data schema + Go catalog, (2) engine, (3) site, (4) checker") and the linked tracker issue split (#2 scaffold, #3 engine core), these do not need to exist yet; see Approach comparison below.

### Approaches

**A. Schema validation library**

1. **Ajv + hand-written JSON Schema files** — JSON Schema is the literal artifact the issue and design spec (sec 4: "validated by JSON Schema on CI") ask for. Ajv's `instancePath`/`schemaPath` map directly to the "name the file and the field" acceptance criterion, and native `if/then` expresses "Strength 3 requires evidence" as a schema-level rule any JSON-Schema tool can also enforce.
   - Pros: literal compliance with the issue wording; portable rule; mature tooling (ajv-formats, ajv-errors).
   - Cons: JSON Schema authored by hand drifts from TS types unless generated separately; `if/then` over 6 strength axes is verbose.
   - Effort: Medium.
2. **Zod schemas + `zod-to-json-schema`** — author validation in TypeScript, derive JSON Schema as a secondary artifact.
   - Pros: single source of truth, best DX, `.superRefine()` makes the cross-field Strength-3 rule trivial and gives a precise error.
   - Cons: `superRefine` logic does not survive translation to JSON Schema, so the derived `.json` file would not itself enforce that rule — splits "the schema" from "the validator" in a way the issue's phrasing ("JSON Schemas for every data collection") does not anticipate.
   - Effort: Medium.
   - (TypeBox is a middle option worth a design-phase look: schema-as-TS-types that compile to real JSON Schema Ajv can run, but was not deeply explored here.)

   **Recommendation**: Ajv over hand-written JSON Schema as the source of truth (matches the issue and design spec literally), with a code-level post-validation check layered on top purely to produce a friendlier error naming which of the six strength axes triggered the Strength-3-needs-evidence rule (Ajv's own `if/then` error message would not say which axis failed). Both together satisfy the acceptance criterion twice over — spec-level and message-quality.

**B. Monorepo layout for this slice**

1. **Scaffold all four workspace members now** (`packages/engine`, `packages/checker`, `apps/site` as empty/stub packages, plus the loader package) — matches the issue text's literal list.
   - Pros: later issues never touch `pnpm-workspace.yaml` again; the shape exists on day one.
   - Cons: three packages with no logic and no real tests look like padding; `packages/engine` sitting empty invites someone to put I/O-touching loader code in it before its "zero dependencies, no I/O" contract is exercised by any test.
   - Effort: Medium.
2. **Scaffold only the workspace root + `data/` + the new loader package this slice; defer `packages/engine`, `packages/checker`, `apps/site` to their own issues** (#3 engine, site/checker issues per the tracker).
   - Pros: matches PRD build order exactly ("data schema + Go catalog" first, "engine" second); every file created this slice has a real test behind it, consistent with the project's strict vertical-slice TDD; keeps this already-large issue smaller.
   - Cons: reads slightly against a literal parse of the issue text ("a data directory, an engine package, a checker package, a site app") if that sentence is taken as a checklist rather than a description of the target architecture.
   - Effort: Low-Medium.

   **Recommendation**: Option 2. `pnpm-workspace.yaml` should glob `packages/*`/`apps/*` so adding a real package later needs no workspace-file edit, and empty packages before their first real test would violate the project's own TDD convention on day one.

### Data Shape, Content Hash, CI, Tests
- Data shapes for subscriptions/models/phases/overrides/runtimes follow design spec secs 3.1-3.2 and sec 4 plus the grill decisions (#670 strengths ordinal 0-3 + evidence, #673 per-Plan map, #671 overrides keyed by tier+phase with subset-match `requires`) directly — no new decisions needed there.
- OpenCode Go catalog evidence source (the two docx files) is not reachable from this exploration session; flag to sdd-propose that classification work needs either the user to run `pandoc <file> -t gfm` and share the text, or the files copied into repo fixtures first (per the PRD's own "Further Notes": "the second source document lives in a volatile macOS cache path; copy both into repo fixtures early").
- Content hash: canonicalize before hashing (sort object keys and array ordering deterministically — model/subscription/runtime lists especially, since filesystem glob order is not guaranteed stable) then SHA-256 the canonical JSON of the four collections; never include a build timestamp inside the hashed payload (breaks the "same data → same hash" guarantee). Ship `{ hash, subscriptions, models, phases, overrides, runtimes }` as `data.json`. A `loadBundle()` function in the same loader package re-hashes on read to catch corruption/tampering and satisfies "the loader can read it back."
- CI: one `.github/workflows/ci.yml` triggered on `pull_request`, running `pnpm install --frozen-lockfile`, `pnpm validate`, `pnpm build`, scoped to only these two commands for this issue (later issues extend the same file rather than replacing it).
- Test seams (vertical slices, one behavior at a time): valid-fixture load; wrong-field-type fixture names file+field; Strength-3-without-evidence fixture fails (property test over generated strengths objects); OpenCode Go subscription fixture exposes capped billing model + thresholds + plans + catalog source; every committed OpenCode Go model file (data-driven, not just fixtures) has lab/6 strengths/privacy/status/per-Plan evidence+verifiedAt; `phases.yaml` has exactly 27 entries with call pattern/weights/role; each runtime mapping's agent count matches its documented figure; bundle build emits a hash and `loadBundle()` round-trips it; building twice from identical data yields an identical hash (determinism property test).

### Review Workload Forecast
Rough authored-line estimate (excludes generated `data.json` and lockfile per the SDD guard): workspace scaffold ~150-250; 5 JSON Schemas + loader/validator + tests ~600-800; OpenCode Go subscription file ~40-60; OpenCode Go model catalog — size unknown until the docx evidence is read, plausibly 450-1250+ lines across 15-25+ models; `phases.yaml` (27 entries) ~270-400; 4 runtime mapping files ~160-240; bundle build + hash + CI workflow ~150-250. Total plausibly 2000-3500+ lines — well over either a 400-line or an 800-line single-PR budget, so this issue needs `auto-chain` regardless of which budget number governs (see Risk on the 400-vs-800 conflict below). Suggested chained-PR slices, each with its own clear finish line and verification:
1. Workspace scaffold (root config only, no data, no logic).
2. JSON Schemas + loader/validator + error reporting + core tests.
3. OpenCode Go subscription file + thresholds.
4. OpenCode Go model catalog (may itself need 2 PRs if the real model count is large once the docx evidence is available).
5. `phases.yaml` (27 canonical phases).
6. Runtime mappings (4 files).
7. Bundle build (content hash + read-back) + CI workflow.

### Recommendation
Proceed to `sdd-propose` with: Ajv + hand-written JSON Schema (plus a code-level friendly-error layer for the Strength-3 rule) as the schema strategy; a minimal-this-slice monorepo layout (workspace root + `data/` + one new loader/bundle package, deferring `engine`/`checker`/`site` package creation to their own issues); and the 7-slice chained-PR plan above. sdd-propose must explicitly resolve the open items in Risks before sdd-tasks can produce concrete file-level tasks.

### Risks
- The two OpenCode Go source docx files are unreachable from this exploration (one in a volatile macOS cache path); classification evidence work is blocked until the user converts/supplies them or copies them into repo fixtures.
- Live agent-count audit on this machine (today) shows Claude Code = 19 agent files (`jd-fix-agent`, `jd-judge-a`, `jd-judge-b`, `review-readability`, `review-refuter`, `review-reliability`, `review-resilience`, `review-risk`, `sdd-apply`, `sdd-archive`, `sdd-design`, `sdd-explore`, `sdd-init`, `sdd-onboard`, `sdd-propose`, `sdd-research`, `sdd-spec`, `sdd-tasks`, `sdd-verify`), one more than the "Claude Code 18" the issue/PRD records. Pi (24, confirmed including `sdd-proposal.md`), OpenCode (20, computed from `~/.config/opencode/opencode.json`'s base per-phase agent entries, no `-oc-go`/`-oc-go-eco`/`-oc-go-hi` suffix variants counted), and Codex (17, from `~/.codex/agents/*.toml`) all match exactly. `sdd-research` is present in Claude Code's agents dir but the issue's canonical-phase table does list `sdd-research` as a real phase — needs a decision on whether to update the count to 19 or explain the exclusion.
- This session's preflight states a 400-changed-line review budget, but an earlier paused `sdd-init` session cached `review_budget_lines: 800` for this same project (Engram #686). The two values conflict; whichever governs, this issue is large enough to need chained PRs either way, but the exact slice boundaries shift with the number.
- The design spec's repository layout (sec 8) never names a home for the YAML loader/validator/bundle-build code; it must be decided as part of `sdd-propose` before `sdd-tasks` can name file paths.
- The real OpenCode Go current-model count (and therefore the catalog slice's real size) is unknown until the docx evidence is available and re-verified against the live catalog, so the review-workload line estimate for that slice is a rough guess.

### Ready for Proposal
Yes — enough is understood to proceed to `sdd-propose`, provided the open items above (docx evidence access, loader package placement, schema-library choice confirmation, and the two count/budget discrepancies) are carried into the proposal as explicit decisions rather than silently assumed.

### Orchestrator addendum (2026-09-14, after exploration)
- Both source docx files ARE reachable: `~/Downloads/Perfiles_SDD_OpenCode_Go_Only_v2.2.docx` and `~/Downloads/Gentle AI OpenCode GPT 5.6.docx` (a copy of the cache file saved to Downloads on 2026-09-14). Converted with pandoc to GFM in the session scratchpad; the proposal should commit converted copies as repo fixtures per the PRD's "Further Notes".
- Review budget is fixed at 400 changed lines per PR by the SDD session preflight policy; the 800 value in Engram #686 is stale and superseded.
