import { runEntry } from "../../../src/cli/io.js";

// Issue #35 (from the follow-up comment): reproduces "a stream write
// throwing inside runGuarded's own catch path (an EPIPE when the consumer
// closed the pipe)". The first stderr write -- runGuarded's own error
// report -- throws; every later write (for example Node's own
// unhandled-rejection reporting, if `runEntry` regresses) goes through
// untouched, so this forces exactly the one failure `runEntry`'s trailing
// `.catch` must survive.
const originalWrite = process.stderr.write.bind(process.stderr);
let writeCount = 0;
process.stderr.write = ((...args: Parameters<typeof process.stderr.write>) => {
  writeCount += 1;
  if (writeCount === 1) {
    throw new Error("simulated EPIPE");
  }
  return originalWrite(...args);
}) as typeof process.stderr.write;

runEntry(async () => {
  throw new Error("boom");
});
