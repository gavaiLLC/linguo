export interface ParsedArgs {
  command: string | undefined;
  args: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0];
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex !== -1) {
        flags[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      } else {
        flags[arg.slice(2)] = true;
      }
    } else {
      args.push(arg);
    }
  }

  return { command, args, flags };
}

export function printHelp(): void {
  console.log(`
linguo — automated i18n engine

Commands:
  init                 Scaffold config file and install hooks
  extract [globs...]   Extract strings from source files
  replace [globs...]   Replace strings with i18n calls in source
  sync                 Ensure all language files have all keys
  status               Show translation coverage stats
  run [globs...]       Full pipeline: extract → replace → sync

Options:
  --config <path>      Path to config file (default: linguo.config.ts)
  --help               Show this help message
`);
}
