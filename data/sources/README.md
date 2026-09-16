# Source Fixtures

These files are pandoc-converted (`pandoc -t gfm`) copies of the two internal
profile documents used as classification evidence for the OpenCode Go
subscription and catalog data under `data/`. They are **evidence, not data**:
no loader or CLI in `packages/data` reads them, and no schema references them.
They exist so a reviewer can trace a model's strength ratings, status, or
Budget Class back to the original source text.

| File | Origin document | Document date |
|---|---|---|
| `perfiles-sdd-opencode-go-only-v2.2.md` | `Perfiles_SDD_OpenCode_Go_Only_v2.2.docx` | 2026-08-19 |
| `gentle-ai-opencode-gpt-5.6.md` | `Gentle AI OpenCode GPT 5.6.docx` | 2026-07-22 |

If the live OpenCode Go catalog changes after this change lands, only the
model YAML files and their `verifiedAt` values are expected to change; these
historical fixtures remain untouched as a dated record (see the
`opencode-go-catalog` spec, "A newer catalog does not require touching
fixtures").
