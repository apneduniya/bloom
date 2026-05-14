"use client";

import { useQuery } from "@tanstack/react-query";

import { sendJobsQueryKeys } from "@/features/send-jobs/constants/query-keys";
import { sendJobsService } from "@/features/send-jobs/services/send-jobs-service";

export function useSendJobs(ownerId: string | undefined, bloomId: string | null) {
  return useQuery({
    queryKey: sendJobsQueryKeys.byBloom(ownerId ?? "anonymous", bloomId ?? "missing"),
    queryFn: () => (ownerId && bloomId ? sendJobsService.listForBloom(bloomId) : []),
    enabled: Boolean(ownerId && bloomId),
  });
}
