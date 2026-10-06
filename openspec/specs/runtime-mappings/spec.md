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
entries, verified 2026-10-06 against the Gentle AI 4.0 installs: Pi 10,
OpenCode 13, Claude Code 8, Codex 7. The Codex count is pending: its install
predates Gentle AI 4.0, and `data/runtimes/codex.yaml` MUST state in its
header that it awaits a `gentle-ai sync` for Codex.

#### Scenario: Pi's agent map has 10 entries

- GIVEN `data/runtimes/pi.yaml`
- WHEN its `agentMap` entries are counted
- THEN the count is exactly 10

#### Scenario: OpenCode maps all 13 phases

- GIVEN `data/runtimes/opencode.yaml`
- WHEN its `agentMap` values are inspected
- THEN they are exactly the 13 canonical phase ids, including
  `gentle-orchestrator` and `review-validator`, which no other runtime maps

#### Scenario: OpenCode's gentleman agent is not a phase

- GIVEN OpenCode's primary persona agent `gentleman`, which has no model of
  its own
- WHEN `data/runtimes/opencode.yaml`'s `agentMap` is inspected
- THEN it has no `gentleman` entry

#### Scenario: Codex is marked pending a sync

- GIVEN `data/runtimes/codex.yaml`
- WHEN its header and `agentMap` are inspected
- THEN the header states it awaits a `gentle-ai sync` for Codex, and the map
  holds the 7 non-`sdd` entries of the pre-4.0 install

#### Scenario: A wrong Claude Code count fails naming the file

- GIVEN `data/runtimes/claude-code.yaml` declares only 7 `agentMap` entries
- WHEN the file is validated against its expected count
- THEN validation fails, naming `claude-code.yaml` and stating the expected
  count of 8

### Requirement: Runtime-specific agent naming

An `agentMap` entry MUST map a runtime's own agent name to a canonical phase
name, even when the spellings differ.

#### Scenario: No runtime maps a retired sdd agent

- GIVEN the four runtime files
- WHEN each `agentMap` key and value is inspected
- THEN none starts with `sdd-`, and every value is one of the 13 canonical
  phase ids

#### Scenario: Every canonical phase is mapped by some runtime

- GIVEN the four committed runtime files
- WHEN the union of their `agentMap` values is taken
- THEN it equals the set of phase ids in `data/phases/phases.yaml`

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
