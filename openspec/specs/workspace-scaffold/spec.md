# Workspace Scaffold Specification

## Purpose

Establish the pnpm monorepo root so later packages and apps (engine, checker,
site) can join without editing the workspace file, while this change creates
only `packages/data`.

## Requirements

### Requirement: Workspace globbing

The root `pnpm-workspace.yaml` MUST declare `packages` globs `packages/*` and
`apps/*`.

#### Scenario: A future package joins without a workspace edit

- GIVEN `pnpm-workspace.yaml` globs `packages/*` and `apps/*`
- WHEN a later change adds `packages/engine` with its own `package.json`
- THEN `pnpm install` includes it as a workspace member without any edit to
  `pnpm-workspace.yaml`

#### Scenario: Only the data package exists in this change

- GIVEN this change's file set
- WHEN `pnpm -r list` runs after install
- THEN `packages/data` is the only listed workspace member, and no stub for
  `packages/engine`, `packages/checker`, or `apps/site` exists

### Requirement: Root scripts and engine constraint

The root `package.json` MUST declare `validate`, `build`, and `test` scripts,
and MUST declare a Node engine constraint of `>=22`.

#### Scenario: CI invokes the documented scripts

- GIVEN the root `package.json`
- WHEN CI runs `pnpm validate`, `pnpm test`, and `pnpm build`
- THEN each script resolves to a defined command and exits zero on a valid
  workspace

#### Scenario: An unsupported Node version is rejected

- GIVEN the root `package.json` declares `engines.node: ">=22"`
- WHEN `pnpm install` runs under Node 20
- THEN pnpm reports an engine mismatch instead of silently installing

### Requirement: Shared TypeScript configuration

The root `tsconfig.base.json` MUST enable `strict` mode and MUST be
referenced by every workspace member's own `tsconfig.json`.

#### Scenario: Strict mode catches an implicit any

- GIVEN `packages/data` extends `tsconfig.base.json`
- WHEN a source file declares a parameter without a type and without a
  default
- THEN `tsc` fails under `noImplicitAny`

#### Scenario: A later package inherits the base config

- GIVEN `tsconfig.base.json` exists at the workspace root
- WHEN a later change adds `packages/engine/tsconfig.json` extending it
- THEN `packages/engine` compiles under the same strict rules without
  redeclaring them

### Requirement: No premature package stubs

Workspace members with no real test-backed logic MUST NOT be scaffolded in
this change.

#### Scenario: Engine, checker, and site are absent

- GIVEN this change's scope is limited to `packages/data`
- WHEN the repository tree is inspected after this change lands
- THEN `packages/engine`, `packages/checker`, and `apps/site` do not exist

#### Scenario: A stub package would fail review

- GIVEN a reviewer inspects a proposed diff for this change
- WHEN the diff includes an empty `packages/engine` directory with no tests
- THEN the diff violates this requirement and MUST be rejected
