// A minimal RFC 4180 reader for Notion's CSV exports: quoted fields may hold
// commas, quotes ("") and line breaks; records end with \r\n or \n. No
// dependency, since the import only ever reads these two files.
export function parseCsv(text: string): string[][] {
  const input = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  while (i < input.length) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (char === '"') quoted = false;
      else field += char;
      i += 1;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") endField();
    else if (char === "\n") endRecord();
    else if (char === "\r" && input[i + 1] === "\n") {
      endRecord();
      i += 1;
    } else field += char;
    i += 1;
  }
  // A last record without a trailing newline.
  if (field !== "" || record.length > 0) endRecord();
  return records;
}

// Records as objects keyed by trimmed header names (Notion exports "Type "
// with a trailing space).
export function csvRows(text: string): { header: string[]; rows: Record<string, string>[] } {
  const [header = [], ...records] = parseCsv(text);
  const names = header.map((name) => name.trim().normalize("NFC"));
  const rows = records.map((record) =>
    Object.fromEntries(names.map((name, index) => [name, record[index] ?? ""])),
  );
  return { header: names, rows };
}
