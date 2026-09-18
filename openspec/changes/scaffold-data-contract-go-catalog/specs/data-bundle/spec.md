# Data Bundle Specification

## Purpose

Build a single content-hashed `data.json` from the validated collections, so
any consumer — the future engine, site, or CLI — can verify it was not
corrupted and can name which catalog version it used.

## Requirements

### Requirement: Canonical JSON before hashing

The build MUST canonicalize the payload (object keys sorted, arrays ordered
by id, no timestamps inside the hashed payload) before computing the hash.

#### Scenario: Sorted keys produce a stable payload

- GIVEN the same source data loaded twice with filesystem glob order varying
  between runs
- WHEN the build canonicalizes the payload both times
- THEN the two canonical JSON strings are byte-identical

#### Scenario: A build timestamp inside the payload is rejected

- GIVEN a proposed change that adds a `builtAt` field inside the hashed
  payload
- WHEN the bundle format is reviewed against this requirement
- THEN the change is rejected, since a timestamp inside the payload would
  break identical-data-identical-hash

### Requirement: SHA-256 hash outside the payload

The build MUST compute a SHA-256 hash over the canonical JSON and MUST place
the `hash` field outside the hashed payload in `data.json`.

#### Scenario: data.json carries hash and payload

- GIVEN a successful `pnpm build`
- WHEN `data.json` is inspected
- THEN it contains a top-level `hash` field and the `subscriptions`,
  `models`, `phases`, `overrides`, `runtimes` collections

#### Scenario: Overrides collection is empty in this change

- GIVEN this change ships no override data
- WHEN `data.json` is inspected
- THEN `overrides` is an empty array, and the bundle still validates and
  hashes successfully

### Requirement: Deterministic hash for identical data

Running the build twice against unchanged source data MUST yield an
identical hash.

#### Scenario: Two consecutive builds match

- GIVEN no source file under `data/` changed between builds
- WHEN `pnpm build` runs twice
- THEN both `data.json` files report the same `hash` value

#### Scenario: A single field change alters the hash

- GIVEN one model file's `verifiedAt` value changes
- WHEN `pnpm build` runs again
- THEN the resulting hash differs from the previous build's hash

### Requirement: loadBundle() verifies on read

`loadBundle()` MUST re-hash the payload it reads and MUST reject the bundle
when the recomputed hash does not match the stored `hash`.

#### Scenario: A valid bundle round-trips

- GIVEN a `data.json` produced by `pnpm build`
- WHEN `loadBundle()` reads it
- THEN it returns the parsed collections with no error, and the recomputed
  hash matches the stored `hash`

#### Scenario: A tampered bundle is rejected

- GIVEN a `data.json` whose `models` array was edited after the build without
  recomputing the hash
- WHEN `loadBundle()` reads it
- THEN it rejects the bundle, reporting a hash mismatch instead of returning
  the tampered data
