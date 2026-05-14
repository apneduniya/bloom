import { Client, Messaging, Storage, TablesDB, Users } from "node-appwrite";

/** Server-only — API key (admin SDK for Route Handlers). */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    get messaging() {
      return new Messaging(client);
    },
    get users() {
      return new Users(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
    get storage() {
      return new Storage(client);
    },
  };
}
