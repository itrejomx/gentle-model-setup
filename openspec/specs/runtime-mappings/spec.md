# Runtime Mappings Specification

## Purpose

Encode per-runtime data — which canonical phases a runtime has, what it
calls them, and how it spells provider prefixes — so exporters translate
without the engine ever seeing runtime detail.

## Requirements

### Requirement: One file per supported runtime

`data/runtimes/` MUST contain one file each for `pi`, `opencode`,
`claude-code`, and `codex`, each declaring an `agentMap` and a `prefixMap`.

#### Scenario: All four runtime files exist and validate

- GIVEN the four committed runtime files
- WHEN each is validated against the runtime schema
- THEN all four pass

#### Scenario: A missing runtime file is a gap

- GIVEN only three of the four runtime files are committed
- WHEN CI validates the `data/runtimes/` directory
- THEN the missing runtime fails the change's success criteria, naming which
  runtime file is absent

### Requirement: Agent map entry counts match verified counts

Each runtime's `agentMap` MUST contain exactly the verified number of
entries: Pi 24, OpenCode 21, Claude Code 19, Codex 17.

#### Scenario: Pi's agent map has 24 entries

- GIVEN `data/runtimes/pi.yaml`
- WHEN its `agentMap` entries are counted
- THEN the count is exactly 24

#### Scenario: A wrong Claude Code count fails naming the file

- GIVEN `data/runtimes/claude-code.yaml` declares only 18 `agentMap` entries
- WHEN the file is validated against its expected count
- THEN validation fails, naming `claude-code.yaml` and stating the expected
  count of 19

### Requirement: Runtime-specific agent naming

An `agentMap` entry MUST map a runtime's own agent name to a canonical phase
name, even when the spellings differ.

#### Scenario: Pi's sdd-proposal maps to the canonical sdd-propose

- GIVEN `data/runtimes/pi.yaml`
- WHEN its `agentMap` is inspected
- THEN it contains an entry mapping runtime name `sdd-proposal` to canonical
  phase `sdd-propose`

#### Scenario: An absent runtime phase is simply omitted

- GIVEN a canonical phase that Codex's install does not carry
- WHEN `data/runtimes/codex.yaml`'s `agentMap` is inspected
- THEN that phase has no entry in the map, and this omission is not a
  validation error

### Requirement: Provider prefix translation

Each runtime's `prefixMap` MUST translate at least one subscription provider
prefix to that runtime's own spelling.

#### Scenario: Pi translates the OpenAI prefix

- GIVEN `data/runtimes/pi.yaml`
- WHEN its `prefixMap` is inspected
- THEN it maps provider prefix `openai` to runtime prefix `openai-codex`

#### Scenario: A runtime prefix map missing a required prefix fails

- GIVEN a runtime file whose `prefixMap` omits a prefix used by one of its
  mapped agents' subscriptions
- WHEN the exporter contract is checked at review time
- THEN the gap is flagged as an incomplete `prefixMap`, naming the missing
  provider prefix
