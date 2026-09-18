import { runBuildCli } from "../cli/build.js";
import { runEntry } from "../cli/io.js";

// Entry file (AGENTS.md: "packages/data is a library with thin CLI
// entrypoints"): always runs when loaded, unlike the deleted
// `import.meta.url` guard in `cli/build.ts`, which compared
// `process.argv[1]` against `import.meta.url` and was false whenever this
// file was reached through a symlinked path (issue #33).
runEntry(runBuildCli);
