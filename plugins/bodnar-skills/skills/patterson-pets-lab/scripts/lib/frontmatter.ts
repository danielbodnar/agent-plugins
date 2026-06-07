// Build and extract YAML frontmatter without a YAML dependency.
// The frontmatter used across skills, commands, and sub-agents is flat with at
// most one level of nesting (the metadata map), so a small serializer covers it.

export type Frontmatter = Record<string, string | number | boolean | Record<string, string>>;

function scalar(value: string | number | boolean): string {
  if (typeof value !== "string") return String(value);
  // Quote when the value contains characters that would break flow scalars.
  return /[:#\[\]{}",&*!|>%@`]/.test(value) || value.trim() !== value ? JSON.stringify(value) : value;
}

export function buildFrontmatter(fm: Frontmatter): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    if (value && typeof value === "object") {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value)) lines.push(`  ${k}: ${scalar(v)}`);
    } else {
      lines.push(`${key}: ${scalar(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

// Extract the raw frontmatter block and the body that follows it.
export function splitFrontmatter(source: string): { frontmatter: string; body: string } {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: source };
  return { frontmatter: match[1], body: match[2] };
}

// Pull a single top-level scalar field out of a frontmatter block (best effort).
export function readField(frontmatter: string, key: string): string | undefined {
  const line = frontmatter.split("\n").find((l) => l.startsWith(`${key}:`));
  if (!line) return undefined;
  const raw = line.slice(key.length + 1).trim();
  return raw.startsWith('"') ? JSON.parse(raw) : raw;
}
