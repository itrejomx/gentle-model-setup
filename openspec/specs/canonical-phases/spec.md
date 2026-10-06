# Canonical Phases Specification

## Purpose

Encode the 13 canonical Gentle AI phases — the Gentle AI 4.0 (ODD) roster,
the union of every phase that carries a model assignment across Pi, OpenCode,
Claude Code, and Codex — as one validated data file the engine and every
runtime mapping reference by name.

## Requirements

### Requirement: Exactly 13 phases

`data/phases/phases.yaml` MUST contain exactly 13 phase entries, with these
ids: `gentle-orchestrator`, `jd-judge-a`, `jd-judge-b`, `jd-fix-agent`,
`review-risk`, `review-readability`, `review-reliability`,
`review-resilience`, `review-refuter`, `review-validator`,
`gentle-ai-explore`, `gentle-ai-verify`, and `gentle-ai-worker`.

#### Scenario: The committed file has 13 entries

- GIVEN `data/phases/phases.yaml` as committed
- WHEN the loader counts phase entries
- THEN the count is exactly 13

#### Scenario: A missing or extra phase fails naming the file

- GIVEN a proposed edit that removes one phase entry, leaving 12
- WHEN the file is validated
- THEN validation fails, naming `phases.yaml` and stating the expected count
  of 13

#### Scenario: No retired sdd phase remains

- GIVEN `data/phases/phases.yaml` as committed
- WHEN its phase ids are inspected
- THEN no id starts with `sdd-`, because Gentle AI 4.0 retired SDD

### Requirement: Four phase groups

Every phase entry MUST declare a `group` of `orchestration`,
`judgment-day`, `review`, or `workers`. `orchestration` holds
`gentle-orchestrator`; `judgment-day` holds `jd-judge-a`, `jd-judge-b`, and
`jd-fix-agent`; `review` holds the six `review-*` phases; `workers` holds
`gentle-ai-explore`, `gentle-ai-verify`, and `gentle-ai-worker`.

#### Scenario: Each phase sits in its group

- GIVEN the committed `phases.yaml`
- WHEN each entry's `group` is inspected
- THEN the groups match the assignment above, with 1, 3, 6, and 3 phases

#### Scenario: A retired group value fails naming the field

- GIVEN a phase entry with `group: sdd`
- WHEN the file is validated
- THEN validation fails naming `phases.yaml` and the `group` field

### Requirement: Complete per-phase fields

Every phase entry MUST declare `callPattern` (`one-shot` | `loop`), a
`weights` map covering all six strength axes, and `role` (`implementer` |
`verifier` | `judge-a` | `judge-b` | `neutral`).

#### Scenario: gentle-orchestrator is a neutral loop

- GIVEN the `gentle-orchestrator` phase entry
- WHEN it is inspected
- THEN `callPattern: loop` and `role: neutral`

#### Scenario: gentle-ai-worker is the implementer loop

- GIVEN the `gentle-ai-worker` phase entry
- WHEN it is inspected
- THEN `callPattern: loop` and `role: implementer`, because the worker
  iterates test-first inside each delegated task and consumes requests in a
  burst (ADR 0001)

#### Scenario: Only the orchestrator and the worker are loop phases

- GIVEN all 13 phase entries
- WHEN the entries with `callPattern: loop` are collected
- THEN they are exactly `gentle-orchestrator` and `gentle-ai-worker`

#### Scenario: A phase entry missing weights fails naming the field

- GIVEN a phase entry for `jd-judge-b` with no `weights` map
- WHEN the entry is validated
- THEN validation fails naming `phases.yaml` and the `jd-judge-b` entry's
  missing `weights` field

### Requirement: Role assignment matches the design record

Role assignment MUST follow the design spec's phase table: `gentle-orchestrator`
and `gentle-ai-explore` are `neutral`; `jd-judge-a` and `jd-judge-b` are
`judge-a` and `judge-b`; `jd-fix-agent` and `gentle-ai-worker` are
`implementer`; the six `review-*` phases and `gentle-ai-verify` are
`verifier`.

#### Scenario: gentle-ai-worker is an implementer

- GIVEN the `gentle-ai-worker` phase entry
- WHEN it is inspected
- THEN `role: implementer`

#### Scenario: Every review phase is a verifier

- GIVEN the six `review-*` phase entries and `gentle-ai-verify`
- WHEN their roles are inspected
- THEN each is `role: verifier`

#### Scenario: A neutral phase does not claim a special role

- GIVEN the `gentle-ai-explore` phase entry
- WHEN it is inspected
- THEN `role: neutral`, not `implementer`, `verifier`, `judge-a`, or
  `judge-b`
