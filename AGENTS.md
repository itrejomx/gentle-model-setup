# Code review rules

Rules for reviewing changes in this repository. Review only the staged change. Fail a change
only for a violation of a rule below that the change itself introduces; report anything else as
a suggestion.

## Domain language

- `CONTEXT.md` is the glossary. Identifiers, comments, error messages, and docs use its terms and
  never the words it lists under _Avoid_ (for example: Phase, never agent or step; Subscription,
  never provider or account; Budget Class, never tier or cap).
- Code, comments, test names, error messages, and docs are written in English.

## Architecture

- Budget Class is derived in data, from each subscription's own thresholds
  (`docs/adr/0001-budget-class-is-data-not-money.md`). No code outside that derivation reasons
  about prices, money, or raw caps.
- Budget Class derives from a plan's base cap. A promo multiplier never changes it.
- `packages/data` is a library with thin CLI entrypoints. CLI logic lives in a function that takes
  arguments and streams and returns an exit code; the entrypoint only wires `process` to it.
- Runtime Mappings are data applied by exporters. Nothing in `packages/data` branches on a
  specific runtime id.

## TypeScript

- The compiler options in `tsconfig.base.json` stay as strict as they are: `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- No `any`, no `as any`, and no non-null assertion that hides a real `undefined` case. Narrow
  unknown input instead.
- ESM with `nodenext` resolution: relative imports carry the `.js` extension, and type-only
  imports use `import type`.
- No new runtime dependency without a stated reason in the change.

## Security

- `packages/data` never imports `child_process` and never uses `exec`, `eval`, `new Function`, or
  shell interpolation. A CLI path argument is only ever a literal filesystem path.
- File reads stay inside the data root they were given. YAML is parsed with the existing loader
  and its limits; no second parser or relaxed options.
- `.github/workflows/*` trigger on `pull_request` only, never `pull_request_target`, declare
  `permissions: contents: read`, use no secrets, and pin actions to a major version tag.
- Files under `data/` hold public information only: no private hostnames, account names, tokens,
  or local paths.

## Determinism

- Canonical JSON and the bundle hash depend only on the payload. No `localeCompare`, no
  locale-, timezone-, clock-, or environment-dependent value, and no dependence on input order
  for the id-bearing collections.
- Sorting used for hashing is a total order: tied keys have an explicit tie-break.

## Errors

- Data problems surface as the typed errors in `packages/data/src/errors.ts`. New code does not
  throw a bare `Error` for a data or file problem, and does not let a raw `fs` or `SyntaxError`
  escape the loader.
- Validation never degrades silently. A reference that does not resolve (a model's Subscription,
  a Runtime Mapping's Phase id, a provider prefix) is an integrity error, never a default value.
- Validation errors name the file and the offending field.
- CLI exit codes: `0` success, `1` validation failures, `2` usage or I/O error.

## Tests

- A behavior change comes with a test that would fail without it. A test that cannot fail, or
  that compares a value with a copy of the same derivation, is a defect.
- Tests read expectations from the data files or the schemas where they exist, not from
  hand-copied lists.
- Tests are deterministic: no dependence on the current date, the host locale, or network access.

## Commits

- Conventional Commits. No `Co-Authored-By` trailer and no AI attribution.
