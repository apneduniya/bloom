"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { bloomsQueryKeys } from "@/features/blooms/constants/query-keys";
import { bloomsService } from "@/features/blooms/services/blooms-service";
import type { Bloom } from "@/features/blooms/types";

export function useSaveBloom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bloom: Bloom) => bloomsService.save(bloom),
    onSuccess: (saved) => {
      queryClient.setQueryData(bloomsQueryKeys.detail(saved.ownerId, saved.id), saved);
      queryClient.invalidateQueries({ queryKey: bloomsQueryKeys.all });
    },
  });
}
