"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { bloomsQueryKeys } from "@/features/blooms/constants/query-keys";
import { bloomsService } from "@/features/blooms/services/blooms-service";
import type { Bloom } from "@/features/blooms/types";
import type { DataSource } from "@/features/data-sources/types";

export function useSaveDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { bloom: Bloom; dataSource: DataSource; file: File }) =>
      bloomsService.saveDataSource(input.bloom, input.dataSource, input.file),
    onSuccess: (saved) => {
      queryClient.setQueryData(bloomsQueryKeys.detail(saved.ownerId, saved.id), saved);
      queryClient.invalidateQueries({ queryKey: bloomsQueryKeys.all });
    },
  });
}
