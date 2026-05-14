"use client";

import { AppwriteException, ID, Query, type Models, type TablesDB } from "appwrite";

import { tablesDB } from "@/lib/appwrite/client";
import { toReadableAppwriteError } from "@/lib/appwrite/errors";
import { ownerPermissions } from "@/lib/appwrite/permissions";
import { listAllMatchingRows, syncRows, withTransaction } from "@/lib/appwrite/tables";
import type { User } from "@/features/auth/types";
import {
  BLOOMS_DATABASE_ID,
  BLOOMS_TABLE_ID,
  DATA_SOURCES_TABLE_ID,
  EMAIL_DRAFTS_TABLE_ID,
  MAPPINGS_TABLE_ID,
  TEXT_LAYERS_TABLE_ID,
} from "@/features/blooms/constants/appwrite-tables";
import { createDefaultDraft, createDefaultLayer } from "@/features/blooms/services/bloom-factory";
import { filesService } from "@/features/blooms/services/files-service";
import type { Bloom, EmailDraft, Mapping, TextLayer } from "@/features/blooms/types";
import type { DataSource } from "@/features/data-sources/types";
import { sendJobsService } from "@/features/send-jobs/services/send-jobs-service";

type Row = Models.Row & Record<string, unknown>;

export class BloomsService {
  private tablesDB: TablesDB = tablesDB;

  async listForOwner(ownerId: string): Promise<Bloom[]> {
    try {
      const result = await this.tablesDB.listRows<Row>({
        databaseId: BLOOMS_DATABASE_ID,
        tableId: BLOOMS_TABLE_ID,
        queries: [Query.equal("ownerId", ownerId), Query.orderDesc("updatedAt"), Query.limit(100)],
      });
      return Promise.all(result.rows.map((row) => this.rowToBloom(row)));
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not load Blooms");
    }
  }

  async get(id: string): Promise<Bloom | null> {
    try {
      return await this.rowToBloom(
        await this.tablesDB.getRow<Row>({ databaseId: BLOOMS_DATABASE_ID, tableId: BLOOMS_TABLE_ID, rowId: id }),
      );
    } catch (cause) {
      if (cause instanceof AppwriteException && cause.code === 404) return null;
      throw toReadableAppwriteError(cause, "Could not load Bloom");
    }
  }

  async createFromTemplate(file: File, user: User, width: number, height: number): Promise<Bloom> {
    try {
      const uploaded = await filesService.uploadTemplatePng(file, user.id);
      const now = new Date().toISOString();
      const id = ID.unique();
      const title = file.name.replace(/\.png$/i, "").replace(/[-_]+/g, " ") || "Untitled certificate";
      const bloom: Bloom = {
        id,
        ownerId: user.id,
        title,
        description: "Certificate personalization campaign",
        templateImageFileId: uploaded.$id,
        templateImageDataUrl: filesService.getTemplateViewUrl(uploaded.$id),
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
        return await this.save(bloom);
      } catch (cause) {
        await filesService.deleteTemplate(uploaded.$id).catch(() => undefined);
        throw cause;
      }
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not create Bloom");
    }
  }

  async save(bloom: Bloom): Promise<Bloom> {
    try {
      const now = new Date().toISOString();
      const saved: Bloom = {
        ...bloom,
        updatedAt: now,
        lastSavedAt: now,
        version: bloom.version + 1,
      };

      await withTransaction(async (transactionId) => {
        await this.tablesDB.upsertRow({
          databaseId: BLOOMS_DATABASE_ID,
          tableId: BLOOMS_TABLE_ID,
          rowId: saved.id,
          data: this.bloomToRow(saved),
          permissions: ownerPermissions(saved.ownerId),
          transactionId,
        });

        await syncRows(
          TEXT_LAYERS_TABLE_ID,
          "bloomId",
          saved.id,
          saved.layers.map((layer) => ({ id: layer.id, data: this.layerToRow(layer) })),
          undefined,
          transactionId,
        );
        await syncRows(
          MAPPINGS_TABLE_ID,
          "bloomId",
          saved.id,
          saved.mappings.map((mapping) => ({ id: mapping.id, data: this.mappingToRow(mapping) })),
          undefined,
          transactionId,
        );
        await syncRows(
          DATA_SOURCES_TABLE_ID,
          "bloomId",
          saved.id,
          saved.dataSource ? [{ id: saved.dataSource.id, data: this.dataSourceToRow(saved.dataSource) }] : [],
          undefined,
          transactionId,
        );
        await syncRows(
          EMAIL_DRAFTS_TABLE_ID,
          "bloomId",
          saved.id,
          [{ id: saved.emailDraft.id, data: this.emailDraftToRow(saved.emailDraft) }],
          undefined,
          transactionId,
        );
      });

      return saved;
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not save Bloom");
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const bloom = await this.get(id);
      if (!bloom) return;

      await Promise.allSettled([
        syncRows(TEXT_LAYERS_TABLE_ID, "bloomId", id, []),
        syncRows(MAPPINGS_TABLE_ID, "bloomId", id, []),
        syncRows(DATA_SOURCES_TABLE_ID, "bloomId", id, []),
        syncRows(EMAIL_DRAFTS_TABLE_ID, "bloomId", id, []),
        sendJobsService.deleteForBloom(id),
        this.tablesDB.deleteRow({ databaseId: BLOOMS_DATABASE_ID, tableId: BLOOMS_TABLE_ID, rowId: id }),
        filesService.deleteTemplate(bloom.templateImageFileId),
      ]);
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not delete Bloom");
    }
  }

  async saveDataSource(bloom: Bloom, dataSource: DataSource, csvFile: File): Promise<Bloom> {
    try {
      const uploaded = await filesService.uploadCsv(csvFile, bloom.ownerId);
      const next: DataSource = { ...dataSource, fileId: uploaded.$id };

      try {
        return await this.save({ ...bloom, dataSource: next });
      } catch (cause) {
        await filesService.deleteCsv(uploaded.$id).catch(() => undefined);
        throw cause;
      }
    } catch (cause) {
      throw toReadableAppwriteError(cause, "Could not save Bloom data source");
    }
  }

  private async rowToBloom(row: Row): Promise<Bloom> {
    const bloomId = String(row.$id);
    const [layers, mappings, dataSources, drafts] = await Promise.all([
      listAllMatchingRows(TEXT_LAYERS_TABLE_ID, "bloomId", bloomId),
      listAllMatchingRows(MAPPINGS_TABLE_ID, "bloomId", bloomId),
      listAllMatchingRows(DATA_SOURCES_TABLE_ID, "bloomId", bloomId),
      listAllMatchingRows(EMAIL_DRAFTS_TABLE_ID, "bloomId", bloomId),
    ]);

    const templateImageFileId = String(row.templateImageFileId);

    return {
      id: bloomId,
      ownerId: String(row.ownerId),
      title: String(row.title ?? "Untitled certificate"),
      description: String(row.description ?? ""),
      templateImageFileId,
      templateImageDataUrl: String(row.templateImageDataUrl ?? filesService.getTemplateViewUrl(templateImageFileId)),
      canvasWidth: Number(row.canvasWidth ?? 1200),
      canvasHeight: Number(row.canvasHeight ?? 800),
      status: (row.status as Bloom["status"]) ?? "draft",
      createdAt: String(row.createdAt ?? row.$createdAt),
      updatedAt: String(row.updatedAt ?? row.$updatedAt),
      lastSavedAt: String(row.lastSavedAt ?? row.$updatedAt),
      version: Number(row.version ?? 1),
      layers: layers.map((r) => this.rowToLayer(r)).sort((a, b) => a.zIndex - b.zIndex),
      dataSource: dataSources[0] ? this.rowToDataSource(dataSources[0]) : undefined,
      mappings: mappings.map((r) => this.rowToMapping(r)),
      emailDraft: drafts[0] ? this.rowToEmailDraft(drafts[0]) : createDefaultDraft(bloomId),
    };
  }

  private bloomToRow(bloom: Bloom) {
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

  private layerToRow(layer: TextLayer) {
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
      bindingKey: layer.bindingKey ?? null,
    };
  }

  private mappingToRow(mapping: Mapping) {
    return {
      bloomId: mapping.bloomId,
      sourceColumn: mapping.sourceColumn,
      targetFieldType: mapping.targetFieldType,
      targetFieldId: mapping.targetFieldId,
      transformRule: mapping.transformRule ?? null,
    };
  }

  private dataSourceToRow(dataSource: DataSource) {
    return {
      bloomId: dataSource.bloomId,
      fileType: dataSource.fileType,
      fileName: dataSource.fileName,
      fileId: dataSource.fileId ?? null,
      columnNames: JSON.stringify(dataSource.columnNames),
      rowCount: dataSource.rowCount,
      rows: JSON.stringify(dataSource.rows),
      previewRows: JSON.stringify(dataSource.previewRows),
      uploadedAt: dataSource.uploadedAt,
    };
  }

  private emailDraftToRow(draft: EmailDraft) {
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

  private rowToLayer(row: Row): TextLayer {
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

  private rowToMapping(row: Row): Mapping {
    return {
      id: row.$id,
      bloomId: String(row.bloomId),
      sourceColumn: String(row.sourceColumn),
      targetFieldType: row.targetFieldType as Mapping["targetFieldType"],
      targetFieldId: String(row.targetFieldId),
      transformRule: row.transformRule ? String(row.transformRule) : undefined,
    };
  }

  private rowToDataSource(row: Row): DataSource {
    return {
      id: row.$id,
      bloomId: String(row.bloomId),
      fileType: "csv",
      fileId: row.fileId ? String(row.fileId) : undefined,
      fileName: String(row.fileName),
      columnNames: this.parseJson<string[]>(row.columnNames, []),
      rowCount: Number(row.rowCount),
      rows: this.parseJson<Record<string, string>[]>(row.rows, []),
      previewRows: this.parseJson<Record<string, string>[]>(row.previewRows, []),
      uploadedAt: String(row.uploadedAt),
    };
  }

  private rowToEmailDraft(row: Row): EmailDraft {
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

  private parseJson<T>(value: unknown, fallback: T): T {
    if (typeof value !== "string") return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
}

export const bloomsService = new BloomsService();
