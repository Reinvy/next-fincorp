/**
 * Minimal RFC 4180 CSV parser/serializer shared by bank statement import and exports.
 * Supports quoted fields, escaped quotes, CRLF or LF line endings and a UTF-8 BOM.
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let index = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (index < input.length) {
    const char = input[index];
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      pushField();
      index += 1;
      continue;
    }
    if (char === "\r") {
      if (input[index + 1] === "\n") index += 1;
      pushRow();
      index += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }

  if (field.length > 0 || row.length > 0) pushRow();

  // Drop a trailing empty row produced by a final newline.
  return rows.filter((value) => !(value.length === 1 && value[0] === ""));
}

function escapeField(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((row) => row.map(escapeField).join(",")).join("\r\n");
}
