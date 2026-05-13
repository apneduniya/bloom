const tokenPattern = /\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g;

export function extractTokens(value: string): string[] {
  return Array.from(new Set(Array.from(value.matchAll(tokenPattern), (match) => match[1].trim())));
}

export function findMissingTokens(values: string[], columns: string[]) {
  const known = new Set(columns);
  return Array.from(new Set(values.flatMap(extractTokens).filter((token) => !known.has(token))));
}

export function resolveTokens(value: string, row: Record<string, string>) {
  return value.replace(tokenPattern, (_, rawToken: string) => row[rawToken.trim()] ?? "");
}

export function tokenChip(column: string) {
  return `{{${column}}}`;
}
