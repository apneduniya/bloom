"use client";

import { useQuery } from "@tanstack/react-query";

import { integrationsQueryKeys } from "@/features/integrations/constants/query-keys";
import { integrationsService } from "@/features/integrations/services/integrations-service";

export function useIntegration(ownerId: string | undefined) {
  return useQuery({
    queryKey: integrationsQueryKeys.byOwner(ownerId ?? "anonymous"),
    queryFn: () => (ownerId ? integrationsService.getByOwner(ownerId) : null),
    enabled: Boolean(ownerId),
  });
}
