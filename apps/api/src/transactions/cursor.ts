import { z } from "zod";

// Opaque to callers: the (occurredOn, id) of the last item of a page, which
// is the list's sort key.
export type Cursor = { occurredOn: string; id: string };

const CursorTuple = z.tuple([z.iso.date(), z.uuid()]);

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify([cursor.occurredOn, cursor.id])).toString("base64url");
}

// Null when the string is not a cursor this API produced.
export function decodeCursor(value: string): Cursor | null {
  try {
    const parsed = CursorTuple.safeParse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    return parsed.success ? { occurredOn: parsed.data[0], id: parsed.data[1] } : null;
  } catch {
    return null;
  }
}
