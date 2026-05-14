export const bloomsQueryKeys = {
  all: ["blooms"] as const,
  list: (ownerId: string) => [...bloomsQueryKeys.all, ownerId] as const,
  detail: (ownerId: string, bloomId: string) => ["bloom", ownerId, bloomId] as const,
};
