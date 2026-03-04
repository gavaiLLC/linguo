export async function extract(
  globs: string[],
  flags: Record<string, string | boolean>,
): Promise<void> {
  console.log("linguo extract — not yet fully wired");
  console.log("Globs:", globs.length > 0 ? globs : "(from config)");
}
