import { appwriteConfig } from "@/lib/appwrite/config";

export const BLOOMS_DATABASE_ID = appwriteConfig.databaseId;
export const BLOOMS_TABLE_ID = appwriteConfig.tables.blooms;
export const TEXT_LAYERS_TABLE_ID = appwriteConfig.tables.textLayers;
export const DATA_SOURCES_TABLE_ID = appwriteConfig.tables.dataSources;
export const MAPPINGS_TABLE_ID = appwriteConfig.tables.mappings;
export const EMAIL_DRAFTS_TABLE_ID = appwriteConfig.tables.emailDrafts;

export const CERTIFICATES_BUCKET_ID = appwriteConfig.buckets.certificates;
export const DATA_SOURCES_BUCKET_ID = appwriteConfig.buckets.dataSources;
