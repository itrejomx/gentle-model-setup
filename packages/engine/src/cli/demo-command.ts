import { access, constants } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  BundleHashMismatchError,
  BundleParseError,
  BundleShapeError,
  loadBundle,
} from "@gentle-ai/profile-data";
import type { BundlePayload } from "@gentle-ai/profile-data";
import { InvalidSelectionError } from "../errors.js";
import { resolveProfile } from "../resolve.js";
import type { Profile, Selection, Tier } from "../types.js";
import { EXIT_INVALID, EXIT_IO_ERROR, EXIT_OK, EXIT_USAGE, errorMessage } from "./io.js";
import type { CliStreams } from "./io.js";

const TIERS: Tier[] = ["HIGH", "BALANCED", "LEAN"];
const SUBSCRIPTION = "opencode-go";
const PLAN = "go";

/** `packages/data/build/data.json`, relative to this package rather than the working directory. */
const DEFAULT_BUNDLE = fileURLToPath(new URL("../../../data/build/data.json", import.meta.url));

function pad(cells: readonly string[], widths: readonly number[]): string {
  return cells.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join("  ").trimEnd();
}

function table(payload: BundlePayload, profile: Profile): string {
  const subscription = payload.subscriptions.find((record) => record.id === SUBSCRIPTION);
  const plan = subscription?.plans?.find((record) => record.id === PLAN);
  const title = `${subscription?.displayName ?? SUBSCRIPTION} (${SUBSCRIPTION}), Plan ${plan?.displayName ?? PLAN} (${PLAN}) - ${profile.tier}`;
  const lines = [
    ["Phase", "Primary", "Effort", "Fallbacks"],
    ...profile.rows.map((row) => [row.phase, row.primary ?? "(empty)", row.effort, String(row.fallbacks.length)]),
  ];
  const widths = [0, 1, 2].map((column) => Math.max(...lines.map((line) => line[column]?.length ?? 0)));
  return [title, ...lines.map((line) => pad(line, widths))].join("\n");
}

/**
 * Testable core of `pnpm --filter @gentle-ai/profile-engine demo`: at most
 * one positional argument, the bundle path, defaulting to the data package's
 * build output. Prints the OpenCode Go Profile at each Tier. Exit `0` on
 * success, `1` when the bundle fails `loadBundle` or the Selection does not
 * fit it, `2` for a usage error or a missing or unreadable bundle.
 */
export async function runDemoCli(args: string[], streams: CliStreams): Promise<number> {
  if (args.length > 1) {
    streams.stderr.write("usage: demo [bundle-path]\n");
    return EXIT_USAGE;
  }
  const path = args[0] ?? DEFAULT_BUNDLE;
  try {
    await access(path, constants.R_OK);
  } catch (cause) {
    streams.stderr.write(`error: cannot read bundle "${path}": ${errorMessage(cause)}\n`);
    return EXIT_IO_ERROR;
  }
  let payload: BundlePayload;
  try {
    payload = (await loadBundle(path)).payload;
  } catch (cause) {
    if (
      cause instanceof BundleParseError ||
      cause instanceof BundleShapeError ||
      cause instanceof BundleHashMismatchError
    ) {
      streams.stderr.write(`error: ${errorMessage(cause)}\n`);
      return EXIT_INVALID;
    }
    throw cause;
  }
  const tables: string[] = [];
  for (const tier of TIERS) {
    const selection: Selection = {
      subscriptions: [{ subscription: SUBSCRIPTION, plan: PLAN }],
      tier,
      constraints: { clientCode: false },
    };
    try {
      tables.push(table(payload, resolveProfile(payload, selection)));
    } catch (cause) {
      if (!(cause instanceof InvalidSelectionError)) throw cause;
      streams.stderr.write(`error: ${errorMessage(cause)}\n`);
      return EXIT_INVALID;
    }
  }
  streams.stdout.write(`${tables.join("\n\n")}\n`);
  return EXIT_OK;
}
