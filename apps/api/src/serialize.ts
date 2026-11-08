// Contracts carry instants as ISO strings so JSON callers (MCP) get the same
// shape as RPC callers.
export function iso(date: Date): string;
export function iso(date: Date | null): string | null;
export function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
