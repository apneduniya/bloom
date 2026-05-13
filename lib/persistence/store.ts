"use client";

import type { Bloom, BloomSnapshot, DataSource, EmailDraft, SendJob, SendJobRow, TextLayer } from "@/lib/validation/types";

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-8)}`.slice(0, 36);
}

export function emptySnapshot(): BloomSnapshot {
  return { user: null, blooms: [], integrations: [], sendJobs: [] };
}

export function createDefaultLayer(bloomId: string, canvasWidth: number, canvasHeight: number): TextLayer {
  return {
    id: createId("layer"),
    bloomId,
    name: "Recipient name",
    content: "{{name}}",
    x: Math.round(canvasWidth * 0.2),
    y: Math.round(canvasHeight * 0.45),
    width: Math.round(canvasWidth * 0.6),
    height: Math.round(canvasHeight * 0.13),
    rotation: 0,
    fontFamily: "Georgia",
    fontSize: Math.max(28, Math.round(canvasWidth * 0.05)),
    fontWeight: "700",
    fontStyle: "normal",
    color: "#1f2937",
    opacity: 1,
    align: "center",
    lineHeight: 1.1,
    letterSpacing: 0,
    zIndex: 1,
    locked: false,
    visible: true,
    bindingKey: "name",
  };
}

export function createDataSource(bloomId: string, fileName: string, rows: Record<string, string>[], columns: string[]): DataSource {
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

export function createDefaultDraft(bloomId: string): EmailDraft {
  return {
    id: createId("draft"),
    bloomId,
    toFieldMapping: "{{email}}",
    cc: "",
    bcc: "",
    subject: "Your certificate from Bloom",
    body: "Hi {{name}},\n\nYour certificate is attached.\n\nCongratulations,\nBloom",
    attachmentFilename: "certificate-{{name}}",
    attachmentsEnabled: true,
  };
}

export function createSendJob(bloom: Bloom, fromIndex: number, toIndex: number) {
  const dataSource = bloom.dataSource;
  if (!dataSource) throw new Error("Upload a CSV before creating a send job.");
  const rows = dataSource.rows.slice(fromIndex, toIndex + 1);
  const now = new Date().toISOString();
  const jobId = createId("job");
  const jobRows: SendJobRow[] = rows.map((row, offset) => ({
    id: createId("jobrow"),
    jobId,
    rowIndex: fromIndex + offset,
    recipient: resolveRecipient(bloom.emailDraft.toFieldMapping, row),
    status: "pending",
  }));

  return {
    id: jobId,
    bloomId: bloom.id,
    dataSourceId: dataSource.id,
    type: "email",
    status: "queued",
    totalRows: jobRows.length,
    processedRows: 0,
    failedRows: 0,
    createdAt: now,
    rows: jobRows,
  } satisfies SendJob;
}

function resolveRecipient(mapping: string, row: Record<string, string>) {
  if (mapping.startsWith("{{") && mapping.endsWith("}}")) {
    return row[mapping.slice(2, -2).trim()] ?? "";
  }
  return mapping;
}
