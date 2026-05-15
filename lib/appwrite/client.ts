import { Account, Client, Storage, TablesDB } from "appwrite";
import { appwriteConfig } from "./config";
import { useSessionStore } from "@/features/auth/stores/session-store";

export const client = new Client();

if (appwriteConfig.endpoint && appwriteConfig.projectId) {
  client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId);
}

const sessionId = useSessionStore.getState().sessionId;
if (sessionId) {
  client.setSession(sessionId);
}

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
