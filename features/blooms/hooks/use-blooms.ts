"use client";

import { useQuery } from "@tanstack/react-query";

import { bloomsQueryKeys } from "@/features/blooms/constants/query-keys";
import { bloomsService } from "@/features/blooms/services/blooms-service";

export function useBlooms(ownerId: string | undefined) {
  return useQuery({
    queryKey: bloomsQueryKeys.list(ownerId ?? "anonymous"),
    queryFn: () => (ownerId ? bloomsService.listForOwner(ownerId) : []),
    enabled: Boolean(ownerId),
  });
}
