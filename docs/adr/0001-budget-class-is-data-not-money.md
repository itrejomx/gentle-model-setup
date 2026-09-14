---
status: accepted
---

# Budget Class is derived in data; the engine never reasons about money

Capped subscriptions (OpenCode Go, ChatGPT via Codex) have request caps that make a "sniper" model physically run out in a loop. Metered subscriptions (OpenRouter, future API-key entries) never run out; a frontier model in a loop is merely expensive. We decided that the sniper-never-in-a-loop invariant stays a hard filter for every subscription, and that each subscription file owns the thresholds that map its caps or prices onto Budget Class. The engine sees only Budget Class. The alternative, a soft cost score for metered subscriptions, would have meant two rule paths and two test suites; a maintainer who disagrees with where a model landed changes a threshold in a data PR instead.
