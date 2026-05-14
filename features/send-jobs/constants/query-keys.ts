export const sendJobsQueryKeys = {
  all: ["send-jobs"] as const,
  byBloom: (ownerId: string, bloomId: string) => [...sendJobsQueryKeys.all, ownerId, bloomId] as const,
};
