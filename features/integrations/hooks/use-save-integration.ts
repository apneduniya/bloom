"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { integrationsQueryKeys } from "@/features/integrations/constants/query-keys";
import { integrationsService } from "@/features/integrations/services/integrations-service";
import type { Integration } from "@/features/integrations/types";

export function useSaveIntegration(ownerId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (integration: Integration) => {
      if (!ownerId) throw new Error("You must be signed in to save SMTP settings.");
      return integrationsService.save(integration, ownerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationsQueryKeys.all });
    },
  });
}
