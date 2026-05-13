export type ParsedCsv = {
  columns: string[];
  rows: Record<string, string>[];
};

export function parseCsv(input: string): ParsedCsv {
  const records = parseRows(input);
  const [header, ...body] = records.filter((row) => row.some((cell) => cell.trim()));
  if (!header?.length) throw new Error("CSV must include a header row.");

  const columns = header.map((cell) => cell.trim()).filter(Boolean);
  if (!columns.length) throw new Error("CSV header row is empty.");
  if (new Set(columns).size !== columns.length) throw new Error("CSV columns must be unique.");

  const rows = body.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]?.trim() ?? ""])),
  );

  return { columns, rows };
}

function parseRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}
