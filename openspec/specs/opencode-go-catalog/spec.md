# OpenCode Go Catalog Specification

## Purpose

Encode the OpenCode Go subscription and its 29-model catalog (28 models from
the live 2026-09-14 documentation plus `grok-4.5`, tracked as `legacy`
pending changelog confirmation) as validated data, with source evidence
committed as repo fixtures.

## Requirements

### Requirement: Subscription declaration

`data/subscriptions/opencode-go.yaml` MUST declare `billingModel: capped`, a
`plans` list containing `go`, `requestsPer5h` thresholds of `sniper < 200`,
`semi < 500`, `workhorse <= 5000`, `volume > 5000`, a `catalogSourceUrl`, and
a `verifiedAt` date.

#### Scenario: Subscription file validates and derives correctly

- GIVEN `opencode-go.yaml` as specified
- WHEN the loader validates it and derives Budget Class for a model with
  `requestsPer5h: 220`
- THEN validation succeeds and the derived class is `semi`

#### Scenario: A threshold gap fails naming the file

- GIVEN a proposed edit to `opencode-go.yaml` that removes the `workhorse`
  upper bound
- WHEN the file is validated
- THEN validation fails, naming `opencode-go.yaml` and the missing threshold
  field

### Requirement: Full catalog coverage

`data/models/opencode-go/` MUST contain exactly 29 model files, each with
`lab`, all six strength axes, privacy flags (`trainsOnData`,
`logRetentionDays` or `null` for unpublished), at least one effort variant,
`status`, and a `plans.go` block carrying evidence and `verifiedAt`.

#### Scenario: Every model file validates

- GIVEN the 29 committed model files
- WHEN each is validated against the model schema
- THEN all 29 pass with no missing required field

#### Scenario: A missing model field fails naming file and field

- GIVEN a model file for `kimi-k3` with no `lab` field
- WHEN validation runs
- THEN it fails naming `kimi-k3.yaml` and the `lab` field

### Requirement: Status classification matches evidence

Models absent from or re-tiered against the 2026-08-19 source document MUST
carry `status: legacy` or `status: experimental` per the research record,
never `status: current` without live-catalog confirmation.

#### Scenario: A current model matches the live table

- GIVEN `kimi-k3` appears in the live `docs/go` table with a stable cap
- WHEN its model file is inspected
- THEN `status: current`

#### Scenario: grok-4.5 is tracked as legacy pending confirmation

- GIVEN `grok-4.5` is absent from the live table while `grok-4.6` appears,
  with no changelog confirming a rename
- WHEN `grok-4.5`'s model file is inspected
- THEN `status: legacy`, not `current` or silently dropped

### Requirement: Unpublished privacy evidence

An experimental model with `trainsOnData: true` and no published retention
value MUST declare `logRetentionDays: null`, never a guessed number.

#### Scenario: Muse Spark Contributor models declare null retention

- GIVEN `muse-spark-1.2-contributor` and `muse-spark-1.3-contributor` have no
  published retention days
- WHEN their model files are inspected
- THEN both declare `trainsOnData: true` and `logRetentionDays: null`

#### Scenario: A guessed retention value fails review

- GIVEN a proposed model file sets `logRetentionDays: 0` for a model with no
  published retention evidence
- WHEN the file is reviewed against its cited source
- THEN the value is rejected as unsupported by evidence

### Requirement: Source fixtures committed

Both source documents MUST be committed as pandoc-converted GFM markdown
fixtures under `data/sources/`, used as classification evidence, not as
golden output.

#### Scenario: Fixtures are present and readable

- GIVEN the two source docx files converted with `pandoc -t gfm`
- WHEN a contributor opens `data/sources/`
- THEN both converted markdown files are present in the repository

#### Scenario: A newer catalog does not require touching fixtures

- GIVEN the live catalog changes after this change lands
- WHEN a maintainer re-verifies against `docs/go`
- THEN only model YAML files and `verifiedAt` values change; the historical
  source fixtures remain untouched as a dated record
