# Model Profile Site — Design

**Date:** 2026-09-14
**Status:** Approved
**Audience:** Gentle AI community, anyone with an AI coding subscription

## 1. Problem

Gentle AI runs SDD and Judgment Day phases through named sub-agents. Each phase
needs a model assignment, and the right assignment depends on which
subscriptions the user has, how much quota each model carries, and a set of
invariants (sniper models only in one-shot roles, verifiers and judges never from
the implementer's lab, at least two fallbacks per row).

Today that knowledge lives in hand-written documents, one per subscription
combination, that go stale every time a provider ships or re-tiers a model. The
numbers expire; the logic transfers. This project encodes the logic once, keeps
the numbers fresh with a scheduled checker, and lets a user pick their
subscriptions and walk away with a ready-to-use profile.

## 2. Decisions

| Topic | Decision | Rejected |
|---|---|---|
| Audience | Community first, public site | Personal tool |
| Recommendation source | Rules as default, community overrides on top | Pure curation; pure rules |
| New-model classification | Automated draft, human approval via PR | Fully automated; issue-only |
| Output | Drop-in files, harness prompt, CLI command | Tables only |
| Launch subscriptions | OpenAI (ChatGPT via Codex), OpenCode Go, Mistral, OpenRouter, Kimi coding plan | Big-five; everything visible |
| Architecture | Static site + YAML data repo + pure TS engine + cron GitHub Action | Full-stack app with DB; generated docs site |

The CLI route is the only one that touches the Gentle AI repository. This
project ships a content-hashed data bundle and the engine as a package; the
CLI subcommand that consumes them is a follow-up PR to Gentle AI and is out
of scope here.

## 3. Classification model

### 3.1 Model parameters

| Parameter | Values | Purpose |
|---|---|---|
| `lab` | `moonshot`, `zhipu`, `xai`, `openai`, `deepseek`, `alibaba`, `minimax`, `xiaomi`, `tencent`, `meta`, `mistral`, ... | Independence key. Versions of one lab count as one lab (Kimi K3 and K2.7 are both `moonshot`). |
| `budgetClass` | `sniper`, `semi`, `workhorse`, `volume` | Hard filter against call pattern. Derived per subscription (see 3.4). On a capped subscription it is derived per Plan from the `plans` map; a Plan absent from the map means the model is not offered there. |
| `plans` | map of Plan → evidence (caps, multiplier) | Capped subscriptions only. Drives per-Plan availability and Budget Class. Metered subscriptions omit it and derive once from price. |
| `strengths` | ordinal 0–3 per strength over `one-shot-reasoning`, `sustained-reasoning`, `coding-tools`, `long-context`, `multimodal`, `cheap` (0 not a fit, 1 usable, 2 strong, 3 best in class within the subscription; a 3 must cite evidence or the schema rejects it) | Scoring input per phase. Ties are expected; they break by Budget Class fit, then untouched lab, then cheaper model. |
| `privacy` | `trainsOnData: bool`, `logRetentionDays: number` | Constraint filters. |
| `effortVariants` | list, e.g. `[low, medium, high]` | Effort recommendation. |
| `status` | `current`, `legacy`, `experimental` | Only `current` enters the candidate pool. |
| `evidence` | caps, price, source URL, `verifiedAt` | Kept in the file so reviewers can check the claim. |

### 3.2 Phase parameters

The canonical phase set is the union of every Gentle AI agent that carries a
model assignment across the supported runtimes (verified 2026-09-14 against
Pi, OpenCode, Claude Code, and Codex installs): 27 rows.

| Group | Phases | Default role |
|---|---|---|
| Orchestration | `gentle-orchestrator` | neutral, loop |
| SDD | `sdd-init`, `sdd-explore`, `sdd-research`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-remediate`, `sdd-verify`, `sdd-archive`, `sdd-onboard`, `sdd-status`, `sdd-sync` | `sdd-apply` and `sdd-remediate` are implementers; `sdd-verify` is a verifier; the rest neutral |
| Judgment Day | `jd-judge-a`, `jd-judge-b`, `jd-fix-agent` | judge-a, judge-b, implementer |
| Review | `review-risk`, `review-readability`, `review-reliability`, `review-resilience`, `review-refuter`, `review-validator` | verifiers |
| Workers | `gentle-ai-explore`, `gentle-ai-verify`, `gentle-ai-worker` | neutral, verifier, implementer |

No single runtime has all 27. Pi has 24, OpenCode 21, Claude Code 19, Codex
17, and Pi names one differently (`sdd-proposal`). Runtime presence and
naming live in per-runtime mappings (section 4), never in the engine.

| Parameter | Values | Purpose |
|---|---|---|
| `callPattern` | `one-shot`, `loop` | Snipers only in `one-shot`. |
| `weights` | map of strength → weight | Scoring. |
| `role` | `implementer`, `verifier`, `judge-a`, `judge-b`, `neutral` | Independence pass. |

### 3.3 Profiles

`HIGH`, `BALANCED`, `LEAN`. The profile level shifts scoring: HIGH weights
quality, LEAN weights `cheap`, BALANCED sits between.

### 3.4 Budget class derivation

Budget class is abstract. Each subscription derives it its own way:

| Subscription | Derivation |
|---|---|
| OpenCode Go | requests per 5 hours: sniper ≤199, semi 200–499, workhorse 500–5000, volume >5000 |
| OpenAI (ChatGPT via Codex) | plan tier and model family position (Sol / Terra / Luna) |
| OpenRouter | price per million tokens, bucketed |
| Mistral, Kimi coding plan | plan caps where published, price otherwise |

Thresholds live in the subscription file, not in code, so a re-tier is a data
PR. Each subscription declares a billing model, `capped` or `metered`, which
selects the derivation. Invariant 1 is a hard filter for both; the engine never
reasons about money (see ADR 0001).

### 3.5 Invariants

1. A `sniper` never enters a `loop` phase, as primary or fallback.
2. `sdd-verify`, `jd-judge-a`, and `jd-judge-b` reach the highest available
   rung of the independence ladder against the `sdd-apply` primary:
   lab-independent, then model-independent, then context-independent. Only
   the last rung produces a warning.
3. `jd-judge-b` climbs the same ladder against `jd-judge-a`.
   Tiebreak inside rung 1 for verifier and judge roles: prefer a lab that
   holds no other row in this profile (the untouched-lab preference).
4. Every row has at least two fallbacks.
5. Overrides must satisfy 1–4 or CI rejects the PR.

### 3.6 Effort rules

- `sniper` and `semi`: always `default`, every tier. Quota is the scarce
  resource.
- `workhorse` and `volume` in tier HIGH: `high` if the model lists that
  variant, otherwise `default`.
- BALANCED and LEAN: always `default`. LEAN saves by choosing cheaper models,
  never by degrading a model's reasoning.

## 4. Data model

All data is YAML under `data/`, validated by JSON Schema on CI.

```
data/
  subscriptions/<id>.yaml
  models/<subscription>/<model-id>.yaml
  phases/phases.yaml
  overrides/<tier>/<phase>.yaml
```

- **subscriptions/**: id, display name, provider prefix, budget derivation
  rule and thresholds, catalog source URL for the checker, plan tiers offered.
- **models/**: one file per model per subscription, fields from 3.1.
- **phases/**: the 27 canonical rows with fields from 3.2.
- **runtimes/**: one file per runtime (`opencode`, `pi`, `claude-code`,
  `codex`) with an agent map (runtime agent name → canonical phase, so Pi's
  `sdd-proposal` maps to `sdd-propose`; absent phases are simply not listed)
  and a prefix map (subscription provider prefix → runtime prefix, so
  `openai/` becomes `openai-codex/` on Pi). The exporter applies these; the
  engine never sees them.
- **overrides/**: keyed by tier and phase. Each entry carries `requires` (a
  list of subscription ids; the override applies when every one is present, a
  subset match), `model`, `effort`, `reason`, `author`, and `pr`. Overrides
  beat rules but still pass the independence pass. If the override's model was
  pruned by the user's constraints, it is skipped and the row's reason says
  so. Two entries for the same tier and phase must differ in specificity; the
  longer `requires` wins, and equal length is a CI error.

Rules live in code, not YAML, because they are logic with tests.

## 5. Rule engine

Package `packages/engine`. Pure TypeScript, zero runtime dependencies, no I/O.

```ts
resolveProfile({
  subscriptions: SubscriptionSelection[],   // id + Plan for capped ones
  tier: 'HIGH' | 'BALANCED' | 'LEAN',
  constraints: { clientCode: boolean; maxLogRetentionDays?: number },
  pins?: Partial<Record<Phase, ModelId>>,   // personal, URL-encoded
}): Profile
```

Per phase, in dependency order (implementers first):

1. **Candidate pool**: every `current` model across the chosen subscriptions.
   Constraints prune it (`clientCode` drops `trainsOnData`, retention limit
   drops the rest).
2. **Scoring**: weighted strengths per phase, shifted by tier. Budget class
   is a hard filter against call pattern, not a score. A model offered by two
   of the user's subscriptions is two candidates with distinct ids and Budget
   Classes. When both top a row: prefer the higher Budget Class for the
   phase's call pattern, then `capped` over `metered`, then the subscription
   already holding more rows in this profile. Emitted ids always carry the
   provider prefix.
3. **Override slot**: an override replaces the scored winner for that phase.
   A personal pin replaces both. Pins are the user's own, live only in the
   URL, and must name a model in the candidate pool; a pin outside the pool
   is reported and ignored. The independence pass still runs around a pin
   and warns if it lowers a rung.
4. **Independence pass**: climb the ladder per invariants 2 and 3. Prefer a
   different lab, then a different model in the same lab, then the same model.
   The reached rung goes into `reason`; only the last rung sets `warning`.
   Never a silent violation, never an empty row.
5. **Fallback chain**: the next survivors in score order, at least two and at
   most ten, same filters. A plain ordered list; the Gentle AI TUI has no
   conditional fallbacks. Verifier and judge fallbacks are validated against
   the apply primary and against apply's first fallback, the most likely
   runtime substitution. Conditional advice ("if apply falls to X, switch
   verify to Y") is emitted as a sentence in `reason`, never as engine logic.
   An empty chain is an error.

Output: `Profile` with 27 `ProfileRow`s, each `{ phase, primary, effort,
fallbacks, reasons, warnings, override?, pin? }`. `reasons` and `warnings`
are lists of typed factors, a code plus parameters (for example
`lab-independent`, `budget-fit`, `untouched-lab`, `override-applied`,
`pin-lowered-rung`, `context-independent`). The engine emits no prose and
no language. Consumers own the dictionary from code to sentence: the site in
English and Spanish, the CLI as it sees fit. The rendered list replaces the
hand-written "Razón" column.

## 6. Site

`apps/site`. Astro, static output, one React island for the picker. No
accounts, no server, no analytics. English and Spanish, neutral UI copy.

Flow:

1. **Pick**: subscription checkboxes, a Plan selector for each checked
   capped subscription (metered ones have none), tier toggle, two constraint
   switches. Selection encoded in the URL.
2. **Profile**: the 27 rows grouped as in 3.2, expandable for reason and
   warning, with a runtime filter that hides rows the chosen runtime lacks. Override
   rows carry a badge linking to the override PR. Each row can be pinned to
   any model in the pool; pins are personal, go in the URL, and show a badge
   plus any warning the pin caused.
3. **Take it home**: three tabs.
   - **Files**: zip with (a) an OpenCode JSON fragment of the
     `sdd-{phase}-{profile}` agent entries for every phase OpenCode has, in
     the exact shape Gentle AI generates (`model`, `variant`), with fallback
     chains in a sidecar file because the agent entry has no fallback field;
     (b) Pi agent markdown files with `model:` frontmatter for every phase Pi
     has, under Pi's names and prefixes; (c) the
     `gentle-ai sync --profile name:provider/model` invocation for the
     orchestrator. Gentle AI has no profile import format; none is promised.
   - **Prompt**: one copyable text block that embeds the resolved profile as
     JSON, names the bundle hash it came from, and tells the harness which
     files to generate for its own runtime.
   - **CLI**: the future `gentle-ai` subcommand, greyed "coming soon" until
     that PR lands.

Distribution: the site publishes inputs, not outputs. One validated
`data.json` bundle (subscriptions, models, phases, overrides) with a content
hash, and the engine as an npm package. The browser island and the future
Gentle AI CLI both download the bundle and run the engine locally, so any
subscription mix, Plan, tier, constraint, or pin resolves on demand. A handful
of featured combos are prebuilt as static examples for the landing page. The
bundle hash is the freshness signal: "computed from catalog `a1b2c3`".

Secondary pages: **Models** (browsable catalog with classification and
evidence) and **Contribute** (how to open an override or classification PR).

## 7. Checker

`packages/checker`, run by `.github/workflows/checker.yml` on a weekly cron
and by hand with a subscription filter.

1. **Fetch**: one adapter per subscription returns a normalized catalog. Go
   reads the Zen models endpoint. OpenAI, Mistral, Kimi, OpenRouter read their
   public model lists. models.dev is the fallback when an API needs a key.
2. **Diff** against `data/models/`: new, changed evidence, vanished. Nothing
   found means silent exit.
3. **Draft**: new models only. LLM call with the schema, provider evidence,
   and three same-subscription examples. Response validated against the schema
   before becoming YAML. Changed evidence updates the evidence block only;
   strengths, lab, and privacy flags are never touched by the checker. Budget
   Class is derived, never stored, so an evidence change can re-tier a model.
   The PR body must state every re-tier it causes and the rows it affects,
   so the reviewer approves the consequence, not just the number.
4. **Verify**: run the engine test suite against the proposed data. Failures
   go in the PR body.
5. **PR**: one per run, one commit per model, checklist in the body (lab,
   budget class, privacy flags confirmed). Vanished models are proposed as
   `status: legacy`, never deleted.

Secrets: the LLM API key only.

## 8. Repository layout

```
data/              YAML data + JSON schemas
packages/engine    pure TS, published later as @gentle-ai/profile-engine
packages/checker   adapters, LLM draft, PR opener
apps/site          Astro + React island
docs/              this spec and future ADRs
.github/workflows  ci.yml (schema + tests + build), checker.yml (cron)
```

pnpm workspaces.

**Ownership and hosting.** The repo starts under the author's GitHub account,
public from day one; transfer to the Gentleman-Programming org is an explicit
later step once maintainers want it. Hosting is GitHub Pages from the same
repo, so the JSON endpoint shares the site's origin. The checker's LLM key is
a repo secret held by the author; the draft step sits behind one interface so
provider and model are a config line.

## 9. Error handling

| Case | Behavior |
|---|---|
| Data fails schema | CI blocks PR, names file and field |
| Independence unsatisfiable | Row ships with warning and best pick |
| No `current` model for a phase in the combo | Row says so, suggests cheapest subscription that fills it |
| One checker adapter fails | Run continues, PR body lists skipped providers |
| LLM draft invalid | Model lands as "unclassified, needs human" stub |

## 10. Testing

- **Engine**: property tests for every invariant over generated catalogs, plus
  scenario tests on small hand-written catalogs that pin rule behavior (a
  sniper never lands in a loop; a single-lab catalog reaches rung 2; a
  cheaper equal-strength model wins in LEAN). The two source documents are
  NOT golden outputs. They were valid for the catalog of their date; the
  engine must place newer models by the same rules. The documents contribute
  the initial classification of the models they list and the invariants,
  nothing else.
- **Checker**: adapters tested against recorded fixtures; no live calls in CI.
- **Site**: build succeeds for every launch combo; picker URL round-trips.

## 11. Order of construction

1. Data schema and the OpenCode Go catalog, classified from the source
   documents' evidence and re-verified against the live catalog.
2. Engine with invariant and scenario tests.
3. Site.
4. Checker.

## 12. Out of scope

- The `gentle-ai` CLI subcommand (follow-up PR to Gentle AI).
- User accounts, saved combos, telemetry.
- Subscriptions beyond the five launch ones (they join via checker and PRs).
- Re-tiering a model without a reviewed PR. Re-tiering through an approved
  evidence change is in scope by design.
