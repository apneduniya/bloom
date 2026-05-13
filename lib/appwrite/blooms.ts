"use client";

import { AppwriteException, ID, Query, type Models } from "appwrite";
import { appwriteConfig } from "./config";
import { storage, tablesDB } from "./client";
import { toReadableAppwriteError } from "./errors";
import { ownerPermissions } from "./permissions";
import { listAllMatchingRows, syncRows, withTransaction } from "./tables";
import { getTemplateViewUrl } from "./files";
import type { Bloom, DataSource, EmailDraft, Mapping, TextLayer, User } from "@/lib/validation/types";
import { createDefaultDraft, createDefaultLayer } from "@/lib/persistence/store";

type Row = Models.Row & Record<string, unknown>;

const db = appwriteConfig.databaseId;
const tables = appwriteConfig.tables;

export async function listBlooms(user: User) {
  try {
    const result = await tablesDB.listRows<Row>({
      databaseId: db,
      tableId: tables.blooms,
      queries: [Query.equal("ownerId", user.id), Query.orderDesc("updatedAt"), Query.limit(100)],
    });
    return Promise.all(result.rows.map(rowToBloom));
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not load Blooms");
  }
}

export async function getBloom(id: string) {
  try {
    return rowToBloom(await tablesDB.getRow<Row>({ databaseId: db, tableId: tables.blooms, rowId: id }));
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 404) return null;
    throw toReadableAppwriteError(cause, "Could not load Bloom");
  }
}

export async function createBloomFromTemplate(file: File, user: User, width: number, height: number) {
  try {
    const uploaded = await storage.createFile(appwriteConfig.buckets.certificates, ID.unique(), file, ownerPermissions(user.id));
    const now = new Date().toISOString();
    const id = ID.unique();
    const title = file.name.replace(/\.png$/i, "").replace(/[-_]+/g, " ") || "Untitled certificate";
    const bloom: Bloom = {
      id,
      ownerId: user.id,
      title,
      description: "Certificate personalization campaign",
      templateImageFileId: uploaded.$id,
      templateImageDataUrl: getTemplateViewUrl(uploaded.$id),
      canvasWidth: width,
      canvasHeight: height,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      version: 1,
      layers: [createDefaultLayer(id, width, height)],
      mappings: [],
      emailDraft: createDefaultDraft(id),
    };

    try {
      return await saveBloom(bloom);
    } catch (cause) {
      await storage.deleteFile(appwriteConfig.buckets.certificates, uploaded.$id).catch(() => undefined);
      throw cause;
    }
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not create Bloom");
  }
}

export async function saveBloom(bloom: Bloom) {
  try {
    const now = new Date().toISOString();
    const saved: Bloom = {
      ...bloom,
      updatedAt: now,
      lastSavedAt: now,
      version: bloom.version + 1,
    };

    await withTransaction(async (transactionId) => {
      await tablesDB.upsertRow({
        databaseId: db,
        tableId: tables.blooms,
        rowId: saved.id,
        data: bloomToRow(saved),
        permissions: ownerPermissions(saved.ownerId),
        transactionId,
      });

      await syncRows(
        tables.textLayers,
        "bloomId",
        saved.id,
        saved.layers.map((layer) => ({ id: layer.id, data: layerToRow(layer) })),
        undefined,
        transactionId,
      );
      await syncRows(
        tables.mappings,
        "bloomId",
        saved.id,
        saved.mappings.map((mapping) => ({ id: mapping.id, data: mappingToRow(mapping) })),
        undefined,
        transactionId,
      );
      await syncRows(
        tables.dataSources,
        "bloomId",
        saved.id,
        saved.dataSource ? [{ id: saved.dataSource.id, data: dataSourceToRow(saved.dataSource) }] : [],
        undefined,
        transactionId,
      );
      await syncRows(
        tables.emailDrafts,
        "bloomId",
        saved.id,
        [{ id: saved.emailDraft.id, data: emailDraftToRow(saved.emailDraft) }],
        undefined,
        transactionId,
      );
    });

    return saved;
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not save Bloom");
  }
}

export async function deleteBloom(id: string) {
  try {
    const bloom = await getBloom(id);
    if (!bloom) return;

    await Promise.allSettled([
      syncRows(tables.textLayers, "bloomId", id, []),
      syncRows(tables.mappings, "bloomId", id, []),
      syncRows(tables.dataSources, "bloomId", id, []),
      syncRows(tables.emailDrafts, "bloomId", id, []),
      syncRows(tables.sendJobs, "bloomId", id, []),
      syncRows(tables.sendJobRows, "bloomId", id, []),
      tablesDB.deleteRow({ databaseId: db, tableId: tables.blooms, rowId: id }),
      storage.deleteFile(appwriteConfig.buckets.certificates, bloom.templateImageFileId),
    ]);
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not delete Bloom");
  }
}

export async function saveBloomDataSource(bloom: Bloom, dataSource: DataSource, csvFile: File) {
  try {
    const uploaded = await storage.createFile(appwriteConfig.buckets.dataSources, ID.unique(), csvFile, ownerPermissions(bloom.ownerId));
    const next: DataSource = { ...dataSource, fileId: uploaded.$id };

    try {
      return await saveBloom({ ...bloom, dataSource: next });
    } catch (cause) {
      await storage.deleteFile(appwriteConfig.buckets.dataSources, uploaded.$id).catch(() => undefined);
      throw cause;
    }
  } catch (cause) {
    throw toReadableAppwriteError(cause, "Could not save Bloom data source");
  }
}

async function rowToBloom(row: Row): Promise<Bloom> {
  const bloomId = String(row.$id);
  const [layers, mappings, dataSources, drafts] = await Promise.all([
    listAllMatchingRows(tables.textLayers, "bloomId", bloomId),
    listAllMatchingRows(tables.mappings, "bloomId", bloomId),
    listAllMatchingRows(tables.dataSources, "bloomId", bloomId),
    listAllMatchingRows(tables.emailDrafts, "bloomId", bloomId),
  ]);

  const templateImageFileId = String(row.templateImageFileId);

  return {
    id: bloomId,
    ownerId: String(row.ownerId),
    title: String(row.title ?? "Untitled certificate"),
    description: String(row.description ?? ""),
    templateImageFileId,
    templateImageDataUrl: String(row.templateImageDataUrl ?? getTemplateViewUrl(templateImageFileId)),
    canvasWidth: Number(row.canvasWidth ?? 1200),
    canvasHeight: Number(row.canvasHeight ?? 800),
    status: (row.status as Bloom["status"]) ?? "draft",
    createdAt: String(row.createdAt ?? row.$createdAt),
    updatedAt: String(row.updatedAt ?? row.$updatedAt),
    lastSavedAt: String(row.lastSavedAt ?? row.$updatedAt),
    version: Number(row.version ?? 1),
    layers: layers.map(rowToLayer).sort((a, b) => a.zIndex - b.zIndex),
    dataSource: dataSources[0] ? rowToDataSource(dataSources[0]) : undefined,
    mappings: mappings.map(rowToMapping),
    emailDraft: drafts[0] ? rowToEmailDraft(drafts[0]) : createDefaultDraft(bloomId),
  };
}

function bloomToRow(bloom: Bloom) {
  return {
    ownerId: bloom.ownerId,
    title: bloom.title,
    description: bloom.description,
    templateImageFileId: bloom.templateImageFileId,
    templateImageDataUrl: bloom.templateImageDataUrl,
    canvasWidth: bloom.canvasWidth,
    canvasHeight: bloom.canvasHeight,
    status: bloom.status,
    createdAt: bloom.createdAt,
    updatedAt: bloom.updatedAt,
    lastSavedAt: bloom.lastSavedAt,
    version: bloom.version,
  };
}

function layerToRow(layer: TextLayer) {
  return {
    bloomId: layer.bloomId,
    name: layer.name,
    content: layer.content,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle,
    color: layer.color,
    opacity: layer.opacity,
    align: layer.align,
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing,
    zIndex: layer.zIndex,
    locked: layer.locked,
    visible: layer.visible,
    ...(layer.bindingKey ? { bindingKey: layer.bindingKey } : { bindingKey: null }),
  };
}

function mappingToRow(mapping: Mapping) {
  return {
    bloomId: mapping.bloomId,
    sourceColumn: mapping.sourceColumn,
    targetFieldType: mapping.targetFieldType,
    targetFieldId: mapping.targetFieldId,
    ...(mapping.transformRule ? { transformRule: mapping.transformRule } : { transformRule: null }),
  };
}

function dataSourceToRow(dataSource: DataSource) {
  return {
    bloomId: dataSource.bloomId,
    fileType: dataSource.fileType,
    fileName: dataSource.fileName,
    ...(dataSource.fileId ? { fileId: dataSource.fileId } : { fileId: null }),
    columnNames: JSON.stringify(dataSource.columnNames),
    rowCount: dataSource.rowCount,
    rows: JSON.stringify(dataSource.rows),
    previewRows: JSON.stringify(dataSource.previewRows),
    uploadedAt: dataSource.uploadedAt,
  };
}

function emailDraftToRow(draft: EmailDraft) {
  return {
    bloomId: draft.bloomId,
    toFieldMapping: draft.toFieldMapping,
    cc: draft.cc,
    bcc: draft.bcc,
    subject: draft.subject,
    body: draft.body,
    attachmentFilename: draft.attachmentFilename,
    attachmentsEnabled: draft.attachmentsEnabled,
  };
}

function rowToLayer(row: Row): TextLayer {
  return {
    id: row.$id,
    bloomId: String(row.bloomId),
    name: String(row.name),
    content: String(row.content),
    x: Number(row.x),
    y: Number(row.y),
    width: Number(row.width),
    height: Number(row.height),
    rotation: Number(row.rotation),
    fontFamily: String(row.fontFamily),
    fontSize: Number(row.fontSize),
    fontWeight: row.fontWeight as TextLayer["fontWeight"],
    fontStyle: row.fontStyle as TextLayer["fontStyle"],
    color: String(row.color),
    opacity: Number(row.opacity),
    align: row.align as TextLayer["align"],
    lineHeight: Number(row.lineHeight),
    letterSpacing: Number(row.letterSpacing),
    zIndex: Number(row.zIndex),
    locked: Boolean(row.locked),
    visible: Boolean(row.visible),
    bindingKey: row.bindingKey ? String(row.bindingKey) : undefined,
  };
}

function rowToMapping(row: Row): Mapping {
  return {
    id: row.$id,
    bloomId: String(row.bloomId),
    sourceColumn: String(row.sourceColumn),
    targetFieldType: row.targetFieldType as Mapping["targetFieldType"],
    targetFieldId: String(row.targetFieldId),
    transformRule: row.transformRule ? String(row.transformRule) : undefined,
  };
}

function rowToDataSource(row: Row): DataSource {
  return {
    id: row.$id,
    bloomId: String(row.bloomId),
    fileType: "csv",
    fileId: row.fileId ? String(row.fileId) : undefined,
    fileName: String(row.fileName),
    columnNames: parseJson<string[]>(row.columnNames, []),
    rowCount: Number(row.rowCount),
    rows: parseJson<Record<string, string>[]>(row.rows, []),
    previewRows: parseJson<Record<string, string>[]>(row.previewRows, []),
    uploadedAt: String(row.uploadedAt),
  };
}

function rowToEmailDraft(row: Row): EmailDraft {
  return {
    id: row.$id,
    bloomId: String(row.bloomId),
    toFieldMapping: String(row.toFieldMapping),
    cc: String(row.cc ?? ""),
    bcc: String(row.bcc ?? ""),
    subject: String(row.subject),
    body: String(row.body),
    attachmentFilename: String(row.attachmentFilename),
    attachmentsEnabled: Boolean(row.attachmentsEnabled),
  };
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
