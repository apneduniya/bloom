"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { integrationsQueryKeys } from "@/features/integrations/constants/query-keys";
import { integrationsService } from "@/features/integrations/services/integrations-service";
import type { Integration } from "@/features/integrations/types";

export function useTestIntegration(ownerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { integration: Integration; secret: string }) => {
      if (!ownerId) throw new Error("You must be signed in to test SMTP settings.");
      return integrationsService.testSmtp(input.integration, input.secret, ownerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationsQueryKeys.all });
    },
  });
}
