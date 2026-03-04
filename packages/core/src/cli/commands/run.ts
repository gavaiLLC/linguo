export async function run(
  globs: string[],
  flags: Record<string, string | boolean>,
): Promise<void> {
  console.log("linguo run — not yet fully wired");
  console.log("Globs:", globs.length > 0 ? globs : "(from config)");
}
