# Canonical Phases Specification

## Purpose

Encode the 27 canonical Gentle AI phases — the union of every phase across
Pi, OpenCode, Claude Code, and Codex — as one validated data file the engine
and every runtime mapping reference by name.

## Requirements

### Requirement: Exactly 27 phases

`data/phases/phases.yaml` MUST contain exactly 27 phase entries.

#### Scenario: The committed file has 27 entries

- GIVEN `data/phases/phases.yaml` as committed
- WHEN the loader counts phase entries
- THEN the count is exactly 27

#### Scenario: A missing or extra phase fails naming the file

- GIVEN a proposed edit that removes one phase entry, leaving 26
- WHEN the file is validated
- THEN validation fails, naming `phases.yaml` and stating the expected count
  of 27

### Requirement: Complete per-phase fields

Every phase entry MUST declare `callPattern` (`one-shot` | `loop`), a
`weights` map covering all six strength axes, and `role` (`implementer` |
`verifier` | `judge-a` | `judge-b` | `neutral`).

#### Scenario: sdd-apply is an implementer in a loop

- GIVEN the `sdd-apply` phase entry
- WHEN it is inspected
- THEN `callPattern: loop` and `role: implementer`

#### Scenario: A phase entry missing weights fails naming the field

- GIVEN a phase entry for `jd-judge-b` with no `weights` map
- WHEN the entry is validated
- THEN validation fails naming `phases.yaml` and the `jd-judge-b` entry's
  missing `weights` field

### Requirement: Role assignment matches the design record

Role assignment MUST follow the design spec's phase table: `sdd-apply` and
`sdd-remediate` are `implementer`; `sdd-verify` is `verifier`; `jd-judge-a`
and `jd-judge-b` are `judge-a` and `judge-b`; `jd-fix-agent` and
`gentle-ai-worker` are `implementer`; `gentle-ai-verify` is `verifier`; every
other phase is `neutral` unless it is a `review-*` verifier.

#### Scenario: sdd-verify is a verifier

- GIVEN the `sdd-verify` phase entry
- WHEN it is inspected
- THEN `role: verifier`

#### Scenario: An unassigned neutral phase does not claim a special role

- GIVEN the `gentle-orchestrator` phase entry
- WHEN it is inspected
- THEN `role: neutral`, not `implementer`, `verifier`, `judge-a`, or
  `judge-b`
