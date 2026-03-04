import { extract } from "./commands/extract.js";
import { replace } from "./commands/replace.js";
import { init } from "./commands/init.js";
import { sync } from "./commands/sync.js";
import { status } from "./commands/status.js";
import { run } from "./commands/run.js";
import { printHelp, parseArgs } from "./helpers.js";

const { command, args, flags } = parseArgs(process.argv.slice(2));

switch (command) {
  case "init":
    await init(flags);
    break;
  case "extract":
    await extract(args, flags);
    break;
  case "replace":
    await replace(args, flags);
    break;
  case "sync":
    await sync(flags);
    break;
  case "status":
    await status(flags);
    break;
  case "run":
    await run(args, flags);
    break;
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  default:
    if (command) {
      console.error(`Unknown command: ${command}`);
    }
    printHelp();
    process.exit(1);
}
