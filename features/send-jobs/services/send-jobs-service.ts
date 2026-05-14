"use client";

import { ID, Query, type Models, type TablesDB } from "appwrite";

import { tablesDB } from "@/lib/appwrite/client";
import { toReadableAppwriteError } from "@/lib/appwrite/errors";
import { ownerPermissions } from "@/lib/appwrite/permissions";
import { listAllMatchingRows, syncRows, withTransaction } from "@/lib/appwrite/tables";
import type { User } from "@/features/auth/types";
import type { Bloom } from "@/features/blooms/types";
import {
  SEND_JOBS_DATABASE_ID,
  SEND_JOBS_TABLE_ID,
  SEND_JOB_ROWS_TABLE_ID,
} from "@/features/send-jobs/constants/appwrite-tables";
import type { SendJob, SendJobRow } from "@/features/send-jobs/types";
import type { Integration } from "@/features/integrations/types";

type Row = Models.Row & Record<string, unknown>;

type SendQueueResponse = {
  jobId?: string;
  status?: SendJob["status"];
  totalRows?: number;
  processedRows?: number;
  failedRows?: number;
};

export class SendJobsService {
  private tablesDB: TablesDB = tablesDB;

  async listForBloom(bloomId: string): Promise<SendJob[]> {
    try {
      const jobs = await this.tablesDB.listRows<Row>({
        databaseId: SEND_JOBS_DATABASE_ID,
        tableId: SEND_JOBS_TABLE_ID,
        queries: [Query.equal("bloomId", bloomId), Query.orderDesc("createdAt"), Query.limit(50)],
      });
      const rows = await listAllMatchingRows(SEND_JOB_ROWS_TABLE_ID, "bloomId", bloomId);
      return jobs.rows.map((job) => this.rowToJob(job, rows.filter((row) => row.jobId === job.$id)));
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not load send jobs");
    }
  }

  async create(
    bloom: Bloom,
    integration: Integration,
    fromIndex: number,
    toIndex: number,
    user: User,
  ): Promise<SendJob> {
    try {
      const httpResponse = await fetch("/api/send-queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bloomId: bloom.id,
          integrationId: integration.id,
          fromIndex,
          toIndex,
        }),
      });
      if (!httpResponse.ok) {
        throw new Error(`Send queue request failed with status ${httpResponse.status}.`);
      }
      const response = (await httpResponse.json()) as SendQueueResponse;

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
          recipient: this.resolveRecipient(bloom.emailDraft.toFieldMapping, row),
          status: "pending",
        })),
      };
      await this.save(job, user.id);
      return job;
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not create send job");
    }
  }

  async save(job: SendJob, ownerId: string): Promise<void> {
    try {
      await withTransaction(async (transactionId) => {
        await this.tablesDB.upsertRow({
          databaseId: SEND_JOBS_DATABASE_ID,
          tableId: SEND_JOBS_TABLE_ID,
          rowId: job.id,
          data: this.sendJobToRow(job, ownerId),
          permissions: ownerPermissions(ownerId),
          transactionId,
        });

        await syncRows(
          SEND_JOB_ROWS_TABLE_ID,
          "jobId",
          job.id,
          job.rows.map((row) => ({ id: row.id, data: this.sendJobRowToRow(row, job.bloomId, ownerId) })),
          ownerPermissions(ownerId),
          transactionId,
        );
      });
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not save send job");
    }
  }

  async deleteForBloom(bloomId: string): Promise<void> {
    await Promise.allSettled([
      syncRows(SEND_JOBS_TABLE_ID, "bloomId", bloomId, []),
      syncRows(SEND_JOB_ROWS_TABLE_ID, "bloomId", bloomId, []),
    ]);
  }

  private sendJobToRow(job: SendJob, ownerId: string) {
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
      completedAt: job.completedAt ?? null,
    };
  }

  private sendJobRowToRow(row: SendJobRow, bloomId: string, ownerId: string) {
    return {
      ownerId,
      jobId: row.jobId,
      bloomId,
      rowIndex: row.rowIndex,
      recipient: row.recipient,
      status: row.status,
      errorMessage: row.errorMessage ?? null,
      attachmentFileId: row.attachmentFileId ?? null,
      sentAt: row.sentAt ?? null,
    };
  }

  private rowToJob(row: Row, rows: Row[]): SendJob {
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
      rows: rows.map((r) => this.rowToSendRow(r)).sort((a, b) => a.rowIndex - b.rowIndex),
    };
  }

  private rowToSendRow(row: Row): SendJobRow {
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

  private resolveRecipient(mapping: string, row: Record<string, string>): string {
    if (mapping.startsWith("{{") && mapping.endsWith("}}")) {
      return row[mapping.slice(2, -2).trim()] ?? "";
    }
    return mapping;
  }
}

export const sendJobsService = new SendJobsService();
