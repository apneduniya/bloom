export type BloomStatus = "draft" | "ready" | "sending" | "sent";
export type SendJobStatus = "queued" | "running" | "completed" | "failed";
export type SendRowStatus = "pending" | "sent" | "failed";

export type User = {
  id: string;
  email: string;
  name: string;
};

export type TextLayer = {
  id: string;
  bloomId: string;
  name: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "400" | "600" | "700";
  fontStyle: "normal" | "italic";
  color: string;
  opacity: number;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  bindingKey?: string;
};

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

export type Mapping = {
  id: string;
  bloomId: string;
  sourceColumn: string;
  targetFieldType: "text_layer" | "email_to" | "email_subject" | "email_body" | "attachment_filename";
  targetFieldId: string;
  transformRule?: string;
};

export type Integration = {
  id: string;
  ownerId: string;
  providerType: "smtp";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromName: string;
  fromEmail: string;
  encryptedSecretRef?: string;
  status: "draft" | "verified" | "error";
  lastTestedAt?: string;
  errorMessage?: string;
};

export type EmailDraft = {
  id: string;
  bloomId: string;
  toFieldMapping: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachmentFilename: string;
  attachmentsEnabled: boolean;
};

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

export type Bloom = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  templateImageFileId: string;
  templateImageDataUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  status: BloomStatus;
  createdAt: string;
  updatedAt: string;
  lastSavedAt?: string;
  version: number;
  layers: TextLayer[];
  dataSource?: DataSource;
  mappings: Mapping[];
  emailDraft: EmailDraft;
};

export type BloomSnapshot = {
  user: User | null;
  blooms: Bloom[];
  integrations: Integration[];
  sendJobs: SendJob[];
};
