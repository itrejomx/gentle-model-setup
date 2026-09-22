import { runEntry } from "../cli/io.js";
import { runValidateCli } from "../cli/validate-command.js";

// Entry file (AGENTS.md: "packages/data is a library with thin CLI
// entrypoints"): always runs when loaded, unlike the deleted
// `import.meta.url` guard in `cli/validate-command.ts` (renamed from
// `cli/validate.ts` in issue #35 so the old path fails loudly instead of
// loading silently -- see `cli/build-command.ts`), which compared
// `process.argv[1]` against `import.meta.url` and was false whenever this
// file was reached through a symlinked path (issue #33).
runEntry(runValidateCli);
