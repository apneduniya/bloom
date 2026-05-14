import type { DataSource } from "@/features/data-sources/types";

export type BloomStatus = "draft" | "ready" | "sending" | "sent";

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

export type Mapping = {
  id: string;
  bloomId: string;
  sourceColumn: string;
  targetFieldType: "text_layer" | "email_to" | "email_subject" | "email_body" | "attachment_filename";
  targetFieldId: string;
  transformRule?: string;
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
