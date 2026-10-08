import { runDemoCli } from "../cli/demo-command.js";
import { runEntry } from "../cli/io.js";

// Entry file: always runs when loaded; the logic lives in `runDemoCli`.
runEntry(runDemoCli);
