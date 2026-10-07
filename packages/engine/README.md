# @gentle-ai/profile-engine

Resolves a Profile from the data bundle: one row per Phase with a primary model, an effort, a
Fallback Chain, and typed Reason Factors. A pure function with zero runtime dependencies; it
imports only types from `@gentle-ai/profile-data` and does no I/O.

## Signature

```ts
resolveProfile(payload: BundlePayload, selection: Selection): Profile
```

`selection` holds the Subscriptions with their Plans, the Tier (`HIGH`, `BALANCED`, `LEAN`), and
the constraints (`clientCode`, optional `maxLogRetentionDays`). An unknown Subscription or Plan, or
a Subscription listed twice, throws `InvalidSelectionError`.

## Tier formula

A candidate's score is `sum(weight[axis] * strength[axis])` over the six axes with the Phase's
weights, where the Tier multiplies the `cheap` weight (HIGH 0, BALANCED 1, LEAN 3) and the weights
are renormalized to sum 1. Ties break by Budget Class fit for the call pattern, then the higher
`cheap` Strength, then the prefixed model id.

## Invariants

- A `sniper` never serves a `loop` Phase, as primary or fallback; an unknown Budget Class is
  ineligible for `loop`.
- A Fallback Chain holds at most ten entries and at least two when the pool has them; a shorter
  chain carries a `fallback-chain-short` warning.
- A Phase with no eligible model yields an empty row with a `pool-empty` reason and the
  Subscriptions that would fill it.
- Reasons and warnings are codes with parameters, never prose.
- The result does not depend on the order of the models in the payload.
- The engine sees Budget Class only, never a raw cap or a price (ADR 0001).

## Demo

Print the OpenCode Go Profile at each Tier:

```sh
pnpm build   # writes packages/data/build/data.json
pnpm --filter @gentle-ai/profile-engine demo [bundle-path]
```

Exit codes: `0` success, `1` the bundle fails `loadBundle`, `2` a usage error or a missing or
unreadable bundle. The demo (`src/cli`, `src/bin`) is the only code that imports the data package
at runtime.
