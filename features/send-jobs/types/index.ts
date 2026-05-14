export type SendJobStatus = "queued" | "running" | "completed" | "failed";
export type SendRowStatus = "pending" | "sent" | "failed";

export type SendJobRow = {
  id: string;
  jobId: string;
  rowIndex: number;
  recipient: string;
  status: SendRowStatus;
  errorMessage?: string;
  attachmentFileId?: string;
  sentAt?: string;
};

export type SendJob = {
  id: string;
  bloomId: string;
  dataSourceId: string;
  type: "email";
  status: SendJobStatus;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  createdAt: string;
  completedAt?: string;
  rows: SendJobRow[];
};
