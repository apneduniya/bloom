"use client";

import { ID, OAuthProvider, type Account, type Models } from "appwrite";

import { account, client } from "@/lib/appwrite/client";
import { useSessionStore } from "@/features/auth/stores/session-store";
import type { User } from "@/features/auth/types";

/**
 * Browser session orchestration: magic-link, OAuth, current user, logout.
 */
export class AuthSessionService {
  private account: Account = account;

  async getCurrentUser(): Promise<User | null> {
    try {
      return this.toUser(await this.account.get());
    } catch {
      return null;
    }
  }

  async requestMagicLink(email: string, next = "/dashboard"): Promise<void> {
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    await this.account.createMagicURLToken(ID.unique(), email, callback.toString());
  }

  startGoogleOAuth(next = "/dashboard"): void {
    const success = new URL("/auth/callback", window.location.origin);
    success.searchParams.set("next", next);
    const failure = new URL("/login", window.location.origin);
    failure.searchParams.set("next", next);
    failure.searchParams.set("error", "oauth");
    this.account.createOAuth2Token(OAuthProvider.Google, success.toString(), failure.toString());
  }

  async completeSession(userId: string, secret: string): Promise<User | null> {
    const session = await this.account.createSession(userId, secret);
    useSessionStore.getState().setSessionId(session.$id);
    client.setSession(session.$id);
    return this.getCurrentUser();
  }

  async logout(): Promise<void> {
    try {
      await this.account.deleteSession("current");
    } finally {
      useSessionStore.getState().clear();
      client.setSession("");
    }
  }

  private toUser(user: Models.User<Models.Preferences>): User {
    return {
      id: user.$id,
      email: user.email,
      name: user.name || user.email.split("@")[0] || "Bloom User",
    };
  }
}

export const authSessionService = new AuthSessionService();
