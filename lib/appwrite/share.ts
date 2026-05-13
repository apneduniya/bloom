"use client";

import { ID, Query, type Models } from "appwrite";
import { appwriteConfig } from "./config";
import { functions, tablesDB } from "./client";
import { toReadableAppwriteError } from "./errors";
import { ownerPermissions } from "./permissions";
import { listAllMatchingRows, syncRows, withTransaction } from "./tables";
import type { Bloom, Integration, SendJob, SendJobRow, User } from "@/lib/validation/types";

type Row = Models.Row & Record<string, unknown>;

const db = appwriteConfig.databaseId;
const tables = appwriteConfig.tables;

export async function createCloudSendJob(bloom: Bloom, integration: Integration, fromIndex: number, toIndex: number, user: User) {
  try {
    const execution = await functions.createExecution(
      appwriteConfig.functions.sendQueue,
      JSON.stringify({ bloomId: bloom.id, integrationId: integration.id, fromIndex, toIndex }),
      false,
    );
    const response = parseResponse(execution.responseBody);
    const now = new Date().toISOString();
    const rows = (bloom.dataSource?.rows ?? []).slice(fromIndex, toIndex + 1);
    const jobId = response.jobId ?? ID.unique();
    const job: SendJob = {
      id: jobId,
      bloomId: bloom.id,
      dataSourceId: bloom.dataSource?.id ?? "",
      type: "email",
      status: response.status ?? "queued",
      totalRows: response.totalRows ?? rows.length,
      processedRows: response.processedRows ?? 0,
      failedRows: response.failedRows ?? 0,
      createdAt: now,
      rows: rows.map((row, offset) => ({
        id: ID.unique(),
        jobId,
        rowIndex: fromIndex + offset,
        recipient: resolveRecipient(bloom.emailDraft.toFieldMapping, row),
        status: "pending",
      })),
    };
    await saveSendJob(job, user.id);
    return job;
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not create send job");
  }
}

export async function listSendJobs(bloomId: string) {
  try {
    const jobs = await tablesDB.listRows<Row>({
      databaseId: db,
      tableId: tables.sendJobs,
      queries: [Query.equal("bloomId", bloomId), Query.orderDesc("createdAt"), Query.limit(50)],
    });
    const rows = await listAllMatchingRows(tables.sendJobRows, "bloomId", bloomId);
    return jobs.rows.map((job) => rowToJob(job, rows.filter((row) => row.jobId === job.$id)));
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not load send jobs");
  }
}

export async function saveSendJob(job: SendJob, ownerId: string) {
  try {
    await withTransaction(async (transactionId) => {
      await tablesDB.upsertRow({
        databaseId: db,
        tableId: tables.sendJobs,
        rowId: job.id,
        data: sendJobToRow(job, ownerId),
        permissions: ownerPermissions(ownerId),
        transactionId,
      });

      await syncRows(
        tables.sendJobRows,
        "jobId",
        job.id,
        job.rows.map((row) => ({ id: row.id, data: sendJobRowToRow(row, job.bloomId, ownerId) })),
        ownerPermissions(ownerId),
        transactionId,
      );
    });
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not save send job");
  }
}

function sendJobToRow(job: SendJob, ownerId: string) {
  return {
    ownerId,
    bloomId: job.bloomId,
    dataSourceId: job.dataSourceId,
    type: job.type,
    status: job.status,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    failedRows: job.failedRows,
    createdAt: job.createdAt,
    ...(job.completedAt ? { completedAt: job.completedAt } : { completedAt: null }),
  };
}

function sendJobRowToRow(row: SendJobRow, bloomId: string, ownerId: string) {
  return {
    ownerId,
    jobId: row.jobId,
    bloomId,
    rowIndex: row.rowIndex,
    recipient: row.recipient,
    status: row.status,
    ...(row.errorMessage ? { errorMessage: row.errorMessage } : { errorMessage: null }),
    ...(row.attachmentFileId ? { attachmentFileId: row.attachmentFileId } : { attachmentFileId: null }),
    ...(row.sentAt ? { sentAt: row.sentAt } : { sentAt: null }),
  };
}

function rowToJob(row: Row, rows: Row[]): SendJob {
  return {
    id: row.$id,
    bloomId: String(row.bloomId),
    dataSourceId: String(row.dataSourceId),
    type: "email",
    status: row.status as SendJob["status"],
    totalRows: Number(row.totalRows),
    processedRows: Number(row.processedRows),
    failedRows: Number(row.failedRows),
    createdAt: String(row.createdAt),
    completedAt: row.completedAt ? String(row.completedAt) : undefined,
    rows: rows.map(rowToSendRow).sort((a, b) => a.rowIndex - b.rowIndex),
  };
}

function rowToSendRow(row: Row): SendJobRow {
  return {
    id: row.$id,
    jobId: String(row.jobId),
    rowIndex: Number(row.rowIndex),
    recipient: String(row.recipient ?? ""),
    status: row.status as SendJobRow["status"],
    errorMessage: row.errorMessage ? String(row.errorMessage) : undefined,
    attachmentFileId: row.attachmentFileId ? String(row.attachmentFileId) : undefined,
    sentAt: row.sentAt ? String(row.sentAt) : undefined,
  };
}

function resolveRecipient(mapping: string, row: Record<string, string>) {
  if (mapping.startsWith("{{") && mapping.endsWith("}}")) {
    return row[mapping.slice(2, -2).trim()] ?? "";
  }
  return mapping;
}

function parseResponse(value: string): Partial<SendJob> & { jobId?: string } {
  if (!value) return {} as Partial<SendJob>;
  try {
    return JSON.parse(value) as Partial<SendJob> & { jobId?: string };
  } catch {
    return {} as Partial<SendJob> & { jobId?: string };
  }
}
