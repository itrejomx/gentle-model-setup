# PRD: Model Profile Site

**Date:** 2026-09-14
**Source:** brainstorming and grill sessions of 2026-09-14
**Design spec:** `docs/superpowers/specs/2026-09-14-model-profile-site-design.md`
**Glossary:** `CONTEXT.md`
**ADRs honored:** 0001 (Budget Class is derived in data; the engine never reasons about money)

## Problem Statement

I use Gentle AI with several AI coding subscriptions. Every Gentle AI Phase
(the SDD steps, the Judgment Day judges, the reviewers, the workers) needs a
model, and picking well depends on things I have to hold in my head: which
models my Subscriptions and Plans actually expose, how much quota each one
carries, which ones run out after a hundred requests, which Lab trained
which model so my verifier isn't grading its own sibling, and which models
train on my clients' code.

Today that knowledge lives in hand-written documents, one per Subscription
combination. They were right on the day they were written and wrong a month
later, because providers ship new models, cut caps, and re-price constantly.
When I get a new Subscription, or a provider adds a model, I have nothing
that tells me where it belongs. I copy rows into the Gentle AI TUI by hand,
and I have no way to share a good setup with the community except by
writing another document that will also go stale.

## Solution

A public site where I tick the Subscriptions I hold, pick the Plan on each
capped one, choose a Tier (HIGH, BALANCED, LEAN), flip two privacy
constraints, and get a complete Profile: one row per Phase with a primary
model, its effort, a Fallback Chain, and a plain-language reason. I can Pin
any row to a model of my choice and the site tells me if that Pin weakens
Independence. I take the Profile home as drop-in files for OpenCode and Pi,
as a prompt I paste into whatever harness I use, or later as a Gentle AI
CLI command.

The recommendations come from explicit rules applied to a classified model
catalog, with community Overrides layered on top through pull requests. A
scheduled checker watches every Subscription's catalog, drafts a
classification for each new model, and opens a pull request that a
maintainer approves. Nothing reaches users without a human merging it. The
rules are the asset; the numbers are data that a checker keeps fresh.

## User Stories

### Subscriber: picking

1. As a subscriber, I want to tick the Subscriptions I hold from a list of the five supported at launch, so that recommendations only include models I can actually call.
2. As a subscriber, I want to pick a Plan for each capped Subscription I tick, so that models and quotas I don't have on my Plan are excluded.
3. As a subscriber with a metered Subscription, I want no Plan question asked, so that the picker doesn't ask me something that doesn't apply.
4. As a subscriber, I want to choose a Tier (HIGH, BALANCED, LEAN), so that the Profile matches whether I'm shipping to production or hacking on a side project.
5. As a subscriber, I want to switch on a "client code" constraint, so that no model that trains on my data ever appears in my Profile.
6. As a subscriber, I want to set a maximum log retention in days, so that models that keep my prompts longer than that are excluded.
7. As a subscriber, I want the Profile to recompute instantly when I change any input, so that I can explore trade-offs without waiting.
8. As a subscriber, I want my whole selection encoded in the URL, so that I can bookmark it and share it with a teammate.
9. As a subscriber, I want to open a shared URL and see exactly the Profile the sender saw, so that we're discussing the same thing.
10. As a subscriber, I want the picker to work on my phone, so that I can check a recommendation away from my desk.
11. As a subscriber, I want the site in English or Spanish, so that I can read reasons in my language.

### Subscriber: reading the Profile

12. As a subscriber, I want one row per Phase, grouped as orchestration, SDD, Judgment Day, review, and workers, so that I can find the Phase I care about.
13. As a subscriber, I want each row to show the primary model with its provider prefix, so that I can paste the exact id my runtime expects.
14. As a subscriber, I want each row to show the recommended effort, so that I know whether to force high reasoning or leave the default.
15. As a subscriber, I want each row to show its Fallback Chain in order, so that I can fill the fallback slots in the Gentle AI TUI without guessing.
16. As a subscriber, I want to expand a row and read why the model was chosen, so that I can trust or challenge the pick.
17. As a subscriber, I want to see which Independence rung a verifier or judge reached, so that I know whether it's checking work from another Lab, another model, or only a fresh context.
18. As a subscriber, I want a visible warning when a row could only reach the context-independent rung, so that I don't mistake a weak setup for a strong one.
19. As a subscriber, I want to see when a row came from a community Override, with a link to the pull request, so that I know it's an opinion someone argued for.
20. As a subscriber, I want to see when a row was skipped by an Override because my constraints excluded its model, so that I understand why my Profile differs from the community's.
21. As a subscriber, I want a row to tell me when no model in my selection can serve a Phase, and which Subscription would fill it cheapest, so that I know what to add.
22. As a subscriber, I want to filter the rows to the runtime I use, so that I only see Phases that exist in Pi, OpenCode, Claude Code, or Codex.
23. As a subscriber, I want to know which catalog version my Profile came from and when it was verified, so that I can judge how fresh it is.

### Subscriber: Pins

24. As a subscriber, I want to Pin any row to any model in my candidate pool, so that I can keep everything else and swap one Phase I have an opinion about.
25. As a subscriber, I want a Pin to survive in the URL, so that my hand-tuned Profile is shareable and bookmarkable.
26. As a subscriber, I want the site to warn me when my Pin lowers an Independence rung, so that I know what I traded away.
27. As a subscriber, I want the site to refuse a Pin to a model outside my pool and say why, so that I don't Pin a model my Subscriptions can't reach.
28. As a subscriber, I want to clear one Pin or all Pins, so that I can return to the rule-based Profile.

### Subscriber: taking it home

29. As an OpenCode user, I want a JSON fragment of the agent entries in the exact shape Gentle AI generates, so that I can merge it into my configuration without editing by hand.
30. As an OpenCode user, I want the Fallback Chains in a sidecar file, so that I have them to enter in the TUI even though the agent entry has no field for them.
31. As a Pi user, I want one agent markdown file per Phase Pi has, with the model in frontmatter and Pi's own names and prefixes, so that I can drop them into my agents folder.
32. As a Gentle AI user, I want the `gentle-ai sync --profile` command for the orchestrator, so that I can create the named profile with the one CLI surface that exists today.
33. As any harness user, I want a single copyable prompt that embeds my resolved Profile and tells my agent what files to generate, so that the harness does the file work for whatever runtime I use.
34. As any user, I want the prompt to name the catalog version it came from, so that the harness and I can tell later where the numbers came from.
35. As a subscriber, I want all files in one zip download, so that I get everything in one click.
36. As a future Gentle AI CLI user, I want to see the command the CLI will accept, greyed until it ships, so that I know the route exists.

### Subscriber: browsing the catalog

37. As a subscriber, I want a Models page listing every model per Subscription with its Lab, Budget Class per Plan, Strengths, privacy flags, and status, so that I can understand the raw material behind a recommendation.
38. As a subscriber, I want each model's evidence (caps, price, source, date verified) visible, so that I can check the claim myself.
39. As a subscriber, I want legacy and experimental models marked, so that I know why they don't appear in Profiles.
40. As a subscriber, I want a landing page with a few featured Profiles, so that I can see what the site does before I fill in anything.

### Community contributor

41. As a contributor, I want a Contribute page that explains how to open an Override pull request, so that I can share an opinion without reading the whole repo.
42. As a contributor, I want an Override to apply to every selection that includes my required Subscriptions, so that an opinion about OpenCode Go still holds when a user also has ChatGPT.
43. As a contributor, I want the pull request to fail with a clear message when my Override breaks an invariant, so that I fix it before a maintainer looks.
44. As a contributor, I want the pull request to fail when my Override collides with another of equal specificity, so that the disagreement gets argued in the pull request instead of silently resolved.
45. As a contributor, I want to fix a model's classification by editing one YAML file, so that a wrong Lab or Strength is a small pull request.
46. As a contributor, I want the schema to reject a Strength of 3 without evidence, so that best-in-class claims always carry proof.
47. As a contributor, I want to add a new Subscription with one file and its models, so that the community can grow beyond the five launch Subscriptions.
48. As a contributor, I want to add a new runtime with one Runtime Mapping file, so that a new Gentle AI agent host can be supported without touching the engine.
49. As a contributor, I want to add a new Phase with one row and one line per Runtime Mapping, so that a Gentle AI release with a new agent is a small data change.

### Maintainer

50. As a maintainer, I want the checker to open one pull request per run with one commit per model, so that I can review and revert per model.
51. As a maintainer, I want every new model to arrive with a drafted Lab, Budget Class evidence, Strengths, and privacy flags, so that I approve a classification rather than write one.
52. As a maintainer, I want a checklist in the pull request body for Lab, Budget Class, and privacy flags, so that I don't forget the three things that matter most.
53. As a maintainer, I want the checker to never touch Strengths, Lab, or privacy flags on an existing model, so that evidence updates can't silently reclassify.
54. As a maintainer, I want the pull request body to state every re-tier an evidence change causes and the rows it affects, so that I approve the consequence, not just a number.
55. As a maintainer, I want vanished models proposed as legacy rather than deleted, so that old shared URLs keep resolving.
56. As a maintainer, I want an unclassifiable model to land as a stub marked "needs human", so that a bad LLM draft never blocks the run or reaches users.
57. As a maintainer, I want the checker to continue when one provider's catalog fails and list what it skipped, so that one outage doesn't hide four updates.
58. As a maintainer, I want to run the checker by hand for one Subscription, so that I can refresh a catalog on demand.
59. As a maintainer, I want the checker to exit silently when nothing changed, so that I'm not flooded with empty pull requests.
60. As a maintainer, I want the data bundle content-hashed on every build, so that any consumer can say which catalog it used.
61. As a maintainer, I want CI to run schema validation, engine tests, and a site build on every pull request, so that a broken data file never deploys.
62. As a maintainer, I want the only secret in the repo to be the checker's LLM key, so that the project stays easy to fork and host.
63. As a maintainer, I want the engine published as a package, so that Gentle AI can consume it later without copying code.

### Harness and CLI consumers

64. As a harness agent given the prompt, I want the resolved Profile as structured JSON inside it, so that I can generate runtime files without scraping prose.
65. As a future Gentle AI CLI, I want to download one data bundle and run the engine locally, so that any Subscription mix resolves without the site prebuilding it.
66. As a future Gentle AI CLI, I want reasons and warnings as typed codes, so that I can render them in my own words and language.

## Implementation Decisions

### Shape

- One public monorepo with pnpm workspaces: a data directory, an engine package, a checker package, a site app, and docs. It starts under the author's GitHub account and may transfer to the Gentleman-Programming org later.
- Hosting is GitHub Pages from the same repository. The site is fully static. No accounts, no server, no analytics.
- The checker is a GitHub Action on a weekly cron, also runnable by hand with a Subscription filter. Its only secret is one LLM API key. The drafting step sits behind one interface so provider and model are a config line.

### Data

- All data is YAML validated by JSON Schema in CI. Collections: subscriptions, models (one file per model per Subscription), phases, overrides, runtimes.
- A Subscription declares its provider prefix, its Billing Model (`capped` or `metered`), the thresholds that derive Budget Class, the catalog source for the checker, and its Plans if capped. Launch Subscriptions: OpenAI as ChatGPT via Codex only, OpenCode Go, Mistral, OpenRouter, Kimi coding plan. An OpenAI API-key Subscription is a separate later entry.
- A model file carries Lab, Strengths (six ordinal 0 to 3 ratings; a 3 must cite evidence), privacy flags (trains on data, log retention days), effort variants, status (`current`, `legacy`, `experimental`), and evidence. On a capped Subscription it carries a per-Plan map of evidence; a Plan absent from the map means the model isn't offered there.
- Budget Class is never stored. It is derived at load time from evidence and the Subscription's thresholds, per Plan on capped Subscriptions and once from price on metered ones. This is ADR 0001. Lab is inferred from the model, never from the provider prefix.
- Phases are the 27-agent union across Pi, OpenCode, Claude Code, and Codex, each with a call pattern (`one-shot` or `loop`), Strength weights, and an Independence role (`implementer`, `verifier`, `judge-a`, `judge-b`, `neutral`).
- A Runtime Mapping per runtime lists which Phases the runtime has and under what name, and translates provider prefixes. Exporters apply it; the engine never sees it.
- An Override is keyed by Tier and Phase and carries a `requires` list of Subscriptions (subset match), the model, effort, reason, author, and pull request. The longer `requires` wins; equal length for the same Tier and Phase is a CI error.

### Engine

- A pure TypeScript package with zero runtime dependencies and no I/O. One entry point takes the selection (Subscriptions with Plans, Tier, constraints, Pins) and returns a Profile.
- Per Phase, in dependency order with implementers first: build the candidate pool from `current` models across the chosen Subscriptions and Plans, prune by constraints; score by weighted Strengths shifted by Tier; apply the winning Override, then any Pin; run the Independence pass; build the Fallback Chain.
- Budget Class is a hard filter against call pattern for every Subscription. A sniper never enters a loop Phase as primary or fallback.
- Independence is a three-rung ladder: lab-independent, model-independent, context-independent. Verifiers and judges climb it against the apply primary; judge B also climbs it against judge A. Only the last rung raises a warning. Inside rung 1, verifier and judge roles prefer a Lab that holds no other row in the Profile.
- Effort: sniper and semi always default in every Tier; workhorse and volume get high only in HIGH and only when the variant exists; BALANCED and LEAN always default.
- Ties break by Budget Class fit, then untouched Lab, then cheaper model. A model offered by two of the user's Subscriptions is two candidates; between them prefer higher Budget Class for the call pattern, then capped over metered, then the Subscription already holding more rows.
- Fallback Chains are plain ordered lists of two to ten models with no conditions. Verifier and judge fallbacks are validated against the apply primary and apply's first fallback. Conditional advice becomes a Reason Factor, never engine logic.
- Overrides beat rules but not invariants. Pins beat both but not invariants. A Pin outside the pool is reported and ignored. An Override whose model was pruned by constraints is skipped and reported.
- Output rows carry reasons and warnings as typed Reason Factors, code plus parameters. The engine emits no prose and no language.
- Unsatisfiable Independence yields a warning and the best available pick, never an empty row. A Phase with no candidate yields a row that says so and names the cheapest Subscription that would fill it.

### Site

- Astro with static output and one React island for the picker. English and Spanish; the site owns the dictionaries from Reason Factor codes to sentences.
- Three-step flow: pick, read the Profile, take it home. Secondary pages: Models, Contribute, landing with featured Profiles.
- The site publishes inputs, not outputs: one content-hashed data bundle and the engine package. The browser island and any future consumer download the bundle and resolve locally. Only featured combos are prebuilt.
- The selection, including Pins, is encoded in the URL by a codec that round-trips losslessly.
- Exporters produce the OpenCode JSON fragment (agent entries with model and variant, fallbacks in a sidecar), Pi agent markdown files, the sync command, and the harness prompt with the resolved Profile embedded as JSON and the bundle hash named.

### Checker

- One adapter per Subscription returns a normalized catalog. models.dev is the fallback when a provider's API needs a key.
- Diff outcomes per model: new, changed evidence, vanished. New models get an LLM-drafted classification validated against the schema, with three same-Subscription examples as context. Changed evidence updates only the evidence block. Vanished models are proposed as legacy.
- The engine test suite runs against the proposed data; failures and every re-tier caused by evidence changes are written into the pull request body.
- One pull request per run, one commit per model, a checklist in the body. An invalid draft becomes a stub marked for a human.

## Testing Decisions

A good test exercises a seam from the outside with inputs a user or consumer could produce, and asserts on what comes out. It never reaches into scoring internals, never asserts on how a rung was computed, and never depends on the real catalog, which changes weekly by design.

Seams, highest first:

1. **Engine**: the single resolve function. Property tests over generated catalogs for every invariant (sniper never in a loop, Fallback Chains within bounds, Independence never silently violated, Overrides and Pins never break invariants). Scenario tests on small hand-written catalogs that pin one rule each: a single-Lab catalog reaches the model-independent rung without a warning; a cheaper equal-Strength model wins in LEAN; a model in two Subscriptions resolves to the higher Budget Class; an Override with longer `requires` beats a shorter one; a Pin outside the pool is reported and ignored; a Phase with an empty pool names the cheapest filling Subscription.
2. **Data loader**: YAML fixtures, valid and invalid, asserting the bundle or the named failing field. A Strength of 3 without evidence must fail. Two Overrides of equal specificity for one Tier and Phase must fail.
3. **Exporter**: given a Profile and a Runtime Mapping, assert the exact OpenCode fragment, Pi frontmatter, sync command, and prompt text. Pi output must use Pi's names and prefixes; OpenCode output must omit Phases OpenCode lacks.
4. **Checker**: injected adapters returning recorded catalogs and a fake drafter. Assert the proposed changes, the re-tier consequences, the legacy proposals, and the skipped-provider list when one adapter throws. The pull request shell is not unit-tested.
5. **Selection codec**: round-trip property tests for every selection shape including Pins, plus one site build smoke test per launch Subscription and one Playwright check that a URL reproduces the same Profile.

The two source documents from 2026-07 and 2026-08 are not golden outputs. They were valid for their date's catalog. They contribute only the initial classification of the models they list and the invariants.

There is no prior art in this repository; it is empty apart from docs. The property-test style follows the usual fast-check approach in TypeScript.

## Out of Scope

- The `gentle-ai` CLI subcommand that consumes the bundle. It is a follow-up pull request to the Gentle AI repository.
- User accounts, saved selections, telemetry, or any server.
- Subscriptions beyond the five launch ones, including an OpenAI API-key Subscription and Anthropic. They join through the checker and pull requests.
- Re-tiering a model without a reviewed pull request. Re-tiering through an approved evidence change is in scope by design.
- Conditional Fallback Chains. The Gentle AI TUI has none.
- Transferring the repository to the Gentleman-Programming org. A later explicit step.
- Any change to Gentle AI's profile storage or an import format. Gentle AI has none today, and none is promised.

## Further Notes

- Build order: data schema and the OpenCode Go catalog first, engine with invariant and scenario tests second, site third, checker last. The site is useful the moment the engine resolves a real catalog; the checker earns its keep once there's something to keep fresh.
- The second source document lives in a volatile macOS cache path. Copy both into repo fixtures early, as classification evidence, not as expected outputs.
- Runtime agent counts verified on 2026-09-14: Pi 24, OpenCode 20, Claude Code 18, Codex 17. Pi spells `sdd-proposal` and prefixes OpenAI models as `openai-codex/`. Any future count change is a Runtime Mapping change, not an engine change.
- Vocabulary is fixed in `CONTEXT.md`. Profile is the output, Tier is HIGH/BALANCED/LEAN, Budget Class is sniper/semi/workhorse/volume, Plan is what you pay a provider for. Please keep code, tests, and copy on those words.
