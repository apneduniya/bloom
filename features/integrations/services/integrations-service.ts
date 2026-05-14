"use client";

import { ID, Query, type Models, type TablesDB } from "appwrite";

import { tablesDB } from "@/lib/appwrite/client";
import { toReadableAppwriteError } from "@/lib/appwrite/errors";
import { ownerPermissions } from "@/lib/appwrite/permissions";
import {
  INTEGRATIONS_DATABASE_ID,
  INTEGRATIONS_TABLE_ID,
} from "@/features/integrations/constants/appwrite-tables";
import type { Integration } from "@/features/integrations/types";

type Row = Models.Row & Record<string, unknown>;

type SmtpTestResponse = { ok?: boolean; secretRef?: string; error?: string };

export class IntegrationsService {
  private tablesDB: TablesDB = tablesDB;

  async getByOwner(ownerId: string): Promise<Integration | null> {
    try {
      const result = await this.tablesDB.listRows<Row>({
        databaseId: INTEGRATIONS_DATABASE_ID,
        tableId: INTEGRATIONS_TABLE_ID,
        queries: [Query.equal("ownerId", ownerId), Query.limit(1)],
      });
      return result.rows[0] ? this.rowToIntegration(result.rows[0]) : null;
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not load SMTP integration");
    }
  }

  async save(integration: Integration, ownerId: string): Promise<Integration> {
    const next: Integration = {
      ...integration,
      id: integration.id || ID.unique(),
      ownerId,
    };

    try {
      await this.tablesDB.upsertRow({
        databaseId: INTEGRATIONS_DATABASE_ID,
        tableId: INTEGRATIONS_TABLE_ID,
        rowId: next.id,
        data: this.integrationToRow(next),
        permissions: ownerPermissions(ownerId),
      });
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not save SMTP integration");
    }

    return next;
  }

  async testSmtp(integration: Integration, secret: string, ownerId: string): Promise<Integration> {
    try {
      const response = await fetch("/api/smtp-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ integration, secret }),
      });
      if (!response.ok) {
        throw new Error(`SMTP test request failed with status ${response.status}.`);
      }
      const body = (await response.json()) as SmtpTestResponse;

      const next: Integration = {
        ...integration,
        ownerId,
        encryptedSecretRef: body.secretRef ?? integration.encryptedSecretRef ?? undefined,
        status: body.ok === false ? "error" : "verified",
        lastTestedAt: new Date().toISOString(),
        errorMessage: body.ok === false ? body.error ?? "SMTP test failed." : undefined,
      };
      return await this.save(next, ownerId);
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not test SMTP integration");
    }
  }

  private integrationToRow(integration: Integration) {
    return {
      ownerId: integration.ownerId,
      providerType: integration.providerType,
      smtpHost: integration.smtpHost,
      smtpPort: integration.smtpPort,
      smtpUser: integration.smtpUser,
      fromName: integration.fromName,
      fromEmail: integration.fromEmail,
      encryptedSecretRef: integration.encryptedSecretRef ?? null,
      status: integration.status,
      lastTestedAt: integration.lastTestedAt ?? null,
      errorMessage: integration.errorMessage ?? null,
    };
  }

  private rowToIntegration(row: Row): Integration {
    return {
      id: row.$id,
      ownerId: String(row.ownerId),
      providerType: "smtp",
      smtpHost: String(row.smtpHost ?? ""),
      smtpPort: Number(row.smtpPort ?? 587),
      smtpUser: String(row.smtpUser ?? ""),
      fromName: String(row.fromName ?? "Bloom"),
      fromEmail: String(row.fromEmail ?? ""),
      encryptedSecretRef: row.encryptedSecretRef ? String(row.encryptedSecretRef) : undefined,
      status: (row.status as Integration["status"]) ?? "draft",
      lastTestedAt: row.lastTestedAt ? String(row.lastTestedAt) : undefined,
      errorMessage: row.errorMessage ? String(row.errorMessage) : undefined,
    };
  }
}

export const integrationsService = new IntegrationsService();
