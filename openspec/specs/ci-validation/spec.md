# CI Validation Specification

## Purpose

Run a single GitHub Actions workflow on every pull request that installs,
validates, tests, and builds, so a broken data file or a broken loader never
merges.

## Requirements

### Requirement: Pull request trigger

`.github/workflows/ci.yml` MUST trigger on the `pull_request` event.

#### Scenario: Opening a pull request runs the workflow

- GIVEN a pull request is opened against the default branch
- WHEN GitHub Actions evaluates triggers
- THEN the `ci.yml` workflow runs

#### Scenario: A push with no pull request does not need the workflow to run

- GIVEN a commit is pushed directly to a feature branch with no open pull
  request
- WHEN GitHub Actions evaluates triggers
- THEN this requirement makes no claim about that push; only the
  `pull_request` trigger is required

### Requirement: Ordered install, validate, test, build steps

The workflow MUST run, in order, `pnpm install --frozen-lockfile`,
`pnpm validate`, `pnpm test`, and `pnpm build`.

#### Scenario: A clean pull request passes all four steps

- GIVEN a pull request that changes only documentation outside `data/`
- WHEN the workflow runs
- THEN install, validate, test, and build all succeed in order

#### Scenario: Validate runs before build

- GIVEN a pull request introduces a schema-invalid model file
- WHEN the workflow reaches the `pnpm validate` step
- THEN the workflow fails at validate and never reaches `pnpm build`

### Requirement: Invalid data blocks the pull request

The workflow MUST fail when any committed data file fails schema validation.

#### Scenario: A wrong field type blocks the merge

- GIVEN a pull request sets a strength axis to a string value
- WHEN CI runs
- THEN the `pnpm validate` step fails, and the pull request shows a failing
  check naming the file and field

#### Scenario: A Strength of 3 without evidence blocks the merge

- GIVEN a pull request adds a model with `strengths.cheap: 3` and no
  `evidence.cheap`
- WHEN CI runs
- THEN the `pnpm validate` step fails naming the model file and the `cheap`
  axis, and the pull request cannot merge
