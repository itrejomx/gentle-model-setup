# Data Schemas Specification

## Purpose

Define the five JSON Schemas (subscription, model, phases, override, runtime)
that validate every YAML collection under `data/`, so CI and the loader share
one structural contract.

## Requirements

### Requirement: Subscription schema

The subscription schema MUST require `id`, `displayName`, `providerPrefix`,
`billingModel` (enum `capped` | `metered`), a thresholds object, a
`catalogSourceUrl`, and `verifiedAt`.

#### Scenario: A valid Go subscription file passes

- GIVEN a subscription file declaring `billingModel: capped`,
  `providerPrefix: opencode-go`, thresholds, `catalogSourceUrl`, and
  `verifiedAt`
- WHEN the file is validated against the subscription schema
- THEN validation succeeds

#### Scenario: A missing billing model fails naming the field

- GIVEN a subscription file with no `billingModel` field
- WHEN the file is validated against the subscription schema
- THEN validation fails naming the file path and the `billingModel` field

### Requirement: Model schema

The model schema MUST require `lab`, six ordinal strength axes (each `0`-`3`),
privacy flags (`trainsOnData`, `logRetentionDays` nullable), `effortVariants`,
`status` (enum `current` | `legacy` | `experimental`), and a `plans` map. Any
strength axis valued `3` MUST require a non-empty `evidence` string for that
axis.

#### Scenario: A valid model file passes

- GIVEN a model file with all six strength axes, privacy flags, at least one
  effort variant, a status, and a `plans.go` entry
- WHEN the file is validated against the model schema
- THEN validation succeeds

#### Scenario: A Strength of 3 without evidence fails naming the axis

- GIVEN a model file with `strengths.codingTools: 3` and no evidence for
  `codingTools`
- WHEN the file is validated against the model schema
- THEN validation fails naming the file path and the `codingTools` axis

### Requirement: Phases schema

The phases collection schema MUST require every entry to declare
`callPattern` (enum `one-shot` | `loop`), a `weights` map keyed by strength
axis, and `role` (enum `implementer` | `verifier` | `judge-a` | `judge-b` |
`neutral`).

#### Scenario: A valid phase entry passes

- GIVEN a phase entry with `callPattern: loop`, a `weights` map, and
  `role: implementer`
- WHEN the entry is validated against the phases schema
- THEN validation succeeds

#### Scenario: An unknown role value fails naming the field

- GIVEN a phase entry with `role: worker`
- WHEN the entry is validated against the phases schema
- THEN validation fails naming the file path and the `role` field, since
  `worker` is not in the enum

### Requirement: Override schema (structure only)

The override schema MUST require `requires` (a non-empty list of subscription
ids), `model`, `effort`, `reason`, `author`, and `pr`, even though no override
data ships in this change.

#### Scenario: A future override file validates

- GIVEN an override file with `requires: [opencode-go]`, `model`, `effort`,
  `reason`, `author`, and `pr`
- WHEN the file is validated against the override schema
- THEN validation succeeds

#### Scenario: An override missing `requires` fails naming the field

- GIVEN an override file with no `requires` field
- WHEN the file is validated against the override schema
- THEN validation fails naming the file path and the `requires` field

### Requirement: Runtime schema

The runtime schema MUST require an `agentMap` (runtime agent name to
canonical phase) and a `prefixMap` (subscription provider prefix to runtime
prefix).

#### Scenario: A valid runtime mapping passes

- GIVEN a runtime file with a non-empty `agentMap` and `prefixMap`
- WHEN the file is validated against the runtime schema
- THEN validation succeeds

#### Scenario: A runtime file without a prefix map fails naming the field

- GIVEN a runtime file with `agentMap` but no `prefixMap`
- WHEN the file is validated against the runtime schema
- THEN validation fails naming the file path and the `prefixMap` field
