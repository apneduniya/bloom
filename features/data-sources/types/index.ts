export type DataSource = {
  id: string;
  bloomId: string;
  fileType: "csv";
  fileId?: string;
  fileName: string;
  columnNames: string[];
  rowCount: number;
  rows: Record<string, string>[];
  previewRows: Record<string, string>[];
  uploadedAt: string;
};
