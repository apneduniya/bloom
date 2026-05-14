export const integrationsQueryKeys = {
  all: ["integration"] as const,
  byOwner: (ownerId: string) => [...integrationsQueryKeys.all, ownerId] as const,
};
