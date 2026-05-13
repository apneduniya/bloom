"use client";

export const appwriteQueryKeys = {
  currentUser: () => ["current-user"] as const,
  blooms: (userId: string) => ["blooms", userId] as const,
  bloom: (userId: string, bloomId: string) => ["bloom", userId, bloomId] as const,
  integration: (userId: string) => ["integration", userId] as const,
  sendJobs: (userId: string, bloomId: string) => ["send-jobs", userId, bloomId] as const,
};
