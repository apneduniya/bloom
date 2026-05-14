"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { User } from "@/features/auth/types";
import type { Bloom } from "@/features/blooms/types";
import type { Integration } from "@/features/integrations/types";
import { sendJobsQueryKeys } from "@/features/send-jobs/constants/query-keys";
import { sendJobsService } from "@/features/send-jobs/services/send-jobs-service";

export function useCreateSendJob(user: User | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { bloom: Bloom; integration: Integration; fromIndex: number; toIndex: number }) => {
      if (!user) throw new Error("You must be signed in to create a send job.");
      return sendJobsService.create(input.bloom, input.integration, input.fromIndex, input.toIndex, user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sendJobsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["bloom"] });
      queryClient.invalidateQueries({ queryKey: ["blooms"] });
    },
  });
}
