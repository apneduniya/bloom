"use client";

import { Query, type Models } from "appwrite";
import { appwriteConfig } from "./config";
import { tablesDB } from "./client";

const db = appwriteConfig.databaseId;

type RowRecord = {
  id: string;
  data: Record<string, unknown>;
};

export async function withTransaction<T>(work: (transactionId: string) => Promise<T>, ttl = 300) {
  const transaction = await tablesDB.createTransaction({ ttl });

  try {
    const result = await work(transaction.$id);
    await tablesDB.updateTransaction({ transactionId: transaction.$id, commit: true });
    return result;
  } catch (cause) {
    await tablesDB.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    throw cause;
  }
}

export async function listAllMatchingRows(tableId: string, filterKey: string, filterValue: string, transactionId?: string) {
  const rows: Array<Models.Row & Record<string, unknown>> = [];
  let cursor: string | undefined;

  while (true) {
    const queries = [Query.equal(filterKey, filterValue), Query.orderAsc("$createdAt"), Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const result = await tablesDB.listRows({
      databaseId: db,
      tableId,
      queries,
      ...(transactionId ? { transactionId } : {}),
    });

    rows.push(...result.rows);
    if (result.rows.length < 100) break;
    cursor = result.rows[result.rows.length - 1]?.$id;
    if (!cursor) break;
  }

  return rows;
}

export async function syncRows(
  tableId: string,
  filterKey: string,
  filterValue: string,
  records: RowRecord[],
  permissions?: string[],
  transactionId?: string,
) {
  const existingRows = await listAllMatchingRows(tableId, filterKey, filterValue, transactionId);
  const nextIds = new Set(records.map((record) => record.id));

  for (const row of existingRows) {
    if (!nextIds.has(row.$id)) {
      await tablesDB.deleteRow({
        databaseId: db,
        tableId,
        rowId: row.$id,
        ...(transactionId ? { transactionId } : {}),
      });
    }
  }

  for (const record of records) {
    await tablesDB.upsertRow({
      databaseId: db,
      tableId,
      rowId: record.id,
      data: record.data,
      ...(permissions ? { permissions } : {}),
      ...(transactionId ? { transactionId } : {}),
    });
  }
}
