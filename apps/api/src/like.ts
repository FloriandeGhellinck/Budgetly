// A LIKE pattern matching `text` anywhere, with its wildcards taken literally
// (backslash is Postgres's default LIKE escape).
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
