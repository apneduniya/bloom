"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { bloomsQueryKeys } from "@/features/blooms/constants/query-keys";
import { bloomsService } from "@/features/blooms/services/blooms-service";

export function useDeleteBloom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bloomId: string) => bloomsService.delete(bloomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bloomsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["bloom"] });
      queryClient.invalidateQueries({ queryKey: ["send-jobs"] });
    },
  });
}
