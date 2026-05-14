"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { User } from "@/features/auth/types";
import { bloomsQueryKeys } from "@/features/blooms/constants/query-keys";
import { bloomsService } from "@/features/blooms/services/blooms-service";

export function useCreateBloom(user: User | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { file: File; width: number; height: number }) => {
      if (!user) throw new Error("You must be signed in to create a Bloom.");
      return bloomsService.createFromTemplate(input.file, user, input.width, input.height);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bloomsQueryKeys.all });
    },
  });
}
