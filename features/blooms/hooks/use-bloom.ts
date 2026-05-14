"use client";

import { useQuery } from "@tanstack/react-query";

import { bloomsQueryKeys } from "@/features/blooms/constants/query-keys";
import { bloomsService } from "@/features/blooms/services/blooms-service";

export function useBloom(ownerId: string | undefined, bloomId: string | null) {
  return useQuery({
    queryKey: bloomsQueryKeys.detail(ownerId ?? "anonymous", bloomId ?? "missing"),
    queryFn: async () => {
      if (!ownerId || !bloomId) return null;
      const bloom = await bloomsService.get(bloomId);
      return bloom && bloom.ownerId === ownerId ? bloom : null;
    },
    enabled: Boolean(ownerId && bloomId),
  });
}
