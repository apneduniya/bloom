"use client";

import { ID, OAuthProvider, type Models } from "appwrite";
import { account, client } from "./client";
import { clearStoredSessionId, storeSessionId } from "./session";
import type { User } from "@/lib/validation/types";

export function appwriteUserToUser(user: Models.User<Models.Preferences>): User {
  return {
    id: user.$id,
    email: user.email,
    name: user.name || user.email.split("@")[0] || "Bloom User",
  };
}

export async function getCurrentUser() {
  try {
    return appwriteUserToUser(await account.get());
  } catch {
    return null;
  }
}

export async function requestMagicLink(email: string, next = "/dashboard") {
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", next);
  await account.createMagicURLToken(ID.unique(), email, callback.toString());
}

export function startGoogleOAuth(next = "/dashboard") {
  const success = new URL("/auth/callback", window.location.origin);
  success.searchParams.set("next", next);
  const failure = new URL("/login", window.location.origin);
  failure.searchParams.set("next", next);
  failure.searchParams.set("error", "oauth");
  account.createOAuth2Token(OAuthProvider.Google, success.toString(), failure.toString());
}

export async function completeSession(userId: string, secret: string) {
  const session = await account.createSession(userId, secret);
  storeSessionId(session.$id);
  client.setSession(session.$id);
  return getCurrentUser();
}

export async function logout() {
  try {
    await account.deleteSession("current");
  } finally {
    clearStoredSessionId();
    client.setSession("");
  }
}
