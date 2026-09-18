# Data Loader Specification

## Purpose

Load and validate every YAML collection under `data/` in `packages/data`,
report schema failures naming file and field, produce a friendly Strength-3
error naming the violating axis, and derive Budget Class per Plan without
persisting it, keeping the future `packages/engine` free of I/O (ADR 0001).

## Requirements

### Requirement: Schema-validated loading

The loader MUST validate every YAML file against its matching JSON Schema
before returning typed data, and MUST report the file path and the failing
field path when validation fails.

#### Scenario: A valid data tree loads

- GIVEN a `data/` tree where every subscription, model, phase, and runtime
  file matches its schema
- WHEN the loader runs
- THEN it returns typed collections with no reported errors

#### Scenario: A wrong field type names file and field

- GIVEN a model file with `strengths.longContext` set to a string instead of
  a number
- WHEN the loader runs
- THEN it fails, naming the model file's path and the `strengths.longContext`
  field

### Requirement: Strength-3 evidence check

The loader MUST reject a model whose strength value is `3` on any axis
lacking a non-empty evidence string for that axis, and the error MUST name
the specific axis.

#### Scenario: Evidence present for a 3 passes

- GIVEN a model file with `strengths.codingTools: 3` and a matching
  `evidence.codingTools` string
- WHEN the loader validates the model
- THEN validation succeeds

#### Scenario: Evidence missing for a 3 names the axis

- GIVEN a model file with `strengths.multimodal: 3` and no
  `evidence.multimodal` entry
- WHEN the loader validates the model
- THEN it fails with an error naming `multimodal` as the violating axis, not
  a generic schema error

### Requirement: Budget Class derivation, never storage

For a capped subscription, the loader MUST derive a model's Budget Class per
Plan from the subscription's `requestsPer5h` thresholds, and the model file
MUST NOT contain a Budget Class field.

#### Scenario: A model derives to workhorse

- GIVEN a subscription with thresholds `sniper < 200`, `semi < 500`,
  `workhorse <= 5000`, `volume > 5000`, and a model whose `plans.go`
  states `requestsPer5h: 1350`
- WHEN the loader derives Budget Class for that model on that Plan
- THEN the derived Budget Class is `workhorse`

#### Scenario: A model file declaring Budget Class fails

- GIVEN a model file with a `budgetClass` field present
- WHEN the loader validates the model against its schema
- THEN validation fails, since Budget Class MUST be derived, never stored
  (ADR 0001)

### Requirement: Pure, I/O-free derivation logic

The Budget Class derivation function MUST take only evidence and thresholds
as arguments and MUST NOT perform file or network I/O, so it can be reused
unchanged by the future `packages/engine`.

#### Scenario: Derivation runs without a filesystem

- GIVEN threshold values and a `requestsPer5h` number supplied as plain
  arguments
- WHEN the derivation function is called directly in a unit test with no
  file access
- THEN it returns a Budget Class with no I/O performed

#### Scenario: Thresholds change without touching derivation code

- GIVEN a subscription file whose `workhorse` upper threshold changes from
  `5000` to `6000`
- WHEN the loader re-reads the subscription file
- THEN the derivation function's behavior changes for models near that
  boundary without any code edit
