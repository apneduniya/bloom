import { appwriteConfig } from "@/lib/appwrite/config";

export const SEND_JOBS_DATABASE_ID = appwriteConfig.databaseId;
export const SEND_JOBS_TABLE_ID = appwriteConfig.tables.sendJobs;
export const SEND_JOB_ROWS_TABLE_ID = appwriteConfig.tables.sendJobRows;
