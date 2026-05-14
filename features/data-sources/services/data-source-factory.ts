import type { DataSource } from "@/features/data-sources/types";
import { createId } from "@/lib/utils";

export function createDataSource(
  bloomId: string,
  fileName: string,
  rows: Record<string, string>[],
  columns: string[],
): DataSource {
  return {
    id: createId("data"),
    bloomId,
    fileType: "csv",
    fileName,
    columnNames: columns,
    rowCount: rows.length,
    rows,
    previewRows: rows.slice(0, 5),
    uploadedAt: new Date().toISOString(),
  };
}
