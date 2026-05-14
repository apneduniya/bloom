export const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "",
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "",
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "bloom",
  buckets: {
    certificates: process.env.NEXT_PUBLIC_APPWRITE_CERTIFICATES_BUCKET_ID ?? "certificates",
    dataSources: process.env.NEXT_PUBLIC_APPWRITE_DATA_SOURCES_BUCKET_ID ?? "data_sources",
    exports: process.env.NEXT_PUBLIC_APPWRITE_EXPORTS_BUCKET_ID ?? "exports",
  },
  tables: {
    blooms: "blooms",
    textLayers: "text_layers",
    dataSources: "data_sources",
    mappings: "mappings",
    integrations: "integrations",
    emailDrafts: "email_drafts",
    sendJobs: "send_jobs",
    sendJobRows: "send_job_rows",
  },
};

export function hasAppwriteClientConfig() {
  return Boolean(appwriteConfig.endpoint && appwriteConfig.projectId);
}
