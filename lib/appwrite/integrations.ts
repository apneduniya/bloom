"use client";

import { ID, Query, type Models } from "appwrite";
import { appwriteConfig } from "./config";
import { functions, tablesDB } from "./client";
import { toReadableAppwriteError } from "./errors";
import { ownerPermissions } from "./permissions";
import type { Integration, User } from "@/lib/validation/types";

type Row = Models.Row & Record<string, unknown>;

const db = appwriteConfig.databaseId;
const table = appwriteConfig.tables.integrations;

export async function getIntegration(user: User) {
  try {
    const result = await tablesDB.listRows<Row>({
      databaseId: db,
      tableId: table,
      queries: [Query.equal("ownerId", user.id), Query.limit(1)],
    });
    return result.rows[0] ? rowToIntegration(result.rows[0]) : null;
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not load SMTP integration");
  }
}

export async function saveIntegration(integration: Integration, ownerId: string) {
  const next: Integration = {
    ...integration,
    id: integration.id || ID.unique(),
    ownerId,
  };

  try {
    await tablesDB.upsertRow({
      databaseId: db,
      tableId: table,
      rowId: next.id,
      data: integrationToRow(next),
      permissions: ownerPermissions(ownerId),
    });
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not save SMTP integration");
  }

  return next;
}

export async function testSmtpIntegration(integration: Integration, secret: string, ownerId: string) {
  try {
    const execution = await functions.createExecution(
      appwriteConfig.functions.smtpTest,
      JSON.stringify({ integration, secret }),
      false,
    );
    const body = parseResponse(execution.responseBody);
    const next: Integration = {
      ...integration,
      ownerId,
      encryptedSecretRef: body.secretRef ?? integration.encryptedSecretRef ?? undefined,
      status: body.ok === false ? "error" : "verified",
      lastTestedAt: new Date().toISOString(),
      errorMessage: body.ok === false ? body.error ?? "SMTP test failed." : undefined,
    };
    await saveIntegration(next, ownerId);
    return next;
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not test SMTP integration");
  }
}

function integrationToRow(integration: Integration) {
  return {
    ownerId: integration.ownerId,
    providerType: integration.providerType,
    smtpHost: integration.smtpHost,
    smtpPort: integration.smtpPort,
    smtpUser: integration.smtpUser,
    fromName: integration.fromName,
    fromEmail: integration.fromEmail,
    ...(integration.encryptedSecretRef ? { encryptedSecretRef: integration.encryptedSecretRef } : { encryptedSecretRef: null }),
    status: integration.status,
    ...(integration.lastTestedAt ? { lastTestedAt: integration.lastTestedAt } : { lastTestedAt: null }),
    ...(integration.errorMessage ? { errorMessage: integration.errorMessage } : { errorMessage: null }),
  };
}

function rowToIntegration(row: Row): Integration {
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

function parseResponse(value: string) {
  if (!value) return {} as { ok?: boolean; secretRef?: string; error?: string };
  try {
    return JSON.parse(value) as { ok?: boolean; secretRef?: string; error?: string };
  } catch {
    return {} as { ok?: boolean; secretRef?: string; error?: string };
  }
}
