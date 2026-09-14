# Model Profile Site

A community site that resolves which model each Gentle AI SDD and Judgment Day phase should use, given the subscriptions a user holds.

## Language

**Profile**:
The resolved set of fourteen phase-to-model assignments, each with effort and fallbacks. Matches the Gentle AI TUI concept.
_Avoid_: config, setup, preset

**Tier**:
The quality-versus-cost target a user selects: HIGH, BALANCED, or LEAN. An input that picks scoring weights, never the output.
_Avoid_: profile, level, mode

**Budget Class**:
A model's quota category within a subscription: sniper, semi, workhorse, or volume. Decides which call patterns a model may serve.
_Avoid_: tier, level, cap

**Subscription**:
A paid relationship with one provider that exposes one catalog under one provider prefix and one billing model. One provider can back several subscriptions.
_Avoid_: provider, account, source

**Billing Model**:
How a subscription charges: capped (a plan with request or usage caps) or metered (an API billed per token). Decides how Budget Class is derived.
_Avoid_: pricing type, plan type

**Independence**:
How separated a verifier or judge is from the model whose work it checks, on a three-rung ladder: lab-independent (different lab), model-independent (same lab, different model), context-independent (same model, fresh context).
_Avoid_: isolation, cross-lab, blind

**Lab**:
The organization that trained a model. All versions of a family share one lab, so Kimi K3 and Kimi K2.7 are both moonshot.
_Avoid_: provider, vendor, company

**Fallback Chain**:
The ordered list of substitute models a phase tries when its primary is unavailable, between two and ten long, with no conditions.
_Avoid_: backup, alternates, secondary

**Strength**:
One of six ordinal 0–3 ratings on a model (one-shot reasoning, sustained reasoning, coding with tools, long context, multimodal, cheap). A 3 means best in class within its subscription and must cite evidence.
_Avoid_: capability, score, benchmark

**Override**:
A community-authored pick for one tier and phase that applies whenever its required subscriptions are all present, beating the rules but not the invariants.
_Avoid_: exception, pin, preference

**Pin**:
A personal choice of model for one phase, carried in the URL, that beats rules and overrides but not the invariants.
_Avoid_: override, lock, manual pick

**Reason Factor**:
A typed code with parameters that explains one part of why a row resolved as it did. The engine emits factors; consumers render sentences.
_Avoid_: reason string, explanation, note

**Phase**:
One of the 27 canonical Gentle AI agents that receives a model assignment, the union across all supported runtimes. A Profile has one row per Phase.
_Avoid_: agent, step, stage, row

**Runtime Mapping**:
Per-runtime data that names which Phases a runtime has, what it calls them, and how it spells provider prefixes. Applied by exporters, invisible to the engine.
_Avoid_: adapter, translation table

**Plan**:
What a user pays a provider for, such as Free, Plus, or Pro. Scopes which models and quotas a subscription exposes.
_Avoid_: tier, subscription level
