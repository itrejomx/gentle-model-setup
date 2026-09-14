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
project ships a stable JSON endpoint per subscription combination; the CLI
subcommand is a follow-up PR to Gentle AI and is out of scope here.

## 3. Classification model

### 3.1 Model parameters

| Parameter | Values | Purpose |
|---|---|---|
| `lab` | `moonshot`, `zhipu`, `xai`, `openai`, `deepseek`, `alibaba`, `minimax`, `xiaomi`, `tencent`, `meta`, `mistral`, ... | Independence key. Versions of one lab count as one lab (Kimi K3 and K2.7 are both `moonshot`). |
| `budgetClass` | `sniper`, `semi`, `workhorse`, `volume` | Hard filter against call pattern. Derived per subscription (see 3.4). |
| `strengths` | scored set over `one-shot-reasoning`, `sustained-reasoning`, `coding-tools`, `long-context`, `multimodal`, `cheap` | Scoring input per phase. |
| `privacy` | `trainsOnData: bool`, `logRetentionDays: number` | Constraint filters. |
| `effortVariants` | list, e.g. `[low, medium, high]` | Effort recommendation. |
| `status` | `current`, `legacy`, `experimental` | Only `current` enters the candidate pool. |
| `evidence` | caps, price, source URL, `verifiedAt` | Kept in the file so reviewers can check the claim. |

### 3.2 Phase parameters

Fourteen rows in Gentle AI TUI order:
`gentle-orchestrator`, `sdd-init`, `sdd-explore`, `sdd-propose`, `sdd-spec`,
`sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-archive`,
`sdd-onboard`, `jd-judge-a`, `jd-judge-b`, `jd-fix-agent`.

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
| OpenCode Go | requests per 5 hours: sniper 100–199, semi 200–499, workhorse 500–5000, volume 5000+ |
| OpenAI (ChatGPT via Codex) | plan tier and model family position (Sol / Terra / Luna) |
| OpenRouter | price per million tokens, bucketed |
| Mistral, Kimi coding plan | plan caps where published, price otherwise |

Thresholds live in the subscription file, not in code, so a re-tier is a data
PR.

### 3.5 Invariants

1. A `sniper` never enters a `loop` phase, as primary or fallback.
2. `sdd-verify`, `jd-judge-a`, and `jd-judge-b` never share a lab with the
   `sdd-apply` primary.
3. `jd-judge-b` never shares a lab with `jd-judge-a`.
4. Every row has at least two fallbacks.
5. Overrides must satisfy 1–4 or CI rejects the PR.

## 4. Data model

All data is YAML under `data/`, validated by JSON Schema on CI.

```
data/
  subscriptions/<id>.yaml
  models/<subscription>/<model-id>.yaml
  phases/phases.yaml
  overrides/<combo>/<profile>.yaml
```

- **subscriptions/**: id, display name, provider prefix, budget derivation
  rule and thresholds, catalog source URL for the checker, plan tiers offered.
- **models/**: one file per model per subscription, fields from 3.1.
- **phases/**: the fourteen rows with fields from 3.2.
- **overrides/**: keyed by subscription combo, profile, and phase. Each entry
  carries `model`, `effort`, `reason`, `author`, and `pr`. Overrides beat rules
  but still pass the independence pass.

Rules live in code, not YAML, because they are logic with tests.

## 5. Rule engine

Package `packages/engine`. Pure TypeScript, zero runtime dependencies, no I/O.

```ts
resolveProfile({
  subscriptions: SubscriptionSelection[],
  profile: 'HIGH' | 'BALANCED' | 'LEAN',
  constraints: { clientCode: boolean; maxLogRetentionDays?: number },
}): Profile
```

Per phase, in dependency order (implementers first):

1. **Candidate pool**: every `current` model across the chosen subscriptions.
   Constraints prune it (`clientCode` drops `trainsOnData`, retention limit
   drops the rest).
2. **Scoring**: weighted strengths per phase, shifted by profile level. Budget
   class is a hard filter against call pattern, not a score.
3. **Override slot**: an override replaces the scored winner for that phase.
4. **Independence pass**: exclude labs per invariants 2 and 3. If the pool
   cannot satisfy them, the row ships with a `warning` and the best available
   pick. Never a silent violation, never an empty row.
5. **Fallback chain**: the next two or three survivors in score order, same
   filters. An empty chain is an error.

Output: `Profile` with fourteen `ProfileRow`s, each `{ phase, primary, effort,
fallbacks, reason, warning?, override? }`. `reason` is assembled from the
winning factors and replaces the hand-written "Razón" column.

## 6. Site

`apps/site`. Astro, static output, one React island for the picker. No
accounts, no server, no analytics. English and Spanish, neutral UI copy.

Flow:

1. **Pick**: subscription checkboxes, plan tier per checked one, profile
   toggle, two constraint switches. Selection encoded in the URL.
2. **Profile**: fourteen rows, expandable for reason and warning. Override
   rows carry a badge linking to the override PR.
3. **Take it home**: three tabs.
   - **Files**: zip with Gentle AI profile export, OpenCode agent JSON, Pi agent
     frontmatter.
   - **Prompt**: one copyable text block that tells the harness what to
     generate and points at the JSON endpoint and schema.
   - **CLI**: the future `gentle-ai` subcommand, greyed "coming soon" until
     that PR lands.

Build time: the engine runs for every shipped combo and writes
`/api/profiles/<combo-hash>.json`. The island recomputes live only on toggle.

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
   before becoming YAML. Changed evidence updates the evidence block only,
   never the classification.
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

## 9. Error handling

| Case | Behavior |
|---|---|
| Data fails schema | CI blocks PR, names file and field |
| Independence unsatisfiable | Row ships with warning and best pick |
| No `current` model for a phase in the combo | Row says so, suggests cheapest subscription that fills it |
| One checker adapter fails | Run continues, PR body lists skipped providers |
| LLM draft invalid | Model lands as "unclassified, needs human" stub |

## 10. Testing

- **Engine**: property tests for every invariant; the two source documents
  (Go-only v2.2 and ChatGPT + Go rev 2) become golden fixtures. The Go-only
  HIGH profile must reproduce from data alone before anything else is built.
- **Checker**: adapters tested against recorded fixtures; no live calls in CI.
- **Site**: build succeeds for every launch combo; picker URL round-trips.

## 11. Order of construction

1. Data schema and the OpenCode Go catalog.
2. Engine with golden tests.
3. Site.
4. Checker.

## 12. Out of scope

- The `gentle-ai` CLI subcommand (follow-up PR to Gentle AI).
- User accounts, saved combos, telemetry.
- Subscriptions beyond the five launch ones (they join via checker and PRs).
- Automatic re-tiering of existing models.
