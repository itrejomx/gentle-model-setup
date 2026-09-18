# Research Evidence: OpenCode Go live catalog re-verification

schema: gentle-ai.sdd-research/v1
request_id: res-scaffold-go-catalog-001
revision: 2
change: scaffold-data-contract-go-catalog
outcome: done
collected_at: 2026-09-14
requested_classes: [open-web, documentation]

## Questions

- Q1. Which models does OpenCode Go currently list on its official documentation, with official IDs, per-window caps, plan names and prices?
- Q2. Which of the models named in the 2026-08-19 source document are still offered, renamed, re-capped, or removed?
- Q3. What does the official documentation state about privacy per model (training, retention, ZDR)?
- Q4. What is the Go subscription billing model (capped vs metered), value limits, and plan tiers?

## Admission

- documentation (WebFetch): granted, verified by fetching opencode.ai/docs/go, docs/zen, docs/models, /go, /black, models.opencode.ai/providers/opencode-go/.
- open-web (WebSearch): granted, verified by one search used to discover the Models.dev catalog and the Black plan page.

## Sources

| id | class | title | publisher | url | accessed_at | excerpt |
|---|---|---|---|---|---|---|
| S1 | documentation | Go | OpenCode (opencode.ai) | https://opencode.ai/docs/go | 2026-09-14T00:00:00Z | "Go costs $10/month... 5-hour limit: 20% of monthly cap; Weekly limit: 50%; Monthly limit: 100%" |
| S2 | documentation | Zen | OpenCode (opencode.ai) | https://opencode.ai/docs/zen | 2026-09-14T00:00:00Z | "All our models are hosted in the US. Our providers follow a zero-retention policy" |
| S3 | documentation | Models | OpenCode (opencode.ai) | https://opencode.ai/docs/models | 2026-09-14T00:00:00Z | "focuses exclusively on configuring LLM providers and models" (no Go/pricing content) |
| S4 | documentation | OpenCode Go provider | Models.dev | https://models.opencode.ai/providers/opencode-go/ | 2026-09-14T00:00:00Z | "a comprehensive open-source database of AI model specifications, pricing, and features" (no request caps or privacy fields) |
| S5 | documentation | OpenCode Go (marketing) | OpenCode (opencode.ai) | https://opencode.ai/go | 2026-09-14T00:00:00Z | "Go costs $10/month... Top up credit if needed. Cancel any time." |
| S6 | documentation | OpenCode Black | OpenCode (opencode.ai) | https://opencode.ai/black | 2026-09-14T00:00:00Z | "Black plan enrollment is temporarily paused." |

## Claims

### Q1 and Q4: plan and billing model

- C1: OpenCode Go is one subscription at $10/month with tiered windows: 5-hour = 20% of monthly cap, weekly = 50%, monthly = 100%. [S1, S5] confidence: high
- C2: docs/go lists 28 model rows, each mapped to a monthly dollar-equivalent bucket ($15 / $30 / $60) with per-model request caps for 5-hour, weekly, and monthly windows (full table below). [S1] confidence: medium-high
- C3: docs/go, docs/zen, and docs/models each display "Last updated: Sep 14, 2026", identical to the access date. [S1, S2, S3] confidence: low (plausibly a fetch-tool artifact)
- C27: OpenCode Go is a capped subscription (fixed $10/month with per-model request caps), not metered. [S1, S5] confidence: high
- C28: There is a single Go plan tier; differentiation is per-model dollar-equivalent bucket ($15/$30/$60), not per-user plan tier. [S1] confidence: medium-high
- C29: A separate higher "OpenCode Black" plan exists but enrollment is paused with no published price or caps. [S6] confidence: high

### Q2: diff against the 2026-08-19 source document (5-hour caps)

- C4 to C15: unchanged caps: kimi-k3 110, qwen3.8-max 160, glm-5.3 220, glm-5.2 880, deepseek-v4-pro 1050, kimi-k2.7-code 1350, gpt-5.6-luna 2050, minimax-m3 3200, mimo-v2.5-pro 3250, qwen3.7-plus 4300, hy3 4300, mimo-v2.5 30100. [S1] confidence: high
- C16: qwen3.7-max re-capped 340 to 170. [S1] confidence: high
- C17: deepseek-v4-flash re-capped 7600 to 13000, corroborated on a second page. [S1, S5] confidence: high
- C18: grok-4.5 does not appear in the current Go table; grok-4.6 appears at 169 req/5h. No rename or deprecation statement was found; grok-4.5 still exists as a separate Zen model. Observed table change, not a confirmed rename. [S1, S2] confidence: low-medium
- C19: legacy entries remain listed: kimi-k2.6 1150, minimax-m2.7 3400, glm-5.1 880, qwen3.6-plus 3300. [S1] confidence: high
- C20: muse-spark-1.2-contributor still listed at 45300, alongside muse-spark-1.3-contributor at the same cap. [S1] confidence: high
- C21: newly present models not in the source document: glm-5.3-flash, longcat-2.0, minimax-m2.5, qwen3.8-flash, deepseek-v4.1-flash (temporary 4x multiplier through Sep 20, 2026), deepseek-v4-flash-vision-exp, hy4-preview, muse-spark-1.3-contributor. [S1] confidence: high

### Q3: privacy

- C22: docs/go states most models carry "0 days" retention. [S1] confidence: high
- C23: Grok 4.6 and GPT-5.6 Luna are documented with 30-day retention. [S1] confidence: high
- C24: Muse Spark models are documented with model training enabled and "Not ZDR", with geographic restrictions. [S1] confidence: medium-high
- C25: DeepSeek models are documented as "0 days" retention "with ZDR agreement valid through September 30, 2026" (aggregate summary; not reproduced at row level, see contradictions). [S1] confidence: medium-high
- C26: docs/zen (separate product) states zero retention by default with exceptions: OpenAI and Anthropic APIs retained 30 days, free-trial models usable for model improvement, Muse Spark Contributor exchanges prompts for training permission. Applies to Zen, not necessarily Go. [S2] confidence: high

### Catalog table (S1, re-fetched 2026-09-14; claims C2-01 to C2-28, one per row)

| Display Name | Official ID | Monthly $ Bucket | 5-Hour Cap | Weekly Cap | Monthly Cap | Retention (days) | Training Allowed | Note | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Grok 4.6 | opencode-go/grok-4.6 | $15 | 169 | 423 | 845 | 30 | No | Context-dependent pricing (<=200K / >200K tokens) | medium-high |
| GLM-5.3-Flash | opencode-go/glm-5.3-flash | $60 | 6,320 | 15,790 | 31,580 | 0 | No | not shown | medium-high |
| GLM-5.3 | opencode-go/glm-5.3 | $15 | 220 | 540 | 1,080 | 0 | No | not shown | high |
| GLM-5.2 | opencode-go/glm-5.2 | $60 | 880 | 2,150 | 4,300 | 0 | No | not shown | high |
| GLM-5.1 | opencode-go/glm-5.1 | $60 | 880 | 2,150 | 4,300 | 0 | No | not shown | medium-high |
| Kimi K3 | opencode-go/kimi-k3 | $15 | 110 | 250 | 490 | 0 | No | not shown | high |
| Kimi K2.7 Code | opencode-go/kimi-k2.7-code | $60 | 1,350 | 3,380 | 6,750 | 0 | No | not shown | high |
| Kimi K2.6 | opencode-go/kimi-k2.6 | $60 | 1,150 | 2,880 | 5,750 | 0 | No | not shown | medium-high |
| LongCat-2.0 | opencode-go/longcat-2.0 | $60 | 11,400 | 28,600 | 57,200 | 0 | No | new since 2026-08-19 | medium-high |
| MiMo-V2.5 | opencode-go/mimo-v2.5 | $60 | 30,100 | 75,200 | 150,400 | 0 | No | not shown | high |
| MiMo-V2.5-Pro | opencode-go/mimo-v2.5-pro | $15 | 3,250 | 8,150 | 16,300 | 0 | No | not shown | high |
| MiniMax M3 | opencode-go/minimax-m3 | $60 | 3,200 | 8,000 | 16,000 | 0 | No | not shown | high |
| MiniMax M2.7 | opencode-go/minimax-m2.7 | $60 | 3,400 | 8,500 | 17,000 | 0 | No | not shown | medium-high |
| MiniMax M2.5 | opencode-go/minimax-m2.5 | not shown | not shown | not shown | not shown | 0 | No | caps not published | medium |
| Muse Spark 1.3 Contributor | opencode-go/muse-spark-1.3-contributor | $60 | 45,300 | 113,300 | 226,600 | not shown | Yes | Geographic restrictions; new since 2026-08-19 | medium |
| Muse Spark 1.2 Contributor | opencode-go/muse-spark-1.2-contributor | $60 | 45,300 | 113,300 | 226,600 | not shown | Yes | Geographic restrictions | medium |
| Qwen3.8 Max | opencode-go/qwen3.8-max | $15 | 160 | 400 | 810 | 0 | No | not shown | high |
| Qwen3.8 Flash | opencode-go/qwen3.8-flash | $30 | 5,400 | 13,500 | 27,000 | 0 | No | new since 2026-08-19 | medium-high |
| Qwen3.7 Max | opencode-go/qwen3.7-max | $30 | 170 | 420 | 840 | 0 | No | re-capped from 340 | high |
| Qwen3.7 Plus | opencode-go/qwen3.7-plus | $60 | 4,300 | 10,800 | 21,600 | 0 | No | Context-dependent pricing (<=256K / >256K tokens) | high |
| Qwen3.6 Plus | opencode-go/qwen3.6-plus | $60 | 3,300 | 8,200 | 16,300 | 0 | No | Context-dependent pricing (<=256K / >256K tokens) | medium-high |
| DeepSeek V4.1 Flash | opencode-go/deepseek-v4.1-flash | $60 | 6,500 (26,000 during promo) | 16,250 (65,000 during promo) | 32,500 (130,000 during promo) | 0 | No | 4x multiplier through Sep 20, 2026; peak/off-peak pricing; new | medium-high |
| DeepSeek V4 Pro | opencode-go/deepseek-v4-pro | $15 | 1,050 | 2,600 | 5,200 | 0 | No | Peak/off-peak pricing | high |
| DeepSeek V4 Flash | opencode-go/deepseek-v4-flash | $30 | 13,000 | 32,500 | 65,000 | 0 | No | Peak/off-peak pricing; re-capped from 7,600 | high |
| DeepSeek V4 Flash Vision Exp | opencode-go/deepseek-v4-flash-vision-exp | $15 | 6,500 | 16,250 | 32,500 | 0 | No | Experimental; peak/off-peak pricing; new | medium-high |
| Hy4 preview | opencode-go/hy4-preview | $30 | 1,350 | 3,380 | 6,770 | 0 | No | Preview; new | medium-high |
| Hy3 | opencode-go/hy3 | $60 | 4,300 | 10,750 | 21,500 | 0 | No | not shown | high |
| GPT 5.6 Luna | opencode-go/gpt-5.6-luna | $15 | 2,050 | 5,100 | 10,250 | 30 | No | Context-dependent pricing (<=272K / >272K tokens) | high |

## Contradictions

- grok-4.5 (in the 2026-08-19 document) is absent from the live table while grok-4.6 is present; no changelog confirms rename, replacement, or removal plus addition. Unresolved.
- Identical "Last updated: Sep 14, 2026" across three unrelated docs pages, matching the access date, is likely a fetch-tool artifact rather than real page metadata.
- The DeepSeek "ZDR agreement valid through September 30, 2026" note appeared in the aggregate privacy summary but not in the row-level transcription; the expiry date is unconfirmed at row level.

## Gaps

- No changelog or release-notes page was found; Q2 conclusions come from diffing table state.
- Models.dev exposes no request-cap or privacy fields, so caps were not cross-validated against an independent catalog.
- OpenCode Black pricing and caps are unpublished.
- MiniMax M2.5 has no published bucket or caps on the page.
- Muse Spark 1.2 and 1.3 Contributor retention days are not shown.
- Page "Last updated" values were not verified against raw HTML.

## Uncertainty and freshness

- The fetch tool paraphrases page content; numeric transcription errors are possible. Mitigation: deepseek-v4-flash cap matched on two separate pages; twelve caps matched the 2026-08-19 document exactly.
- Retention and training columns were captured once and not cross-checked by a second fetch.
- Snapshot date: 2026-09-14. The catalog changed 3 of 16 tracked models in under a month; expect further drift before implementation. Re-verify docs/go with raw-HTML inspection close to implementation.

## Product choices (non-authoritative, separate from evidence)

- The catalog data for issue #2 should carry per-model `verifiedAt: 2026-09-14` and cite S1 as the catalog source.
- grok-4.5 should be modeled as status `retired` (or absent) and grok-4.6 as a new model, pending changelog confirmation; the checker slice can revisit.
- Models with "not shown" caps (MiniMax M2.5) and training-allowed models (Muse Spark Contributor) need explicit status and privacy flags rather than silent omission.
